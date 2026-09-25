import assert from "node:assert/strict";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import * as THREE from "three";
import { createServer } from "vite";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

export async function runRenderingCullingTests() {
  // Load the real TS engine without creating a browser, WebGL context or RAF.
  const server = await createServer({
    configFile: false,
    root: ROOT,
    appType: "custom",
    logLevel: "error",
    server: { middlewareMode: true, hmr: false, watch: null },
    optimizeDeps: { noDiscovery: true, include: [] },
  });
  let passed = 0;
  const test = (name, fn) => {
    fn();
    passed++;
    console.log(`[render-test] PASS ${name}`);
  };
  try {
    const { CheckpointFlag } = await server.ssrLoadModule("/src/engine/fx/CheckpointFlag.ts");
    const { FlagVisibility, isSphereBehindTower } = await server.ssrLoadModule("/src/engine/render/FlagVisibility.ts");
    const { TowerCullingManager } = await server.ssrLoadModule("/src/engine/culling.ts");
    const { GlowerTowerGame } = await server.ssrLoadModule("/src/engine/GlowerTowerGame.ts");

    const makeCamera = (position, target, fov = 40, aspect = 16 / 9) => {
      const camera = new THREE.PerspectiveCamera(fov, aspect, 0.1, 250);
      camera.position.set(...position);
      camera.lookAt(...target);
      camera.updateMatrixWorld(true);
      return camera;
    };
    const cameraFrustum = (camera) => {
      camera.updateMatrixWorld(true);
      return new THREE.Frustum().setFromProjectionMatrix(
        new THREE.Matrix4().multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse)
      );
    };
    const makeFixture = () => {
      const game = Object.create(GlowerTowerGame.prototype);
      Object.assign(game, {
        scene: new THREE.Scene(),
        camera: makeCamera([0, 5, 22], [0, 3, 0]),
        culler: new TowerCullingManager(),
        flagVisibility: new FlagVisibility(),
        player: { update() {} }, cameraRig: { update() {} }, particles: { update() {} },
        playerState: {}, config: { cullingEnabled: true },
        sceneMode: "menu", waterLevel: -1.2, towerHeight: 48,
        staticStairs: [], elevators: [], gems: [], springs: [], hazards: [],
        doors: [], collapsingStairs: [], checkpoints: [], waterRipples: [],
        topRing: new THREE.Object3D(), summitCrown: new THREE.Group(),
        level: { checkpoints: [
          { id: 1, floor: 2, x: 0, y: 2 },
          { id: 2, floor: 2, x: 12, y: 2 },
        ] },
        updateAmbientAudio() {},
      });
      game.buildCheckpoints();
      return game;
    };

    test("hidden flag: no deformation, normal update or GPU buffer invalidation", () => {
      const wave = new CheckpointFlag();
      wave.update(0.5, true);
      const pos = wave.geometry.getAttribute("position");
      const normal = wave.geometry.getAttribute("normal");
      const before = pos.array.slice();
      const version = pos.version;
      const normalVersion = normal.version;
      for (let i = 0; i < 1000; i++) assert.equal(wave.update(i + 1, false), false);
      assert.deepEqual(pos.array, before);
      assert.equal(pos.version, version);
      assert.equal(normal.version, normalVersion);
      wave.geometry.dispose();
    });

    test("flag wake-up uses current absolute phase, without catch-up loops", () => {
      const slept = new CheckpointFlag();
      const fresh = new CheckpointFlag();
      slept.update(0.5, true);
      slept.update(20, false);
      slept.update(21.375, true);
      fresh.update(21.375, true);
      assert.deepEqual(slept.geometry.getAttribute("position").array, fresh.geometry.getAttribute("position").array);
      assert.equal(slept.update(21.375, true), false);
      slept.geometry.dispose();
      fresh.geometry.dispose();
    });

    test("one wave, pinned pole edge and +/-0.24 bounds for all sampled phases", () => {
      const wave = new CheckpointFlag();
      const p = new THREE.Vector3();
      for (let frame = 0; frame < 240; frame++) {
        const time = frame / 60;
        wave.update(time, true);
        const pos = wave.geometry.getAttribute("position");
        assert.equal(Math.abs(pos.getZ(0)), 0);
        assert.equal(Math.abs(pos.getZ(1)), 0);
        for (let i = 0; i < pos.count; i++) {
          p.fromBufferAttribute(pos, i);
          const u = p.x / 0.6;
          const expected = 0.24 * u * Math.sin(Math.PI * 2 * u - time * 6);
          assert.ok(Math.abs(p.z - expected) < 1e-6);
          assert.ok(wave.geometry.boundingBox.containsPoint(p));
          assert.ok(wave.geometry.boundingSphere.containsPoint(p));
        }
      }
      wave.geometry.dispose();
    });

    test("same flag pose at 60, 144 and 260 Hz", () => {
      let reference;
      for (const hz of [60, 144, 260]) {
        const wave = new CheckpointFlag();
        for (let i = 0; i <= hz; i++) wave.update(i / hz, true);
        const vertices = wave.geometry.getAttribute("position").array;
        if (reference) assert.deepEqual(vertices, reference);
        else reference = vertices.slice();
        wave.geometry.dispose();
      }
    });

    test("behind-tower flag sleeps but remains a light-frustum shadow caster", () => {
      const game = makeFixture();
      game.updateVisuals(1, 1 / 60);
      const [front, back] = game.checkpoints;
      assert.ok(front.wave.geometry.getAttribute("position").version > 0);
      assert.equal(back.wave.geometry.getAttribute("position").version, 0);
      assert.equal(back.flag.frustumCulled, true);
      assert.equal(back.flag.castShadow, true);
      assert.equal(back.flag.receiveShadow, true);
      assert.equal(back.flag.visible, true);
      assert.equal(back.mesh.visible, true);

      const light = new THREE.DirectionalLight();
      light.position.set(15, 25, -20);
      light.shadow.camera = new THREE.OrthographicCamera(-40, 40, 40, -40, 0.1, 150);
      game.scene.add(light, light.target);
      game.scene.updateMatrixWorld(true);
      light.shadow.updateMatrices(light);
      assert.ok(light.shadow.getFrustum().intersectsObject(back.flag));
      assert.ok(light.shadow.getFrustum().intersectsObject(back.mesh.children[0]));

      game.camera.position.set(0, 5, -22);
      game.camera.lookAt(0, 3, 0);
      game.updateVisuals(2, 1 / 144);
      assert.ok(back.wave.geometry.getAttribute("position").version > 0);
      assert.equal(front.wave.geometry.getAttribute("position").version, 1);
    });

    test("reflection-only flag stays animated", () => {
      const camera = makeCamera([0, 5, 20], [0, -2, 10], 40, 2);
      const bounds = new THREE.Sphere(new THREE.Vector3(8.1, 10, 0), 0.44);
      assert.equal(cameraFrustum(camera).intersectsSphere(bounds), false);
      const visibility = new FlagVisibility();
      visibility.update(camera, -1.2);
      assert.equal(visibility.isVisible(bounds, 6, -6, 48), true);
    });

    test("occlusion respects the tower top and does not freeze a flag seen from above", () => {
      assert.equal(isSphereBehindTower(
        new THREE.Sphere(new THREE.Vector3(0, 3.5, -8.1), 0.44),
        new THREE.Vector3(0, 5, 22), 6, -6, 48
      ), true);
      assert.equal(isSphereBehindTower(
        new THREE.Sphere(new THREE.Vector3(0, 49.5, -8.1), 0.44),
        new THREE.Vector3(0, 80, 22), 6, -6, 48
      ), false);
    });

    test("enemy and elevator frusta use their moving meshes, not level.y", () => {
      const game = makeFixture();
      game.camera = makeCamera([0, 12, 22], [0, 12, 0], 15, 1);
      const enemy = new THREE.Mesh(new THREE.SphereGeometry(0.32, 8, 8), new THREE.MeshStandardMaterial());
      const elevator = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.35, 2.4), new THREE.MeshStandardMaterial());
      enemy.position.set(0, 12, 7.2);
      elevator.position.set(0, 12, 7.2);
      enemy.castShadow = elevator.castShadow = true;
      game.hazards.push({ theta: 0, y: 0, currentX: 0.5, mesh: enemy });
      game.elevators.push({ theta: 0, currentTopY: 12.175, mesh: elevator });
      game.scene.add(enemy, elevator);
      game.performCullingPass(0, 12);
      game.scene.updateMatrixWorld(true);
      const frustum = cameraFrustum(game.camera);
      assert.equal(enemy.visible, true);
      assert.equal(elevator.visible, true);
      assert.ok(frustum.intersectsObject(enemy));
      assert.ok(frustum.intersectsObject(elevator));

      enemy.position.y = elevator.position.y = 0;
      game.scene.updateMatrixWorld(true);
      assert.equal(frustum.intersectsObject(enemy), false);
      assert.equal(frustum.intersectsObject(elevator), false);
      assert.equal(enemy.castShadow && enemy.visible, true);
      assert.equal(elevator.castShadow && elevator.visible, true);

      const light = new THREE.DirectionalLight();
      light.position.set(15, 25, -20);
      light.shadow.camera = new THREE.OrthographicCamera(-40, 40, 40, -40, 0.1, 150);
      game.scene.add(light, light.target);
      game.scene.updateMatrixWorld(true);
      light.shadow.updateMatrices(light);
      assert.ok(light.shadow.getFrustum().intersectsObject(enemy));
      assert.ok(light.shadow.getFrustum().intersectsObject(elevator));
    });

    test("offscreen gems keep moving shadows; collected gems stay absent", () => {
      const game = makeFixture();
      const mesh = new THREE.Mesh(new THREE.OctahedronGeometry(0.32), new THREE.MeshStandardMaterial());
      mesh.castShadow = true;
      mesh.position.set(0, 8, -7.2);
      const gem = { x: 12.5, theta: Math.PI, y: 8, mesh, collected: false };
      game.gems.push(gem);
      game.scene.add(mesh);
      game.updateVisuals(0.3);
      const y = mesh.position.y;
      const rotation = mesh.rotation.y;
      game.updateVisuals(0.8);
      assert.notEqual(mesh.position.y, y);
      assert.notEqual(mesh.rotation.y, rotation);
      assert.equal(mesh.visible && mesh.castShadow, true);
      gem.collected = true;
      mesh.visible = false;
      const collectedY = mesh.position.y;
      game.updateVisuals(2);
      assert.equal(mesh.visible, false);
      assert.equal(mesh.position.y, collectedY);
    });

    console.log(`[render-test] ${passed} regression tests passed (CPU logic; no GPU rasterization).`);
  } finally {
    await server.close();
  }
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  await runRenderingCullingTests();
}