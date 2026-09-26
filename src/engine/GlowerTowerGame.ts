// import * as THREE from "three";
// import { Sky } from "three/addons/objects/Sky.js";
// import { Water } from "three/addons/objects/Water.js";
// import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
// import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
// import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
// import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
// import { TowerCullingManager } from "./culling";
// import { CheckpointFlag } from "./fx/CheckpointFlag";
// import { FlagVisibility } from "./render/FlagVisibility";
// import {
//   CollapsingStairDef,
//   DoorDef,
//   LeverDef,
//   TogglableStairDef,
//   ElevatorDef,
//   EngineConfig,
//   GameStatus,
//   GemDef,
//   HazardDef,
//   StairDef,
//   SpringDef,
// } from "./gameTypes";
// import { PlayerRig } from "./player/PlayerRig";
// import { CameraRig } from "./camera/CameraRig";
// import { ParticleSystem, type ParticleMode } from "./fx/ParticleSystem";
// import { ambientSpatial, collectAmbientSources } from "./audio/ambientSpatial";
// import {
//   RENDER_WIDTH,
//   RENDER_HEIGHT,
//   ASPECT_RATIO,
//   BASE_VERTICAL_FOV,
//   MAX_VERTICAL_FOV,
//   CIRCUMFERENCE_STEPS,
//   PLAYER_HALF_WIDTH,
//   WALK_SPEED,
//   JUMP_SPEED,
//   GRAVITY,
//   TOWER_RADIUS,
//   PLATFORM_THICKNESS,
//   PLATFORM_DEPTH,
//   TAU,
//   PLAYER_STAND_RADIUS,
//   FIRST_STEP_CENTER,
//   PLAYER_HEIGHT,
//   FIXED_DT,
//   MAX_ACCUMULATOR,
//   wrapValue,
//   stepToTheta,
//   stairIndexAt,
//   stairCenterX,
//   wrappedStepDistance,
// } from "./constants";
// // UWAGA FIX: celowo usunięto overlapsWrapped z importu.
// // Mieszał konwencję (center,half,left,width) i prowokował podawanie
// // środka jako lewej krawędzi -> przesunięcie hitboxa o width/2.
// // Wszystkie testy poziome idą teraz przez wrappedStepDistance (symetrycznie).
// import defaultLevelJson from "../levels/lvl_0001.level.json";
// import { loadLevel } from "../levels/loadLevel";
// import type { TowerLevelDefinition } from "../levels/levelTypes";
// import {
//   createElevatorMaterial,
//   createElevatorRailMaterial,
//   createEnemyMaterial,
//   createStairsMaterial,
//   createTowerMaterial,
//   applyMossGradient,
//   applyGemGlow,
//   createCollapsingStairMaterial,
//   createTogglableStairMaterial,
//   createDoorFrameMaterial,
//   createDoorMaterial
// } from "../gameTextures";
// import { soundEngine } from "../soundEngine";

// export * from "./constants";

// export const DEFAULT_LEVEL = loadLevel(defaultLevelJson);

// interface PreparedStair extends StairDef {
//   theta: number;
//   radial: THREE.Vector3;
//   tangLength: number;
//   defaultMatrix: THREE.Matrix4;
//   culledMatrix: THREE.Matrix4;
//   wasVisible?: boolean;
// }

// function uniformTexelBox(
//   width: number,
//   height: number,
//   depth: number,
//   baseRepeat: [number, number]
// ): THREE.BoxGeometry {
//   const g = new THREE.BoxGeometry(width, height, depth);
//   const uvAttr = g.attributes.uv as THREE.BufferAttribute | undefined;
//   if (!uvAttr) return g;
//   const uv = uvAttr.array as Float32Array;
//   const maxDim = Math.max(width, height, depth);
//   if (maxDim <= 0) return g;
//   const faceDims: [number, number][] = [
//     [depth, height],
//     [depth, height],
//     [width, depth],
//     [width, depth],
//     [width, height],
//     [width, height],
//   ];
//   for (let face = 0; face < 6; face++) {
//     const [fw, fh] = faceDims[face];
//     const repeatU = (baseRepeat[0] * fw) / maxDim;
//     const repeatV = (baseRepeat[1] * fh) / maxDim;
//     const offset = face * 8;
//     for (let i = 0; i < 4; i++) {
//       const ui = offset + i * 2;
//       const vi = ui + 1;
//       if (ui < 0 || vi >= uv.length) continue;
//       uv[ui] = uv[ui] * repeatU;
//       uv[vi] = uv[vi] * repeatV;
//     }
//   }
//   uvAttr.needsUpdate = true;
//   g.computeBoundingBox();
//   g.computeBoundingSphere();
//   return g;
// }

// export class GlowerTowerGame {
//   private host: HTMLElement;
//   public readonly level: TowerLevelDefinition;
//   public readonly towerHeight: number;
//   private renderer!: THREE.WebGLRenderer;
//   private scene!: THREE.Scene;
//   public camera!: THREE.PerspectiveCamera;
//   private culler = new TowerCullingManager();
//   private readonly flagVisibility = new FlagVisibility();
//   private sceneMode: "menu" | "play" = "menu";
//   private ambientAudioActive = false;
//   private player!: PlayerRig;
//   private cameraRig!: CameraRig;
//   private particles!: ParticleSystem;
//   private staticStairs: PreparedStair[] = [];
//   private stairsInstancedMesh!: THREE.InstancedMesh;
//   private towerMesh!: THREE.Mesh;
//   /** Dolna kotwica gradientu osadu (pelna sila) — wspolna dla muru i stopni. */
//   private get groundTintBottomY(): number { return this.waterLevel - 0.45; }
//   /** Gorna kotwica gradientu osadu (krycie 0) — „na wysokosci odpowiadajacej”. */
//   private get groundTintTopY(): number { return this.waterLevel + 5.6; }
//   private floorMesh!: THREE.Mesh;
//   private sky!: Sky;
//   private water!: Water;
//   private composer!: EffectComposer;
//   private bloomPass!: UnrealBloomPass;
//   private sun = new THREE.Vector3();
//   private readonly physicsRadial = new THREE.Vector3();
//   private waterLevel = -1.2;
//   private wasInWater = false;
//   private waterEnterCooldown = 0;
//   private topRing!: THREE.Mesh;
//   private summitCrown!: THREE.Group;
//   private beaconDome!: THREE.Mesh;
//   private trophy!: THREE.Mesh;
//   private domeShards: THREE.Mesh[] = [];
//   private domeShattered = false;
//   private winPending = false;
//   private winPendingTimer = 0;
//   private waterRipples: THREE.Mesh[] = [];
//   private pmremGenerator!: THREE.PMREMGenerator;
//   private elevators: ElevatorDef[] = [];
//   private gems: GemDef[] = [];
//   private springs: SpringDef[] = [];
//   private hazards: HazardDef[] = [];
//   private doors: DoorDef[] = [];
//   private checkpoints: {
//     id: number; floor: number; x: number; y: number; activated: boolean;
//     mesh: THREE.Group; flag: THREE.Mesh; wave: CheckpointFlag; bounds: THREE.Sphere;
//   }[] = [];
//   private activeCheckpoint = 0;
//   private doorCooldown = 0;
//   private collapsingStairs: CollapsingStairDef[] = [];
//   private levers: LeverDef[] = [];
//   private togglableStairs: TogglableStairDef[] = [];
//   private leverCooldown = 0;
//   private ignoredElevator = -1;
//   private sunLight!: THREE.DirectionalLight;
//   private hemiLight!: THREE.HemisphereLight;

//   public playerState = {
//     x: FIRST_STEP_CENTER,
//     y: 0.5,
//     vx: 0, vy: 0, grounded: true, coyoteTimer: 0, jumpBufferTimer: 0,
//     facingRight: true, rideElevator: -1, status: "running" as GameStatus,
//     walkCycle: 0, score: 0, gemsCollected: 0, totalGems: 0, jumpCount: 0,
//     elapsedTime: 0, camLeadAngle: 0, verticalLead: 0, smoothCamY: 0.5,
//     idleTimer: 0, facingYaw: 0, jiggle: 0, jiggleVel: 0, crownFlash: 0,
//     enemyHitCooldown: 0, knockdownFloorY: null as number | null,
//     currentStairTopY: null as number | null,
//   };

//   public input = { left: false, right: false, up: false, down: false, jumpQueued: false, doorQueued: false };
//   public config: EngineConfig = {
//     cullingEnabled: true, simulatedFpsThrottle: 0, filterMode: "crisp",
//     renderScale: 1, soundMuted: true, sfxEnabled: true, musicEnabled: true,
//   };
//   private accumulator = 0;
//   private lastTime = performance.now();
//   private animFrameId = 0;
//   private lastThrottleTime = performance.now();
//   private playerHudTimer = 0;
//   public onPlayerStateUpdate?: (playerState: typeof this.playerState) => void;
//   public onGameStatusChange?: (status: GameStatus) => void;

//   constructor(host: HTMLElement, level: TowerLevelDefinition = DEFAULT_LEVEL) {
//     this.host = host;
//     this.level = level;
//     this.towerHeight = level.towerHeight;
//     this.playerState.x = level.start.x;
//     this.playerState.y = level.start.y;
//     this.playerState.smoothCamY = level.start.y;
//     this.playerState.idleTimer = 2;
//     this.playerState.facingYaw = Math.atan2(
//       Math.sin(stepToTheta(level.start.x)),
//       Math.cos(stepToTheta(level.start.x))
//     );
//     this.culler.setTower(TOWER_RADIUS, -6, this.towerHeight);
//     this.initThree();
//     this.buildWorld();
//     this.player = new PlayerRig(this.scene);
//     this.cameraRig = new CameraRig(this.camera, this.towerHeight);
//     this.particles = new ParticleSystem(this.scene, 250);
//     this.applySceneShadows();
//     this.setupEvents();
//     this.startLoop();
//   }

//   // ── FIX: jeden symetryczny test obwodowy dla całej gry ──
//   // Zastępuje overlapsWrapped(px,pHalf,left,width).
//   // Zwraca true gdy środki są bliżej niż suma połówek, z wrapem wieży.
//   private overlapsCentered(ax: number, aHalf: number, bx: number, bHalf: number): boolean {
//     return wrappedStepDistance(ax, bx) < aHalf + bHalf;
//   }
//   private elevatorCenterX(xLeft: number, width: number): number {
//     return xLeft + width * 0.5;
//   }

//   private applySceneShadows() {
//     const skyMesh = this.sky as unknown as THREE.Object3D | undefined;
//     const waterMesh = this.water as unknown as THREE.Object3D | undefined;
//     this.scene.traverse((obj) => {
//       if (!(obj instanceof THREE.Mesh)) return;
//       if (obj === skyMesh) return;
//       if (obj === waterMesh) { obj.castShadow = false; obj.receiveShadow = true; return; }
//       if (obj.userData?.noShadow === true) { obj.castShadow = false; obj.receiveShadow = false; return; }
//       const materials = Array.isArray(obj.material) ? obj.material : [obj.material];
//       const isDecorative = materials.some(
//         (m) => m instanceof THREE.MeshBasicMaterial || m.depthWrite === false
//       );
//       if (isDecorative) {
//         obj.castShadow = false;
//         obj.receiveShadow = !materials.some((m) => m instanceof THREE.MeshBasicMaterial);
//         return;
//       }
//       obj.castShadow = true;
//       obj.receiveShadow = true;
//     });
//   }

//   private initThree() {
//     this.scene = new THREE.Scene();
//     this.scene.background = null;
//     this.scene.fog = new THREE.FogExp2(0xcccccc, 0.00025);
//     this.camera = new THREE.PerspectiveCamera(BASE_VERTICAL_FOV, ASPECT_RATIO, 0.1, 20000);
//     this.camera.position.set(0, 5, 14);
//     this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance", stencil: false, depth: true });
//     this.renderer.setPixelRatio(1);
//     this.renderer.setSize(RENDER_WIDTH, RENDER_HEIGHT, false);
//     this.renderer.shadowMap.enabled = true;
//     this.renderer.shadowMap.type = THREE.PCFShadowMap;
//     this.renderer.shadowMap.autoUpdate = true;
//     this.renderer.outputColorSpace = THREE.SRGBColorSpace;
//     this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
//     this.renderer.toneMappingExposure = 0.9;
//     const canvas = this.renderer.domElement;
//     canvas.id = "game-canvas-640x640";
//     canvas.style.width = "100%";
//     canvas.style.height = "100%";
//     canvas.style.objectFit = "cover";
//     canvas.style.display = "block";
//     this.applyCanvasFilter();
//     this.host.appendChild(canvas);
//     this.hemiLight = new THREE.HemisphereLight("#fffddb", "#34697b", 0.66);
//     this.scene.add(this.hemiLight);
//     this.sunLight = new THREE.DirectionalLight("#ffe999", 1.9);
//     this.sunLight.castShadow = true;
//     // 2048 (jak w oryginale) — 4096 bylo 4x drozsze w wypelnieniu mapy cienia
//     // i nie bylo tego warte. Ostrosc zalatwia ciasna kamera, nie rozdzielczosc.
//     this.sunLight.shadow.mapSize.set(2048, 2048);
//     // Kamera cienia jest ciasno dopasowana do wiezy w buildWorld() - tu tylko
//     // bezpieczne wartosci startowe. |bias| MUSI byc maly: shader dodaje go do
//     // znormalizowanej glebokosci (near..far), wiec duza wartosc ujemna daje
//     // „przeciek swiatla” i naswietlony pasek przy krawedzi cienia.
//     this.sunLight.shadow.camera = new THREE.OrthographicCamera(-64, 64, 64, -64, 0.1, 450);
//     this.sunLight.shadow.bias = -0.00007;
//     // 0.12 zamiast 0.06: przesuniecie proby wzdluz normalnej odbiornika
//     // neutralizuje resztkowe acne/leak. To kosztuje ZERO (jest w vertex
//     // shaderze), wiec zamiast drozszej mapy uzywamy taniego mechanizmu.
//     this.sunLight.shadow.normalBias = 0.12;
//     // Radius w PCFShadowMap skaluje tylko offsety 5 prob Vogel-dysku, wiec jest
//     // DARMOWY: 0.6 daje mieksza krawedz niz oryginalne 0.4 bez kosztu.
//     this.sunLight.shadow.radius = 0.6;
//     this.sunLight.target.position.set(0, 5, 0);
//     this.scene.add(this.sunLight.target);
//     this.sunLight.shadow.camera.position.copy(this.sunLight.position);
//     this.sunLight.shadow.camera.lookAt(this.sunLight.target.position);
//     this.sunLight.shadow.camera.updateProjectionMatrix();
//     this.sunLight.shadow.needsUpdate = true;
//     this.scene.add(this.sunLight);
//     const renderPass = new RenderPass(this.scene, this.camera);
//     // Rozdzielczosc blooma zamiast pelnego kadru (640x640 -> 160x160).
//     // UnrealBloomPass buduje piramidę render targetów i robi kilkanascie
//     // przebiegow na klatke — koszt skaluje sie wprost z ta rozdzielczoscia,
//     // a przy strength = 0.01 / threshold = 0.24 rozmy.
//     // effekt jest i tak praktycznie niewidoczny. Rozmycie blooma jest miekkie
//     // z zalozenia, wiec spadek rozdzielczosci NIE zmienia wygladu w odroznieniu
//     // od innych efektow. Zysk: ~16x mniej pikseli w pipeline blooma.
//     this.bloomPass = new UnrealBloomPass(new THREE.Vector2(160, 160), 0.01, 0.0, 0.24);
//     const outputPass = new OutputPass();
//     this.composer = new EffectComposer(this.renderer);
//     this.composer.addPass(renderPass);
//     this.composer.addPass(this.bloomPass);
//     this.composer.addPass(outputPass);
//   }

//   public applyCanvasFilter() {
//     const canvas = this.renderer.domElement;
//     if (this.config.filterMode === "crisp") {
//       canvas.style.imageRendering = "pixelated";
//       (canvas.style as unknown as { imageRendering: string }).imageRendering = "crisp-edges";
//     } else canvas.style.imageRendering = "auto";
//   }

//   private buildWorld() {
//     this.sky = new Sky();
//     this.sky.scale.setScalar(10000);
//     this.sky.frustumCulled = false;
//     this.scene.add(this.sky);
//     const skyUniforms = (this.sky as any).material.uniforms;
//     const elevation = 33; const azimuth = 220;
//     const phi = THREE.MathUtils.degToRad(90 - elevation);
//     const theta = THREE.MathUtils.degToRad(azimuth);
//     this.sun.setFromSphericalCoords(1, phi, theta);
//     skyUniforms["turbidity"].value = 2.0;
//     skyUniforms["rayleigh"].value = 1.0;
//     skyUniforms["mieCoefficient"].value = 0.005;
//     skyUniforms["mieDirectionalG"].value = 0.8;
//     skyUniforms["sunPosition"].value.copy(this.sun);
//     if (skyUniforms["cloudCoverage"]) {
//       skyUniforms["cloudScale"].value = 0.0002;
//       skyUniforms["cloudSpeed"].value = 0.00001;
//       skyUniforms["cloudCoverage"].value = 0.4;
//       skyUniforms["cloudDensity"].value = 0.4;
//       skyUniforms["cloudElevation"].value = 0.5;
//       skyUniforms["time"].value = 0;
//     }
//     if (skyUniforms["exposure"] !== undefined) skyUniforms["exposure"].value = 0.028;
//     const sunDistance = 125;
//     this.sunLight.position.copy(this.sun).multiplyScalar(sunDistance);
//     this.sunLight.target.position.set(0, 5, 0);
//     this.scene.add(this.sunLight.target);
//     // ------------------------------------------------------------------------
//     // KALIBRACJA CIENIA (bug: jasny, naswietlony pasek przy murze wiezy).
//     // Cien wiezy na schodkach zaczynal sie ~0.25 j. od sciany, jakby swiatlo
//     // przechodzilo miedzy schodkiem a murem. Przyczyna nie byla geometria, a
//     // bias cienia: w shaderze jest on dodawany do ZNORMALIZOWANEJ glebokosci
//     // fragmentu (near..far kamery cienia), wiec ortho o wysokosci 240 j. i
//     // bias -0.0005 dawalo 240 * 0.0005 = 0.12... a z zakresem 450 j. cale
//     // 0.225 j. „przecieku” — kazda krawedz cienia odklejala sie od rzucajacej
//     // geometrii o tyle wlasnie w jednostkach swiata.
//     // Poprawka: (1) ciasna kamera cienia dopasowana do bryly wiezy -> ~2x
//     // mniejszy teksel (ostrzejszy cien) i mniejszy zakres glebi, (2) bardzo
//     // maly bias, (3) acne zbijamy przez normalBias, ktory przesuwa probe
//     // wzdloz NORMALNEJ powierzchni (czyli na schodku w gore, a nie w strone
//     // muru) — dlatego nie tworzy paska przy scianie.
//     // ------------------------------------------------------------------------
//     const elevationCos = Math.max(0.2, Math.sqrt(Math.max(0, 1 - this.sun.y * this.sun.y)));
//     // Ciasna ortho = mniejszy teksel przy TEJ SAMEJ rozdzielczosci mapy, czyli
//     // ostry cien bez ani jednego dodatkowego fragmentu. Margines +2 tylko po
//     // to, zeby nie uciac konca cienia wiezy na wodzie.
//     const shadowHalf = Math.max(
//       24,
//       (this.towerHeight - this.sunLight.target.position.y) * elevationCos + TOWER_RADIUS + PLATFORM_DEPTH + 2
//     );
//     const shadowCamera = this.sunLight.shadow.camera as THREE.OrthographicCamera;
//     shadowCamera.left = -shadowHalf; shadowCamera.right = shadowHalf;
//     shadowCamera.top = shadowHalf; shadowCamera.bottom = -shadowHalf;
//     const lightDistance = this.sunLight.position.distanceTo(this.sunLight.target.position);
//     shadowCamera.near = Math.max(1, lightDistance - shadowHalf * 1.6);
//     shadowCamera.far = lightDistance + shadowHalf * 1.6;
//     shadowCamera.lookAt(this.sunLight.target.position);
//     shadowCamera.updateProjectionMatrix();
//     // Poziom blyskajacych pikseli: resztkowe acne przechodzilo jako pojedyncze
//     // jasne punkty przy terminatorze cienia. Zbijamy je TANIMI srodkami:
//     //   - duzy normalBias (vertex shader, zero kosztu) przesuwa probe wzdluz
//     //     normalnej odbiornika — na schodku w gore, na murze na zewnatrz —
//     //     wiec nie robi paska przy scianie,
//     //   - ciasna ortho (teksel ~4.8 cm przy 2048) ostrzy cien bez kosztu,
//     //   - minimalny bias zostaje, bo to on odpowiadal za pierwotny pasek.
//     // Rozdzielczosci mapy NIE ruszamy: 2048 wypelnia sie 4x taniej niz 4096.
//     this.sunLight.shadow.bias = -0.00007;
//     this.sunLight.shadow.normalBias = 0.12;
//     this.sunLight.shadow.radius = 0.6;
//     this.sunLight.shadow.needsUpdate = true;
//     (this.sunLight as any).color = new THREE.Color("#ffe999");
//     this.hemiLight.color = new THREE.Color("#fffddb");
//     this.hemiLight.groundColor = new THREE.Color("#405080");
//     try {
//       this.pmremGenerator = new THREE.PMREMGenerator(this.renderer);
//       const sceneEnv = new THREE.Scene();
//       sceneEnv.add(this.sky.clone());
//       const renderTarget = this.pmremGenerator.fromScene(sceneEnv);
//       this.scene.environment = null;
//       this.scene.environmentIntensity = 0;
//       renderTarget.dispose();
//     } catch { }
//     const waterGeometry = new THREE.PlaneGeometry(12000, 12000);
//     const textureLoader = new THREE.TextureLoader();
//     const waterNormalsUrl = new URL("../textures/waternormals.jpg", import.meta.url).href;
//     const waterNormals = textureLoader.load(waterNormalsUrl);
//     waterNormals.wrapS = THREE.RepeatWrapping; waterNormals.wrapT = THREE.RepeatWrapping;
//     this.water = new Water(waterGeometry, {
//       textureWidth: 512, textureHeight: 512, waterNormals: waterNormals,
//       sunDirection: this.sun.clone().normalize(), sunColor: 0x7F7F7F, waterColor: 0x555555,
//       distortionScale: 0.8, fog: this.scene.fog !== undefined,
//     });
//     this.water.material.onBeforeCompile = (shader) => {
//       shader.uniforms.uTowerRadius = { value: TOWER_RADIUS };
//       shader.fragmentShader = shader.fragmentShader.replace("void main() {", `uniform float uTowerRadius;\nvoid main() {`);
//       shader.fragmentShader = shader.fragmentShader.replace(
//         "vec4 noise = getNoise( worldPosition.xz * size );",
//         `vec4 noise = getNoise( worldPosition.xz * size );
//         vec2 toTower = worldPosition.xz;
//         float distToTower = length(toTower);
//         vec2 outward = toTower / max(distToTower, 0.001);
//         if (distToTower > uTowerRadius && distToTower < uTowerRadius + 26.0) {
//           float d = distToTower - uTowerRadius;
//           float dirVar = outward.x * 0.8 + outward.y * 0.6;
//           float dirVar2 = outward.x * outward.y * 2.0;
//           float decay = exp(-d * 0.18);
//           float freq = 1.7 + 0.35 * dirVar;
//           float refl = sin(d * freq - time * 2.6 + dirVar2 * 1.5)
//                      + 0.4 * sin(d * 2.7 - time * 4.1 - dirVar * 2.0);
//           noise.xy += outward * refl * 0.38 * decay;
//           float chopDecay = exp(-d * 0.75);
//           float chop = sin(d * 8.0 - time * 6.5 + dirVar * 2.5)
//                      * sin(worldPosition.x * 1.8 - worldPosition.z * 1.4 + time * 4.5);
//           vec2 tangential = vec2(-outward.y, outward.x);
//           noise.xy += tangential * chop * 0.25 * chopDecay;
//         }`
//       );
//     };
//     this.water.rotation.x = -Math.PI / 2;
//     this.water.position.y = this.waterLevel;
//     this.floorMesh = this.water as unknown as THREE.Mesh;
//     this.floorMesh.frustumCulled = false;
//     this.floorMesh.receiveShadow = true;
//     this.scene.add(this.water);
//     const towerTotalHeight = this.towerHeight + 6;
//     const towerWallRadius = TOWER_RADIUS + 0.12;
//     const towerWallMaterial = createTowerMaterial(undefined, towerWallRadius, towerTotalHeight);
//     this.towerMesh = new THREE.Mesh(
//       new THREE.CylinderGeometry(TOWER_RADIUS, TOWER_RADIUS + 0.18, towerTotalHeight, 48, 1, false),
//       towerWallMaterial
//     );
//     this.towerMesh.position.y = this.towerHeight / 2 - 3;
//     // Osad (podmokły mech/glony) na PIERWSZYM rzędzie kafli muru. Rząd ma
//     // wysokość towerTotalHeight / repeatV (identycznie jak UV w createTowerMaterial).
//     // Dół gradientu leży pod lustrem wody, więc złącza nie widać — osad wychodzi
//     // spod wody i zanika do zera, w górnej krawędzi wchodząc w kolor Glutka.
//     const wallRowHeight = towerTotalHeight / Math.max(1, Math.ceil(towerTotalHeight / 6));
//     const wallBottomY = this.towerMesh.position.y - towerTotalHeight / 2;
//     const firstRowTopY = wallBottomY + wallRowHeight;
//     applyMossGradient(towerWallMaterial, {
//       // UWAGA: woda three.js jest NIEPRZEZROCZYSTA (alpha = 1.0), wiec wszystko
//       // ponizej lustra (-1.2) jest niewidoczne. Dlatego 0.45 j. ponizej lustra
//       // kladziemy pelna sile osadu (zlacze ukryte pod woda), a cala rampa leci
//       // NAD woda: CZARNY pas przy linii wody -> ZIELEN Glutka, z zanikiem do
//       // zera przy topY. Rzad kafli [wallBottomY .. firstRowTopY] to referencja.
//       bottomY: this.groundTintBottomY,
//       topY: Math.max(this.groundTintTopY, firstRowTopY + 5.8),
//       waterY: this.waterLevel,
//       strength: 1.0,
//       wet: 0.9,
//       mudColor: "#000000", // kraniec CZARNY (parter)
//       slimeColor: "#4ade80", // kraniec ZIELONY = kolor Glutka
//     });
//     this.towerMesh.receiveShadow = true; this.towerMesh.castShadow = true; this.towerMesh.frustumCulled = false;
//     this.scene.add(this.towerMesh);
//     const foamRing = new THREE.Mesh(
//       new THREE.TorusGeometry(TOWER_RADIUS + 0.32, 0.06, 10, 48),
//       // Bylo: szary/popielaty pasek (#d6ecff, opacity 0.18) dookola wiezy na
//       // poziomie wody. Teraz: CZARNY pas przy podstawie wiezy.
//       new THREE.MeshStandardMaterial({ color: "#000000", roughness: 0.92, transparent: true, opacity: 0.35, depthWrite: false })
//     );
//     foamRing.rotation.x = Math.PI / 2; foamRing.position.y = this.waterLevel + 0.04; foamRing.renderOrder = 1;
//     this.scene.add(foamRing);
//     this.topRing = new THREE.Mesh(
//       new THREE.TorusGeometry(TOWER_RADIUS - 0.5, 0.25, 14, 64),
//       new THREE.MeshStandardMaterial({ color: "#fbbf24", emissive: "#d97706", emissiveIntensity: 0.18, roughness: 0.5, metalness: 0.8 })
//     );
//     this.topRing.position.y = this.towerHeight + 0.6; this.topRing.rotation.x = Math.PI / 2; this.topRing.castShadow = true;
//     this.scene.add(this.topRing);
//     this.summitCrown = new THREE.Group(); this.summitCrown.position.y = this.towerHeight;
//     const beaconDome = new THREE.Mesh(
//       new THREE.SphereGeometry(3.2, 24, 16, 0, Math.PI * 2, 0, Math.PI * 0.5),
//       new THREE.MeshStandardMaterial({ color: "#7dd3fc", emissive: "#075985", emissiveIntensity: 0.12, transparent: true, opacity: 0.36, roughness: 0.08, metalness: 0.12, envMapIntensity: 1.2, depthWrite: false, side: THREE.DoubleSide })
//     );
//     this.beaconDome = beaconDome; this.summitCrown.add(beaconDome);
//     const trophyGeo = new THREE.OctahedronGeometry(1.1, 0);
//     const trophyMaterial = new THREE.MeshStandardMaterial({ color: "#94a3b8", emissive: "#1f2937", emissiveIntensity: 0.15, metalness: 0.85, roughness: 0.25 });
//     const victoryTrophy = new THREE.Mesh(trophyGeo, trophyMaterial);
//     victoryTrophy.position.y = 1.35; victoryTrophy.name = "victoryTrophy"; victoryTrophy.userData = { allGems: false };
//     this.trophy = victoryTrophy; this.summitCrown.add(victoryTrophy); this.scene.add(this.summitCrown);
//     this.buildStairs(); this.buildElevators(); this.buildSprings(); this.buildGems();
//     this.buildHazards(); this.buildCheckpoints(); this.buildDoors();
//     this.buildCollapsingStairs(); this.buildLeversAndTogglableStairs();
//     this.prewarmSummitShaders();
//   }

//   private prewarmSummitShaders() {
//     const wasTopVisible = this.topRing.visible; const wasCrownVisible = this.summitCrown.visible;
//     this.topRing.visible = true; this.summitCrown.visible = true;
//     const renderer = this.renderer as THREE.WebGLRenderer & { compileAsync?: (scene: THREE.Scene, camera: THREE.Camera) => Promise<void> };
//     if (renderer.compileAsync) renderer.compileAsync(this.scene, this.camera).finally(() => { this.topRing.visible = wasTopVisible; this.summitCrown.visible = wasCrownVisible; });
//     else { renderer.compile(this.scene, this.camera); this.topRing.visible = wasTopVisible; this.summitCrown.visible = wasCrownVisible; }
//   }

//   private buildStairs() {
//     const towerMidRadius = TOWER_RADIUS + PLATFORM_DEPTH * 0.5;
//     const stepArcLength = (TAU * TOWER_RADIUS) / CIRCUMFERENCE_STEPS;
//     const slots = new Map<string, { id: string; stepX: number; topY: number }>();
//     const addSlot = (id: string, x: number, topY: number) => {
//       const stepX = stairIndexAt(x); const key = `${stepX}@${topY.toFixed(3)}`;
//       if (!slots.has(key)) slots.set(key, { id, stepX, topY });
//     };
//     for (const stair of this.level.stairs) {
//       const count = Math.max(1, Math.floor(stair.count ?? 1));
//       for (let i = 0; i < count; i++) addSlot(count > 1 ? `${stair.id}#${i}` : stair.id, stair.x + i, stair.topY);
//     }
//     for (const door of this.level.doors) addSlot(`${door.id}-stair`, door.x, door.topY);
//     for (const cp of this.level.checkpoints) addSlot(`checkpoint-${cp.id}-stair`, cp.x, cp.y);
//     const prepared: PreparedStair[] = [];
//     for (const slot of slots.values()) {
//       const theta = stepToTheta(stairCenterX(slot.stepX));
//       const radial = new THREE.Vector3(Math.sin(theta), 0, Math.cos(theta));
//       const pos = new THREE.Vector3(radial.x * towerMidRadius, slot.topY - PLATFORM_THICKNESS * 0.5, radial.z * towerMidRadius);
//       const quat = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, theta, 0));
//       const scale = new THREE.Vector3(stepArcLength * 1.02, 1, 1);
//       prepared.push({
//         id: slot.id, x: slot.stepX, topY: slot.topY, width: 1,
//         theta, radial, tangLength: stepArcLength,
//         defaultMatrix: new THREE.Matrix4().compose(pos, quat, scale),
//         culledMatrix: new THREE.Matrix4().compose(pos, quat, new THREE.Vector3(0, 0, 0)),
//         wasVisible: true,
//       });
//     }
//     this.staticStairs = prepared;
//     const stairWidth = stepArcLength * 1.02;
//     const stairGeo = uniformTexelBox(stairWidth, PLATFORM_THICKNESS, PLATFORM_DEPTH, [0.8, 0.8]);
//     const stairGeoUnit = uniformTexelBox(1, PLATFORM_THICKNESS, PLATFORM_DEPTH, [0.8, 0.8]);
//     const stairMat = createStairsMaterial();
//     // Pierwsze stopnie (do wysokosci gradientu) tintowane TA SAMA metoda, co
//     // zapadnie i schodki przelaczane: kolor MNOZY mape STEP_col, wiec tekstura
//     // stopnia zostaje widoczna. Kolor idzie od tinty CZARNEGO na parterze do
//     // ZIELENI Glutka, a krycie maleje do 0 — dyskretnie, kwantyzacja co 0.5
//     // pietra, wiec kazdy stopien ma jeden skokowy odcien. Ta sama para kotwic,
//     // co mur -> kolor odpowiada wysokosci w gradiencie sciany.
//     applyMossGradient(stairMat, {
//       bottomY: this.groundTintBottomY,
//       topY: this.groundTintTopY,
//       waterY: this.waterLevel,
//       strength: 1.0,
//       // Ta sama wartosc co na murze (0.9) -> stopnie lsnia dokladnie tak samo
//       // jak sciana; blask maleje z wysokoscia az do zera na gornej krawedzi
//       // gradientu, powyzej stopnie sa suche i matowe.
//       wet: 0.9,
//       quantizeStep: 0.5,
//       mudColor: "#000000", // parter: czarna tinta
//       slimeColor: "#4ade80", // gora pasa: zielen Glutka przy kryciu 0
//     });
//     this.stairsInstancedMesh = new THREE.InstancedMesh(stairGeoUnit, stairMat, prepared.length);
//     this.stairsInstancedMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
//     this.stairsInstancedMesh.castShadow = true; this.stairsInstancedMesh.receiveShadow = true; this.stairsInstancedMesh.frustumCulled = false;
//     prepared.forEach((stair, idx) => { this.stairsInstancedMesh.setMatrixAt(idx, stair.defaultMatrix); });
//     this.stairsInstancedMesh.instanceMatrix.needsUpdate = true;
//     this.scene.add(this.stairsInstancedMesh);
//     stairGeo.dispose();
//   }

//   // private buildElevators() {
//   //   const elevatorSpecs = this.level.elevators;
//   //   const stepArcLength = (TAU * TOWER_RADIUS) / CIRCUMFERENCE_STEPS;
//   //   const elevWidth = stepArcLength * 1.02;
//   //   const elevHeight = PLATFORM_THICKNESS; const elevDepth = PLATFORM_DEPTH;
//   //   const elevGeo = uniformTexelBox(elevWidth, elevHeight, elevDepth, [0.8, 0.8]);
//   //   const railThickness = PLATFORM_THICKNESS; const railMat = createElevatorRailMaterial();
//   //   elevatorSpecs.forEach((spec) => {
//   //     const theta = stepToTheta(spec.x + spec.width * 0.5);
//   //     const radial = new THREE.Vector3(Math.sin(theta), 0, Math.cos(theta));
//   //     const elevMat = createElevatorMaterial();
//   //     const mesh = new THREE.Mesh(elevGeo, elevMat);
//   //     mesh.castShadow = true; mesh.receiveShadow = true; mesh.frustumCulled = true; mesh.rotation.y = theta;
//   //     mesh.position.set(radial.x * (TOWER_RADIUS + PLATFORM_DEPTH * 0.5), spec.yMin - PLATFORM_THICKNESS * 0.5, radial.z * (TOWER_RADIUS + PLATFORM_DEPTH * 0.5));
//   //     this.scene.add(mesh);
//   //     this.elevators.push({ ...spec, mesh, currentTopY: spec.yMin, theta });
//   //     const railTravel = spec.yMax - spec.yMin;
//   //     const railGeo = new THREE.BoxGeometry(railThickness, railTravel, railThickness);
//   //     const rail = new THREE.Mesh(railGeo, railMat);
//   //     rail.rotation.y = theta;
//   //     const railRadius = TOWER_RADIUS + railThickness * 0.5;
//   //     rail.position.set(radial.x * railRadius, (spec.yMin + spec.yMax) / 2, radial.z * railRadius);
//   //     rail.receiveShadow = true; this.scene.add(rail);
//   //   });
//   // }

// private buildElevators() {
//     const elevatorSpecs = this.level.elevators;
//     // Ten sam srodek bryly co schodki: kazdy schodek stoi na promieniu
//     // TOWER_RADIUS + PLATFORM_DEPTH/2 (buildStairs: towerMidRadius).
//     const towerMidRadius = TOWER_RADIUS + PLATFORM_DEPTH * 0.5;
//     const stepArcLength = (TAU * TOWER_RADIUS) / CIRCUMFERENCE_STEPS;
//     // IDENTYCZNE wymiary jak schodek: ta sama szerokosc (jeden slot * 1.02,
//     // dokladnie jak stairGeo), ta sama grubosc i ta sama glebokosc.
//     const elevWidth = stepArcLength * 1.02;
//     const elevHeight = PLATFORM_THICKNESS; const elevDepth = PLATFORM_DEPTH;
//     const elevGeo = uniformTexelBox(elevWidth, elevHeight, elevDepth, [0.8, 0.8]);
//     const railThickness = PLATFORM_THICKNESS; const railMat = createElevatorRailMaterial();
//     elevatorSpecs.forEach((spec) => {
//       // SRODEK Z SIATKI SCHODKOW: floor(x) + 0.5, a nie spec.x + spec.width/2.
//       // W poziomach width = 1.2, wiec stare wyliczenie dawalo 15 + 0.6 = 15.6
//       // zamiast 15.5 — winda byla przesunieta o 0.1 slotu (0.16 j.) w prawo:
//       // z prawej zahaczala o sasiedni schodek, z lewej zostawiala wieksza
//       // przerwe niz miedzy schodkami.
//       const centerX = stairCenterX(stairIndexAt(spec.x));
//       const theta = stepToTheta(centerX);
//       const radial = new THREE.Vector3(Math.sin(theta), 0, Math.cos(theta));
//       const elevMat = createElevatorMaterial();
//       const mesh = new THREE.Mesh(elevGeo, elevMat);
//       mesh.castShadow = true; mesh.receiveShadow = true; mesh.frustumCulled = true; mesh.rotation.y = theta;
//       mesh.position.set(radial.x * towerMidRadius, spec.yMin - PLATFORM_THICKNESS * 0.5, radial.z * towerMidRadius);
//       this.scene.add(mesh);
//       // FIZYKA DOSTAJE TE SAMA BRYLE CO WIZUAL: srodek = centerX, szerokosc =
//       // jeden slot (elevatorCenterX liczy x + width/2, tak jak dla schodkow
//       // staticStairs trzymaja x = indeks slotu i width = 1).
//       this.elevators.push({ ...spec, x: centerX - 0.5, width: 1, mesh, currentTopY: spec.yMin, theta });
//       const railTravel = spec.yMax - spec.yMin;
//       const railGeo = new THREE.BoxGeometry(railThickness, railTravel, railThickness);
//       const rail = new THREE.Mesh(railGeo, railMat);
//       rail.rotation.y = theta;
//       const railRadius = TOWER_RADIUS + railThickness * 0.5;
//       rail.position.set(radial.x * railRadius, (spec.yMin + spec.yMax) / 2, radial.z * railRadius);
//       rail.receiveShadow = true; this.scene.add(rail);
//     });
//   }

  
//   private buildSprings() {
//     this.level.springs.forEach((sp) => {
//       // FIX: level trzyma lewą krawędź, visual i logika muszą używać środka.
//       const centerX = sp.x + 0.5;
//       const theta = stepToTheta(centerX);
//       const radial = new THREE.Vector3(Math.sin(theta), 0, Math.cos(theta));
//       const springGroup = new THREE.Group();
//       const baseMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.5, 0.15, 16), new THREE.MeshStandardMaterial({ color: "#ef4444", metalness: 0.6, roughness: 0.3 }));
//       baseMesh.position.y = sp.topY + 0.08; springGroup.add(baseMesh);
//       // Gorna tarcza spreżyny: kolor Gluta (#4ade80 — ten sam hex co gelMat
//       // w PlayerRig) i DOKLADNIE te same parametry odbicia co podstawa
//       // (metalness 0.6, roughness 0.3). Wczesniej bylo metalness 0.8 + emissive
//       // 0.6, a przy scene.environment = null metal bez odbicia traci diffuse
//       // i wyglada matowo — a emisja dodatkowo splaszczala powierzchnie.
//       const padMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 0.1, 16), new THREE.MeshStandardMaterial({ color: "#4ade80", metalness: 0.6, roughness: 0.3 }));
//       padMesh.position.y = sp.topY + 0.18; springGroup.add(padMesh);
//       springGroup.position.set(radial.x * PLAYER_STAND_RADIUS, 0, radial.z * PLAYER_STAND_RADIUS);
//       springGroup.rotation.y = theta; this.scene.add(springGroup);
//       // FIX: zapisujemy środek, nie lewą krawędź - kolizja jest symetryczna.
//       this.springs.push({ ...sp, x: centerX, mesh: baseMesh, theta, cooldown: 0 });
//     });
//   }

//   private buildGems() {
//     const gemGeo = new THREE.OctahedronGeometry(0.32, 0);
//     // Klejnoty maja lsnic jak szlif, nie jak plaskie plamy:
//     //  - metalness bylo 0.9, a scena ma scene.environment = null; metal bez
//     //    odbicia nie ma ani diffuse, ani specularu -> w cieniu zostawal sam
//     //    obrys. Dlatego metal spada do 0.05, a diffuse/albedo wraca,
//     //  - chropowatosc 0.08 daje ostry refleks slonca, ktory iskrzy sie na
//     //    kolejnych scianach szlifu,
//     //  - flatShading: kazda sciana ma wlasna normalna -> widac bryle,
//     //  - applyGemGlow dorzuca tania poswiate zalezna od sciany (w cieniu tez
//     //    widac ksztalt, a nie sam obrys).
//     const gemMat = new THREE.MeshStandardMaterial({
//       // KOLORY Z REPO — nie zmieniamy barwy klejnotu (albedo i emisja jak było).
//       color: "#f59e0b",
//       emissive: "#d97706",
//       emissiveIntensity: 0.6,
//       // Zmieniamy WYLACZNIE sposob odbijania swiatla: ostry refleks, diffuse
//       // wraca (metalness bylo 0.9 bez envMap = brak diffuse i specularu),
//       // flatShading daje kazdej scianie wlasna normalna.
//       roughness: 0.08,
//       metalness: 0.05,
//       flatShading: true,
//     });
//     // Poswiata szlifu w barwie emisji repo — zadnego nowego odcienia.
//     applyGemGlow(gemMat, { coreColor: "#d97706", glow: 1.0 });
//     this.playerState.totalGems = this.level.gems.length;
//     this.level.gems.forEach((pt) => {
//       // pt.x to już środek (visual bez +0.5) - zostawiamy jako środek.
//       const theta = stepToTheta(pt.x);
//       const radial = new THREE.Vector3(Math.sin(theta), 0, Math.cos(theta));
//       // UWAGA: jeden WSPOLNY material dla wszystkich klejnotow. Material.clone()
//       // nie przenosi instancyjnego onBeforeCompile (three/Material.js), wiec
//       // klony zgubilyby szlif z applyGemGlow.
//       const mesh = new THREE.Mesh(gemGeo, gemMat);
//       mesh.castShadow = true; mesh.frustumCulled = true;
//       mesh.position.set(radial.x * PLAYER_STAND_RADIUS, pt.y, radial.z * PLAYER_STAND_RADIUS);
//       this.scene.add(mesh);
//       this.gems.push({ id: pt.id, x: pt.x, y: pt.y, mesh, collected: false, theta });
//     });
//   }

//   private findEnemyLandingX(fromX: number, topY: number, moveSteps: number, direction: -1 | 1): number {
//     if (moveSteps <= 0) return stairCenterX(stairIndexAt(fromX));
//     const fromSlot = stairIndexAt(fromX);
//     const candidates = [direction, -direction] as const;
//     for (const dir of candidates) {
//       // FIX: fromSlot to już indeks, wrapujemy arytmetycznie, nie przez stairIndexAt(indeks).
//       const targetSlot = wrapValue(fromSlot + dir * moveSteps, CIRCUMFERENCE_STEPS);
//       const exists = this.staticStairs.some((stair) => stairIndexAt(stair.x) === targetSlot && Math.abs(stair.topY - topY) < 0.2);
//       if (exists) return stairCenterX(targetSlot);
//     }
//     return stairCenterX(fromSlot);
//   }

//   // private buildHazards() {
//   //   const hazardSpecs = this.level.enemies;
//   //   const enemyMat = createEnemyMaterial();
//   //   if (enemyMat.map) { enemyMat.map.wrapS = THREE.RepeatWrapping; enemyMat.map.wrapT = THREE.RepeatWrapping; enemyMat.map.repeat.set(0.6, 0.6); enemyMat.map.offset.set(0, 0); enemyMat.map.center.set(0.5, 0.5); enemyMat.map.rotation = 0; enemyMat.map.flipY = false; enemyMat.map.needsUpdate = true; }
//   //   if (enemyMat.normalMap) { enemyMat.normalMap.wrapS = THREE.RepeatWrapping; enemyMat.normalMap.wrapT = THREE.RepeatWrapping; enemyMat.normalMap.repeat.set(0.6, 0.6); enemyMat.normalMap.offset.set(0, 0); enemyMat.normalMap.center.set(0.5, 0.5); enemyMat.normalMap.rotation = 0; enemyMat.normalMap.flipY = false; enemyMat.normalMap.needsUpdate = true; }
//   //   const orbGeo = new THREE.SphereGeometry(0.32, 14, 14);
//   //   const playerJumpHeight = (JUMP_SPEED * JUMP_SPEED) / (2 * GRAVITY);
//   //   const defaultBallBounceHeight = playerJumpHeight * 0.5;
//   //   hazardSpecs.forEach((spec) => {
//   //     const behavior = spec.behavior ?? "bounce";
//   //     const amplitude = spec.amplitude ?? defaultBallBounceHeight;
//   //     const speed = spec.speed ?? 1.2;
//   //     const slot = stairIndexAt(spec.xCenter);
//   //     let baseY = spec.y;
//   //     for (const plat of this.staticStairs) { if (stairIndexAt(plat.x) === slot && Math.abs(plat.topY - spec.y) < 0.75) { baseY = plat.topY; break; } }
//   //     const enemyX = stairCenterX(slot);
//   //     const moveSteps = Math.max(0, Math.floor(spec.moveSteps ?? 0));
//   //     const direction: -1 | 1 = spec.direction === -1 ? -1 : 1;
//   //     const naturalFlightTime = 2 * Math.sqrt((2 * amplitude) / GRAVITY);
//   //     const bounceDuration = naturalFlightTime / Math.max(0.25, speed);
//   //     const targetX = this.findEnemyLandingX(enemyX, baseY, moveSteps, direction);
//   //     const mesh = new THREE.Mesh(orbGeo, enemyMat);
//   //     mesh.castShadow = true; mesh.receiveShadow = true; mesh.frustumCulled = true;
//   //     mesh.userData.spinAxis = new THREE.Vector3(0, 0, 1);
//   //     mesh.userData.spinSpeed = (speed ?? 1.2) * 0.8;
//   //     this.scene.add(mesh);
//   //     this.hazards.push({ id: spec.id, x: enemyX, y: spec.y, behavior, amplitude, speed, currentX: enemyX, bounceElapsed: 0, bounceDuration, bounceBaseY: baseY, bounceFromX: enemyX, bounceToX: targetX, moveSteps, direction, mesh, theta: stepToTheta(enemyX) });
//   //   });
//   // }


//   private buildHazards() {
//     const hazardSpecs = this.level.enemies;
//     const enemyMat = createEnemyMaterial();
//     // TEKSTURY SA TERAZ WSPOLDZIELONE (cache w gameTextures), a ten blok zmienia
//     // ich repeat/center/flipY — bez klonowania psulby takze inne materialy
//     // korzystajace z ENEMY_col/ENEMY_nrm. Poza tym flipY ustawiony PO uploadzie
//     // wymusza reinterpretacje obrazu, przez co kulka wychodzila przyciemniona.
//     // Klon dzieli dane obrazu, ale ma wlasne ustawienia (zero dodatkowego
//     // dekodowania, zero dodatkowej tekstury na GPU).
//     if (enemyMat.map) {
//       const map = enemyMat.map.clone();
//       map.wrapS = THREE.RepeatWrapping; map.wrapT = THREE.RepeatWrapping;
//       map.repeat.set(0.6, 0.6); map.offset.set(0, 0); map.center.set(0.5, 0.5); map.rotation = 0;
//       map.flipY = false; map.needsUpdate = true;
//       enemyMat.map = map;
//     }
//     if (enemyMat.normalMap) {
//       const normalMap = enemyMat.normalMap.clone();
//       normalMap.wrapS = THREE.RepeatWrapping; normalMap.wrapT = THREE.RepeatWrapping;
//       normalMap.repeat.set(0.6, 0.6); normalMap.offset.set(0, 0); normalMap.center.set(0.5, 0.5); normalMap.rotation = 0;
//       normalMap.flipY = false; normalMap.needsUpdate = true;
//       enemyMat.normalMap = normalMap;
//     }
//     const orbGeo = new THREE.SphereGeometry(0.32, 14, 14);
//     const playerJumpHeight = (JUMP_SPEED * JUMP_SPEED) / (2 * GRAVITY);
//     const defaultBallBounceHeight = playerJumpHeight * 0.5;
//     hazardSpecs.forEach((spec) => {
//       const behavior = spec.behavior ?? "bounce";
//       const amplitude = spec.amplitude ?? defaultBallBounceHeight;
//       const speed = spec.speed ?? 1.2;
//       const slot = stairIndexAt(spec.xCenter);
//       let baseY = spec.y;
//       for (const plat of this.staticStairs) { if (stairIndexAt(plat.x) === slot && Math.abs(plat.topY - spec.y) < 0.75) { baseY = plat.topY; break; } }
//       const enemyX = stairCenterX(slot);
//       const moveSteps = Math.max(0, Math.floor(spec.moveSteps ?? 0));
//       const direction: -1 | 1 = spec.direction === -1 ? -1 : 1;
//       const naturalFlightTime = 2 * Math.sqrt((2 * amplitude) / GRAVITY);
//       const bounceDuration = naturalFlightTime / Math.max(0.25, speed);
//       const targetX = this.findEnemyLandingX(enemyX, baseY, moveSteps, direction);
//       const mesh = new THREE.Mesh(orbGeo, enemyMat);
//       mesh.castShadow = true; mesh.receiveShadow = true; mesh.frustumCulled = true;
//       mesh.userData.spinAxis = new THREE.Vector3(0, 0, 1);
//       mesh.userData.spinSpeed = (speed ?? 1.2) * 0.8;
//       this.scene.add(mesh);
//       this.hazards.push({ id: spec.id, x: enemyX, y: spec.y, behavior, amplitude, speed, currentX: enemyX, bounceElapsed: 0, bounceDuration, bounceBaseY: baseY, bounceFromX: enemyX, bounceToX: targetX, moveSteps, direction, mesh, theta: stepToTheta(enemyX) });
//     });
//   }



//   private buildLeversAndTogglableStairs() {
//     var armLen = 0.7; var armGeo = new THREE.BoxGeometry(0.06, 0.06, armLen); var ballGeo = new THREE.SphereGeometry(0.08, 8, 8);
//     var redMat = new THREE.MeshStandardMaterial({ color: "#ef4444", emissive: "#7f1d1d", emissiveIntensity: 0.9, roughness: 0.1, metalness: 0.6 });
//     this.level.levers.forEach((spec) => {
//       // FIX: normalizacja do środka stopnia - visual i trigger w tym samym miejscu.
//       const centerX = stairCenterX(stairIndexAt(spec.x));
//       var theta = stepToTheta(centerX);
//       var radial = new THREE.Vector3(Math.sin(theta), 0, Math.cos(theta));
//       var group = new THREE.Group();
//       var armGroup = new THREE.Group(); armGroup.name = "armGroup";
//       var arm = new THREE.Mesh(armGeo, new THREE.MeshStandardMaterial({ color: "#cbd5e1", emissive: "#475569", emissiveIntensity: 0.4, metalness: 0.5, roughness: 0.3 }));
//       arm.position.set(0, 0, armLen / 2); armGroup.add(arm);
//       var ball = new THREE.Mesh(ballGeo, redMat.clone()); ball.position.set(0, 0, armLen); ball.userData = { isBall: true }; armGroup.add(ball);
//       armGroup.rotation.x = -0.6; group.add(armGroup);
//       group.position.set(radial.x * TOWER_RADIUS, spec.topY + 1.2, radial.z * TOWER_RADIUS);
//       group.rotation.y = theta; this.scene.add(group);
//       this.levers.push({ id: spec.id, x: centerX, topY: spec.topY, theta, mesh: group, extended: false });
//     });
//     const sAL = (TAU * TOWER_RADIUS) / CIRCUMFERENCE_STEPS;
//     const tsWidth = sAL * 1.02;
//     const tsGeo = uniformTexelBox(tsWidth, PLATFORM_THICKNESS, PLATFORM_DEPTH, [0.8, 0.8]);
//     this.level.togglableStairs.forEach((spec) => {
//       const theta = stepToTheta(stairCenterX(stairIndexAt(spec.x)));
//       const radial = new THREE.Vector3(Math.sin(theta), 0, Math.cos(theta));
//       const group = new THREE.Group();
//       const mat = createTogglableStairMaterial();
//       // Schodki CHOWANE: zachowuja tinte stanu dzwigni (zielony wysuniety /
//       // czerwony schowany) i sa ona przyciemniane, im bardziej mokro — czyli
//       // im nizej na gradiencie. Nad pasem gradientu wracaja do pelnej jasnosci,
//       // a w pasie lsnia mokro tak samo jak mur. Material jest osobny dla
//       // kazdego schodka, wiec kazdy dostaje wlasny zestaw uniformow.
//       applyMossGradient(mat, {
//         mode: "darken",
//         bottomY: this.groundTintBottomY,
//         topY: this.groundTintTopY,
//         waterY: this.waterLevel,
//         strength: 1.0,
//         wet: 0.9,
//         darkMin: 0.22, // na samym dole czerwien/zielen jest mocno przyciemniona
//       });
//       const mesh = new THREE.Mesh(tsGeo, mat);
//       mesh.castShadow = true; mesh.receiveShadow = true; group.add(mesh);
//       group.position.set(radial.x * (TOWER_RADIUS - 0.8), spec.topY - PLATFORM_THICKNESS * 0.5, radial.z * (TOWER_RADIUS - 0.8));
//       group.rotation.y = theta; this.scene.add(group);
//       this.togglableStairs.push({ id: spec.id, x: stairCenterX(stairIndexAt(spec.x)), topY: spec.topY, leverId: spec.leverId, theta, mesh: group, extended: false, retractOffset: 0 });
//     });
//   }

//   private buildCollapsingStairs() {
//     const mat = createCollapsingStairMaterial();
//     // ZAPADNIE (schodki zapadajace sie): ten sam gradient co schodki statyczne
//     // — tinta czarny -> zielen Glutka, dyskretnie co pol pietra, z kryciem
//     // malejacym do zera i mokrym polyskiem (mossWetness) identycznym jak mur.
//     applyMossGradient(mat, {
//       bottomY: this.groundTintBottomY,
//       topY: this.groundTintTopY,
//       waterY: this.waterLevel,
//       strength: 1.0,
//       wet: 0.9,
//       quantizeStep: 0.5,
//       mudColor: "#000000",
//       slimeColor: "#4ade80",
//     });
//     const sAL = (TAU * TOWER_RADIUS) / CIRCUMFERENCE_STEPS;
//     const csWidth = sAL * 1.02;
//     const csGeo = uniformTexelBox(csWidth, PLATFORM_THICKNESS, PLATFORM_DEPTH, [0.8, 0.8]);
//     this.level.collapsingStairs.forEach((spec) => {
//       const centerX = stairCenterX(stairIndexAt(spec.x));
//       const theta = stepToTheta(centerX);
//       const radial = new THREE.Vector3(Math.sin(theta), 0, Math.cos(theta));
//       const group = new THREE.Group();
//       const mesh = new THREE.Mesh(csGeo, mat);
//       mesh.castShadow = true; mesh.receiveShadow = true; group.add(mesh);
//       group.position.set(radial.x * PLAYER_STAND_RADIUS, spec.topY - PLATFORM_THICKNESS * 0.5, radial.z * PLAYER_STAND_RADIUS);
//       group.rotation.y = theta; this.scene.add(group);
//       this.collapsingStairs.push({ id: spec.id, x: centerX, topY: spec.topY, theta, mesh: group, state: "idle", timer: 0, retractOffset: 0 });
//     });
//   }

//   private buildCheckpoints() {
//     // Kijek flagi jest DREWNIANY: dokladnie ta sama tekstura co prowadnica
//     // windy (createElevatorRailMaterial deleguje tutaj) i rama drzwi
//     // teleportacyjnych. Jedna instancja materialu dla wszystkich checkpointow;
//     // powtarzamy teksture 1x po obwodzie i 3x po wysokosci cienkiego słupka,
//     // zeby sloje biegly wzdluz kija (domyslne 0.5/0.9 jest strojone pod
//     // prostokatna rame drzwi).
//     // Uwaga: harness testow repo uruchamia te buildery takze w Node (bez DOM),
//     // a TextureLoader potrzebuje document.createElementNS — dlatego poza
//     // przegladarka bierzemy zwykly drewniany kolor zamiast tekstury.
//     const poleMaterial =
//       typeof document === "undefined"
//         ? new THREE.MeshStandardMaterial({ color: "#8a6d4a", roughness: 0.9, metalness: 0.05 })
//         : createDoorFrameMaterial();
//     // Tekstury sa teraz WSPOLDZIELONE (cache w gameTextures), a rama drzwi uzywa
//     // tego samego pliku z innym repeat — dlatego kij dostaje wlasne kopie
//     // tekstur (Texture.clone dzieli obraz, ale ma osobny repeat/offset).
//     if (poleMaterial.map) {
//       poleMaterial.map = poleMaterial.map.clone();
//       poleMaterial.map.wrapS = THREE.RepeatWrapping; poleMaterial.map.wrapT = THREE.RepeatWrapping;
//       poleMaterial.map.repeat.set(1, 3); poleMaterial.map.needsUpdate = true;
//     }
//     if (poleMaterial.normalMap) {
//       poleMaterial.normalMap = poleMaterial.normalMap.clone();
//       poleMaterial.normalMap.wrapS = THREE.RepeatWrapping; poleMaterial.normalMap.wrapT = THREE.RepeatWrapping;
//       poleMaterial.normalMap.repeat.set(1, 3); poleMaterial.normalMap.needsUpdate = true;
//     }
//     this.level.checkpoints.forEach((cp) => {
//       const cpX = stairCenterX(stairIndexAt(cp.x));
//       const theta = stepToTheta(cpX);
//       const radial = new THREE.Vector3(Math.sin(theta), 0, Math.cos(theta));
//       const group = new THREE.Group();
//       const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 1.8, 8), poleMaterial);
//       pole.position.y = cp.y + 0.9; pole.castShadow = true; pole.receiveShadow = true; group.add(pole);
//       const wave = new CheckpointFlag();
//       // Flaga: emissiveIntensity bylo 0.3, wiec stala poswiata wyrownujaca
//       // jasnosc — flaga wygladala identycznie w cieniu i w sloncu. Teraz
//       // poswiata jest sladowa (0.15) i dominuje oswietlenie: roznica
//       // swiatlo/cien jest czytelna, a chropowatosc 0.5 dodaje lekki polysk
//       // tkaniny, ktory lapie kat padania swiatla na fale.
//       const flag = new THREE.Mesh(wave.geometry, new THREE.MeshStandardMaterial({
//         color: "#ef4444",
//         emissive: "#991b1b",
//         emissiveIntensity: 0.15,
//         roughness: 0.5,
//         metalness: 0.06,
//         side: THREE.DoubleSide,
//         shadowSide: THREE.DoubleSide,
//       }));
//       flag.castShadow = true; flag.receiveShadow = true; flag.frustumCulled = true;
//       flag.position.set(0, cp.y + 1.5, 0); group.add(flag);
//       group.position.set(radial.x * (PLAYER_STAND_RADIUS + 0.9), 0, radial.z * (PLAYER_STAND_RADIUS + 0.9));
//       group.rotation.y = theta; this.scene.add(group);
//       group.updateWorldMatrix(true, true);
//       const bounds = wave.geometry.boundingSphere!.clone().applyMatrix4(flag.matrixWorld);
//       this.checkpoints.push({ ...cp, x: cpX, activated: false, mesh: group, flag, wave, bounds });
//     });
//   }

//   private buildDoors() {
//     const lowestByPair = new Map<string, number>();
//     for (const door of this.level.doors) { const current = lowestByPair.get(door.pairId); if (current === undefined || door.topY < current) lowestByPair.set(door.pairId, door.topY); }
//     this.level.doors.forEach((doorData) => {
//       const doorX = stairCenterX(stairIndexAt(doorData.x));
//       const theta = stepToTheta(doorX);
//       const radial = new THREE.Vector3(Math.sin(theta), 0, Math.cos(theta));
//       const isEntrance = doorData.topY === lowestByPair.get(doorData.pairId);
//       const color = isEntrance ? "#22c55e" : "#ef4444";
//       const group = new THREE.Group();
//       const doorMaterial = createDoorMaterial(); const stoneMaterial = createDoorFrameMaterial();
//       const panel = new THREE.Mesh(new THREE.BoxGeometry(0.85, 2.0, 0.16), doorMaterial);
//       panel.position.set(0, 0.95, 0.03); panel.castShadow = true; group.add(panel);
//       const leftPost = new THREE.Mesh(new THREE.BoxGeometry(0.18, 2.15, 0.3), stoneMaterial);
//       const rightPost = leftPost.clone();
//       leftPost.position.set(-0.53, 1.05, 0); rightPost.position.set(0.53, 1.05, 0);
//       const lintelMat = stoneMaterial.clone();
//       // Material.clone() dzieli tekstury, a nadproze obraca mape o 90° —
//       // bez klonowania obracalaby sie takze mapa scian i slupkow drzwi
//       // (wczesniej dzialalo tylko dzieki temu, ze kazda fabryka ladowala plik
//       // od zera; teraz tekstury sa wspoldzielone, wiec klon jest konieczny).
//       if (lintelMat.map) { lintelMat.map = lintelMat.map.clone(); lintelMat.map.center.set(0.5, 0.5); lintelMat.map.rotation = Math.PI / 2; lintelMat.map.needsUpdate = true; }
//       if (lintelMat.normalMap) { lintelMat.normalMap = lintelMat.normalMap.clone(); lintelMat.normalMap.center.set(0.5, 0.5); lintelMat.normalMap.rotation = Math.PI / 2; lintelMat.normalMap.needsUpdate = true; }
//       const lintel = new THREE.Mesh(new THREE.BoxGeometry(1.25, 0.2, 0.3), lintelMat);
//       lintel.position.set(0, 2.05, 0); group.add(leftPost, rightPost, lintel);
//       // Strzalka nad drzwiami: wczesniej MeshBasicMaterial (bez oswietlenia),
//       // wiec byla plaska i tak samo jasna wszedzie. Teraz ciemniejsza baza
//       // (kolor * 0.42) z lekkim metalem, ktory lapie refleks slonca, plus
//       // sladowa emisja, zeby kolor wejscia (zielony) / wyjscia (czerwony)
//       // pozostal czytelny takze w cieniu.
//       const arrowTint = new THREE.Color(color);
//       const arrow = new THREE.Mesh(
//         new THREE.ConeGeometry(0.18, 0.35, 4),
//         new THREE.MeshStandardMaterial({
//           color: arrowTint.clone().multiplyScalar(0.42),
//           roughness: 0.3,
//           metalness: 0.45,
//           emissive: arrowTint.clone().multiplyScalar(0.1),
//           flatShading: true,
//         })
//       );
//       arrow.position.set(0, 2.55, 0.2); arrow.rotation.z = Math.PI; arrow.userData.baseY = 2.55; group.add(arrow);
//       group.position.set(radial.x * (TOWER_RADIUS + 0.2), doorData.topY, radial.z * (TOWER_RADIUS + 0.2));
//       group.rotation.y = theta; this.scene.add(group);
//       this.doors.push({ ...doorData, x: doorX, color, theta, mesh: group });
//     });
//   }

//   public spawnParticles(pos: THREE.Vector3, count: number, colorHex: number | string, speed = 2.5, mode: ParticleMode = "burst", floorY: number | null = null) {
//     this.particles.spawn(pos, count, colorHex, speed, mode, floorY);
//   }

//   private stepPhysics(dt: number) {
//     if (this.sceneMode === "menu") return;
//     if (this.playerState.status !== "running") return;
//     this.playerState.elapsedTime += dt;
//     if (this.playerState.coyoteTimer > 0) this.playerState.coyoteTimer -= dt;
//     if (this.playerState.jumpBufferTimer > 0) this.playerState.jumpBufferTimer -= dt;
//     if (this.doorCooldown > 0) this.doorCooldown -= dt;
//     if (this.playerState.crownFlash > 0) this.playerState.crownFlash = Math.max(0, this.playerState.crownFlash - dt);
//     if (this.playerState.enemyHitCooldown > 0) this.playerState.enemyHitCooldown = Math.max(0, this.playerState.enemyHitCooldown - dt);
//     const jiggleStiffness = 190; const jiggleDamping = 11.5;
//     this.playerState.jiggleVel += (-jiggleStiffness * this.playerState.jiggle - jiggleDamping * this.playerState.jiggleVel) * dt;
//     this.playerState.jiggle += this.playerState.jiggleVel * dt;
//     this.playerState.jiggle = THREE.MathUtils.clamp(this.playerState.jiggle, -0.32, 0.32);

//     this.levers.forEach((lev) => {
//       // FIX: lev.x to już środek (patrz build) - odległość symetryczna, bez przesunięcia 0.5.
//       var onIt = Math.abs(this.playerState.y - (lev.topY + 1.2)) < 1.5 && wrappedStepDistance(this.playerState.x, lev.x) < 0.9;
//       if (onIt && this.input.doorQueued && this.leverCooldown <= 0) {
//         this.input.doorQueued = false; lev.extended = !lev.extended; this.leverCooldown = 0.4;
//         soundEngine.playLever();
//         this.togglableStairs.forEach((ts) => {
//           if (ts.leverId !== lev.id) return; ts.extended = lev.extended;
//           const info = this.ambientAudioFor(ts.x, ts.topY);
//           if (info) soundEngine.playStairSlide(info.xDist, info.yDist, info.pan, 0.7);
//         });
//       }
//       var armGroup = lev.mesh.children.find(function (c) { return c.name === "armGroup"; }) as unknown as THREE.Group;
//       if (armGroup) (armGroup as any).rotation.x = THREE.MathUtils.lerp((armGroup as any).rotation.x, lev.extended ? -0.2 : -1.0, 0.12);
//       var ball = armGroup ? (armGroup as any).children.find(function (c: any) { return c.userData && c.userData.isBall; }) as unknown as THREE.Mesh : undefined;
//       if (ball && ball.material instanceof THREE.MeshStandardMaterial && ball.userData.extended !== lev.extended) {
//         ball.userData.extended = lev.extended;
//         ball.material.color.set(lev.extended ? "#4ade80" : "#ef4444");
//         ball.material.emissive.set(lev.extended ? "#14532d" : "#7f1d1d");
//       }
//     });
//     if (this.leverCooldown > 0) this.leverCooldown -= dt;

//     this.togglableStairs.forEach((ts) => {
//       var target = ts.extended ? 0 : 1;
//       ts.retractOffset = THREE.MathUtils.lerp(ts.retractOffset, target, 1 - Math.exp(-6 * dt));
//       if (Math.abs(ts.retractOffset - target) < 0.005) ts.retractOffset = target;
//       this.physicsRadial.set(Math.sin(ts.theta), 0, Math.cos(ts.theta));
//       var tOuter = TOWER_RADIUS + PLATFORM_DEPTH * 0.5; var tInner = TOWER_RADIUS - 0.8;
//       var dist = tOuter + (tInner - tOuter) * ts.retractOffset;
//       ts.mesh.position.set(this.physicsRadial.x * dist, ts.topY - PLATFORM_THICKNESS * 0.5, this.physicsRadial.z * dist);
//       var tMesh = ts.mesh.children[0];
//       if (tMesh && tMesh instanceof THREE.Mesh && tMesh.material instanceof THREE.MeshStandardMaterial) {
//         var isGreen = ts.retractOffset < 0.5;
//         if (tMesh.userData.isGreen !== isGreen) {
//           tMesh.userData.isGreen = isGreen;
//           tMesh.material.color.set(isGreen ? "#4ade80" : "#ef4444");
//           tMesh.material.emissive.set(isGreen ? "#198745f0" : "#831b1bed");
//         }
//       }
//     });

//     if (this.input.doorQueued) { if (this.doorCooldown <= 0) this.tryUseDoor(); this.input.doorQueued = false; }

//     this.collapsingStairs.forEach((cs) => {
//       // cs.x to środek - test symetryczny, ten był już dobry.
//       const nextPlayerY = this.playerState.y + this.playerState.vy * dt;
//       const isDescendingThroughTop = this.playerState.vy <= 0 &&
//         this.playerState.y >= cs.topY - 0.2 && nextPlayerY <= cs.topY + 0.2;
//       const onIt = (Math.abs(this.playerState.y - cs.topY) < 0.2 || isDescendingThroughTop) &&
//         this.movableStairPhysicallyOverlaps(this.playerState.x, cs.x, cs.retractOffset);
//       switch (cs.state) {
//         case "idle":
//           if (onIt && this.playerState.grounded) {
//             cs.state = "retracting"; cs.timer = 0;
//             const info = this.ambientAudioFor(cs.x, cs.topY);
//             if (info) soundEngine.playStairSlide(info.xDist, info.yDist, info.pan, 1);
//           }
//           break;
//         case "retracting":
//           cs.retractOffset = THREE.MathUtils.lerp(cs.retractOffset, 1, 1 - Math.exp(-4.3 * dt));
//           if (cs.retractOffset >= 0.98) { cs.state = "hidden"; cs.timer = 1.0; cs.retractOffset = 1; }
//           break;
//         case "hidden":
//           cs.timer -= dt;
//           if (cs.timer <= 0) {
//             cs.state = "extending"; cs.timer = 1.0;
//             const info = this.ambientAudioFor(cs.x, cs.topY);
//             if (info) soundEngine.playStairSlide(info.xDist, info.yDist, info.pan, 1);
//           }
//           break;
//         case "extending":
//           cs.timer -= dt; cs.retractOffset = Math.max(0, cs.timer / 1.0);
//           if (cs.timer <= 0) { cs.state = "idle"; cs.retractOffset = 0; cs.timer = 0; }
//           break;
//       }
//       this.physicsRadial.set(Math.sin(cs.theta), 0, Math.cos(cs.theta));
//       var outer = PLAYER_STAND_RADIUS; var inner = TOWER_RADIUS - 0.8;
//       var dist = outer + (inner - outer) * cs.retractOffset;
//       cs.mesh.position.set(this.physicsRadial.x * dist, cs.topY - PLATFORM_THICKNESS * 0.5, this.physicsRadial.z * dist);
//     });

//     const timeSec = this.playerState.elapsedTime;
//     this.elevators.forEach((elevator) => {
//       const raw = (Math.sin(timeSec * elevator.speed + elevator.phase) + 1) * 0.5;
//       const dwell = 0.15;
//       const normalized = THREE.MathUtils.smoothstep(raw, dwell, 1 - dwell);
//       const y = THREE.MathUtils.lerp(elevator.yMin, elevator.yMax, normalized);
//       if (elevator.mesh) elevator.mesh.position.y = y - PLATFORM_THICKNESS * 0.5;
//       (elevator as unknown as { prevTopY: number }).prevTopY = elevator.currentTopY;
//       elevator.currentTopY = y;
//     });

//     this.hazards.forEach((haz) => {
//       switch (haz.behavior) {
//         case "bounce": {
//           haz.bounceElapsed += dt;
//           if (haz.bounceElapsed >= haz.bounceDuration) {
//             const hit = this.ambientAudioFor(haz.currentX, haz.bounceBaseY + 0.32);
//             if (hit) soundEngine.playBallBounce(hit.xDist, hit.yDist, hit.pan);
//             haz.bounceElapsed %= haz.bounceDuration; haz.x = haz.bounceToX;
//             if (haz.moveSteps > 0) { const expectedSlot = wrapValue(stairIndexAt(haz.bounceFromX) + haz.direction * haz.moveSteps, CIRCUMFERENCE_STEPS); if (stairIndexAt(haz.x) !== expectedSlot) haz.direction = haz.direction === 1 ? -1 : 1; }
//             haz.bounceFromX = haz.x; haz.bounceToX = this.findEnemyLandingX(haz.x, haz.bounceBaseY, haz.moveSteps, haz.direction);
//           }
//           const t = THREE.MathUtils.clamp(haz.bounceElapsed / haz.bounceDuration, 0, 1);
//           const bounceY = 4 * haz.amplitude * t * (1 - t);
//           let dx = haz.bounceToX - haz.bounceFromX; if (dx > CIRCUMFERENCE_STEPS * 0.5) dx -= CIRCUMFERENCE_STEPS; if (dx < -CIRCUMFERENCE_STEPS * 0.5) dx += CIRCUMFERENCE_STEPS;
//           haz.currentX = wrapValue(haz.bounceFromX + dx * t, CIRCUMFERENCE_STEPS); haz.theta = stepToTheta(haz.currentX);
//           const ballY = haz.bounceBaseY + 0.32 + bounceY;
//           if (haz.mesh) { this.physicsRadial.set(Math.sin(haz.theta), 0, Math.cos(haz.theta)); haz.mesh.position.set(this.physicsRadial.x * PLAYER_STAND_RADIUS, ballY, this.physicsRadial.z * PLAYER_STAND_RADIUS); haz.mesh.userData.currentY = ballY; haz.mesh.rotation.x += dt * 5; haz.mesh.rotation.z += dt * 2.5; }
//           break;
//         }
//         case "patrol": {
//           const patrolN = Math.sin(timeSec * haz.speed); haz.currentX = wrapValue(haz.x + patrolN * haz.amplitude, CIRCUMFERENCE_STEPS); haz.theta = stepToTheta(haz.currentX);
//           if (haz.mesh) { this.physicsRadial.set(Math.sin(haz.theta), 0, Math.cos(haz.theta)); haz.mesh.position.set(this.physicsRadial.x * PLAYER_STAND_RADIUS, haz.bounceBaseY + 0.7, this.physicsRadial.z * PLAYER_STAND_RADIUS); haz.mesh.userData.currentY = haz.bounceBaseY + 0.7; haz.mesh.rotation.x += dt * 5; haz.mesh.rotation.z += dt * 2.5; }
//           break;
//         }
//         default:
//           haz.currentX = haz.x; haz.theta = stepToTheta(haz.x);
//           if (haz.mesh) { this.physicsRadial.set(Math.sin(haz.theta), 0, Math.cos(haz.theta)); haz.mesh.position.set(this.physicsRadial.x * PLAYER_STAND_RADIUS, haz.bounceBaseY + 0.7, this.physicsRadial.z * PLAYER_STAND_RADIUS); haz.mesh.userData.currentY = haz.bounceBaseY + 0.7; haz.mesh.rotation.x += dt * 5; haz.mesh.rotation.z += dt * 2.5; }
//           break;
//       }
//       const hazMesh = haz.mesh;
//       const hazY = hazMesh && (hazMesh.userData as Record<string, number>)?.currentY ? (hazMesh.userData as Record<string, number>).currentY : haz.y;
//       // FIX WRÓG: symetryczny test środków. Było overlapsWrapped(px,HALF*1.5,center,0.4)
//       // czyli środek jako left -> przesunięcie +0.2. Teraz half=0.2 (0.4/2).
//       const enemyOverlap = this.overlapsCentered(this.playerState.x, PLAYER_HALF_WIDTH * 1.5, haz.currentX, 0.2);
//       if (this.playerState.enemyHitCooldown <= 0 && hazY + 0.32 >= this.playerState.y - 0.1 && hazY - 0.32 <= this.playerState.y + PLAYER_HEIGHT && enemyOverlap) {
//         const enemyFloor = this.findStairTopBelow(haz.currentX, hazY + 0.01);
//         this.applyKnockdown(7.5, this.playerState.rideElevator, undefined, enemyFloor);
//       }
//     });

//     this.springs.forEach((sp) => { if (sp.cooldown > 0) sp.cooldown -= dt; });

//     if (this.playerState.rideElevator >= 0) {
//       const ridingElevator = this.playerState.rideElevator;
//       const activeElev = this.elevators[ridingElevator];
//       if (activeElev) {
//         const previousTopY = (activeElev as unknown as { prevTopY?: number }).prevTopY ?? activeElev.currentTopY;
//         const currentTopY = activeElev.currentTopY;
//         const ceilingBottom = this.findRiderCeilingBottom(ridingElevator, this.playerState.x, previousTopY, currentTopY);
//         if (ceilingBottom !== null) {
//           const resolvedY = ceilingBottom - PLAYER_HEIGHT - 0.02;
//           this.applyKnockdown(-4.5, ridingElevator, resolvedY);
//         } else { this.playerState.y = currentTopY; this.playerState.currentStairTopY = currentTopY; }
//       }
//     }

//     const moveAxis = (this.input.right ? 1 : 0) - (this.input.left ? 1 : 0);
//     this.playerState.vx = moveAxis * WALK_SPEED;
//     const prevX = this.playerState.x;
//     let nextX = wrapValue(this.playerState.x + this.playerState.vx * dt, CIRCUMFERENCE_STEPS);
//     nextX = this.checkSideCollision(prevX, nextX);
//     this.playerState.x = nextX;
//     if (moveAxis !== 0) { this.playerState.facingRight = moveAxis > 0; this.playerState.walkCycle += dt * 9; this.playerState.idleTimer = 0; } else this.playerState.idleTimer += dt;

//     if (this.input.jumpQueued) { this.playerState.jumpBufferTimer = 0.12; this.input.jumpQueued = false; }
//     const canJump = this.playerState.grounded || this.playerState.coyoteTimer > 0;
//     if (this.playerState.jumpBufferTimer > 0 && canJump) {
//       this.playerState.vy = JUMP_SPEED; this.playerState.grounded = false; this.playerState.coyoteTimer = 0; this.playerState.jumpBufferTimer = 0; this.playerState.rideElevator = -1; this.playerState.jumpCount++; soundEngine.playJump();
//       this.playerState.jiggleVel += 6.5;
//       const theta = stepToTheta(this.playerState.x); const rad = new THREE.Vector3(Math.sin(theta), 0, Math.cos(theta));
//       this.spawnParticles(new THREE.Vector3(rad.x * PLAYER_STAND_RADIUS, this.playerState.y + 0.08, rad.z * PLAYER_STAND_RADIUS), 10, 0x93c5fd, 1.8, "jump", this.playerState.y);
//     }
//     if (!this.input.up && this.playerState.vy > 4.0) this.playerState.vy *= 0.88;
//     this.playerState.vy -= GRAVITY * dt;
//     const prevY = this.playerState.y;
//     let nextY = this.playerState.y + this.playerState.vy * dt;

//     let knockedByElevator = false;
//     if (this.playerState.rideElevator < 0) {
//       const previousHeadY = prevY + PLAYER_HEIGHT; const nextHeadY = nextY + PLAYER_HEIGHT;
//       for (let elevatorIndex = 0; elevatorIndex < this.elevators.length; elevatorIndex++) {
//         if (elevatorIndex === this.ignoredElevator) continue;
//         const elev = this.elevators[elevatorIndex];
//         const currTopY = elev.currentTopY;
//         const prevTopY = (elev as unknown as { prevTopY?: number }).prevTopY ?? currTopY;
//         const previousBottomY = prevTopY - PLATFORM_THICKNESS;
//         const currentBottomY = currTopY - PLATFORM_THICKNESS;
//         const previousGap = previousBottomY - previousHeadY;
//         const currentGap = currentBottomY - nextHeadY;
//         const startedBelowElevator = prevY <= previousBottomY + 0.02;
//         const crossedHead = previousGap >= -0.02 && currentGap <= 0.02;
//         // FIX: środek windy, nie lewa krawędź.
//         const overlapsNow = startedBelowElevator && nextHeadY > currentBottomY + 0.02 && nextY < currTopY - 0.02 &&
//           this.overlapsCentered(this.playerState.x, PLAYER_HALF_WIDTH, this.elevatorCenterX(elev.x, elev.width), elev.width * 0.5);
//         if ((crossedHead || overlapsNow) && this.overlapsCentered(this.playerState.x, PLAYER_HALF_WIDTH, this.elevatorCenterX(elev.x, elev.width), elev.width * 0.5)) {
//           const resolvedY = Math.min(nextY, currentBottomY - PLAYER_HEIGHT - 0.02);
//           this.applyKnockdown(-4.5, elevatorIndex, resolvedY);
//           nextY = resolvedY; knockedByElevator = true; break;
//         }
//       }
//     }

//     if (!knockedByElevator) {
//       const ceilingHit = this.checkCeilingCollision(prevY, nextY);
//       if (ceilingHit !== null) {
//         nextY = ceilingHit; this.playerState.vy = 0; this.playerState.jiggleVel -= 4; soundEngine.playBonk();
//         const headTheta = stepToTheta(this.playerState.x);
//         const headRad = new THREE.Vector3(Math.sin(headTheta), 0, Math.cos(headTheta));
//         this.spawnParticles(new THREE.Vector3(headRad.x * PLAYER_STAND_RADIUS, nextY + PLAYER_HEIGHT, headRad.z * PLAYER_STAND_RADIUS), 10, 0xfef08a, 2.5, "burst", this.findStairTopBelow(this.playerState.x, nextY + PLAYER_HEIGHT));
//       }
//     }

//     const groundHit = this.findGround(prevY, nextY);
//     if (groundHit && this.playerState.vy <= 0) {
//       if (!this.playerState.grounded) {
//         const impact = Math.min(Math.abs(this.playerState.vy) / JUMP_SPEED, 1.6);
//         this.playerState.jiggleVel -= 9 * impact; soundEngine.playLand(impact);
//         if (impact > 0.18) {
//           const landTheta = stepToTheta(this.playerState.x); const landRad = new THREE.Vector3(Math.sin(landTheta), 0, Math.cos(landTheta));
//           this.spawnParticles(new THREE.Vector3(landRad.x * PLAYER_STAND_RADIUS, groundHit.topY + 0.06, landRad.z * PLAYER_STAND_RADIUS), Math.round(6 + impact * 8), 0xbfdbfe, 1.4 + impact * 1.2, "land", groundHit.topY);
//         }
//       }
//       this.playerState.y = groundHit.topY; this.playerState.vy = 0; this.playerState.grounded = true;
//       this.playerState.coyoteTimer = 0; this.playerState.rideElevator = groundHit.rideElevator;
//       this.playerState.currentStairTopY = groundHit.topY; this.playerState.knockdownFloorY = null; this.ignoredElevator = -1;
//     } else {
//       if (this.playerState.grounded) this.playerState.coyoteTimer = 0.1;
//       this.playerState.y = nextY; this.playerState.grounded = false; this.playerState.rideElevator = -1; this.playerState.currentStairTopY = null;
//     }

//     this.resolveMovableStairLateralHit();

//     this.springs.forEach((sp) => {
//       // FIX SPRĘŻYNA: sp.x to już środek (build +0.5). half=0.3 (0.6/2). Symetrycznie.
//       const springOverlap = this.overlapsCentered(this.playerState.x, PLAYER_HALF_WIDTH * 1.5, sp.x, 0.3);
//       if (sp.cooldown <= 0 && Math.abs(this.playerState.y - sp.topY) < 0.5 && springOverlap && this.playerState.vy <= 2) {
//         sp.cooldown = 0.4; this.playerState.vy = sp.bounceForce; this.playerState.grounded = false; this.playerState.rideElevator = -1; soundEngine.playSuperJump();
//         const theta = stepToTheta(sp.x); const rad = new THREE.Vector3(Math.sin(theta), 0, Math.cos(theta));
//         this.spawnParticles(new THREE.Vector3(rad.x * PLAYER_STAND_RADIUS, sp.topY + 0.2, rad.z * PLAYER_STAND_RADIUS), 16, 0xf59e0b, 4.2, "burst", sp.topY);
//       }
//     });

//     this.gems.forEach((gem) => {
//       // FIX KLEJNOT: gem.x to środek, half=0.3. Było left -> przesunięcie +0.3.
//       const gemOverlap = this.overlapsCentered(this.playerState.x, PLAYER_HALF_WIDTH, gem.x, 0.3);
//       if (!gem.collected && gem.y >= this.playerState.y - 0.3 && gem.y <= this.playerState.y + 2.5 && gemOverlap) {
//         gem.collected = true; this.playerState.gemsCollected++; this.playerState.score += 250; this.playerState.crownFlash = 0.3; soundEngine.playCoin();
//         if (gem.mesh) { gem.mesh.visible = false; this.spawnParticles(gem.mesh.position, 14, 0xfbbf24, 3.5, "burst", this.findStairTopBelow(gem.x, gem.y)); }
//       }
//     });

//     this.checkpoints.forEach((cp) => {
//       // FIX CHECKPOINT: cp.x to środek, half=0.6 (1.2/2).
//       const cpOverlap = this.overlapsCentered(this.playerState.x, PLAYER_HALF_WIDTH * 2, cp.x, 0.6);
//       if (!cp.activated && Math.abs(this.playerState.y - cp.y) < 1.2 && cpOverlap) {
//         cp.activated = true; this.activeCheckpoint = cp.id; soundEngine.playCheckpoint(); this.playerState.score += 500;
//         if (cp.mesh) {
//           const flagMesh = cp.mesh.children[1] as THREE.Mesh;
//           if (flagMesh && flagMesh.material instanceof THREE.MeshStandardMaterial) { flagMesh.material.color.set("#22c55e"); flagMesh.material.emissive.set("#15803d"); }
//           const cTheta = stepToTheta(cp.x); const cRad = new THREE.Vector3(Math.sin(cTheta), 0, Math.cos(cTheta));
//           const cPos = new THREE.Vector3(cRad.x * (PLAYER_STAND_RADIUS + 0.9), cp.y + 1.5, cRad.z * (PLAYER_STAND_RADIUS + 0.9));
//           this.spawnParticles(cPos, 20, 0x22c55e, 3.0, "burst", cp.y);
//         }
//       }
//     });

//     const waterSurface = this.waterLevel + 0.25;
//     if (this.waterEnterCooldown > 0) this.waterEnterCooldown -= dt;
//     if (this.playerState.y <= waterSurface) {
//       if (!this.wasInWater && this.playerState.vy < 0 && this.waterEnterCooldown <= 0) {
//         this.wasInWater = true; this.waterEnterCooldown = 1.0;
//         const theta = stepToTheta(this.playerState.x); const radial = new THREE.Vector3(Math.sin(theta), 0, Math.cos(theta));
//         const splashPos = new THREE.Vector3(radial.x * PLAYER_STAND_RADIUS, waterSurface, radial.z * PLAYER_STAND_RADIUS);
//         this.spawnParticles(splashPos, 32, 0x4fc3f7, 6.5); this.spawnParticles(splashPos.clone().add(new THREE.Vector3(0, 0.2, 0)), 20, 0xffffff, 4.0);
//         this.createWaterRipple(splashPos); this.playerState.jiggleVel -= 12; soundEngine.playGameOver();
//       }
//       this.playerState.vy = THREE.MathUtils.lerp(this.playerState.vy, -0.8, dt * 2.5); this.playerState.vx *= 0.96;
//       if (this.playerState.y < this.waterLevel - 1.5) {
//         if (this.activeCheckpoint > 0) { this.resetInput(); this.respawnAtCheckpoint(false); } else this.setGameStatus("gameover");
//         this.wasInWater = false;
//       }
//     } else this.wasInWater = false;
//     if (this.playerState.y < -8) { if (this.activeCheckpoint > 0) this.respawnAtCheckpoint(); else { this.setGameStatus("gameover"); soundEngine.playGameOver(); } }
//     this.handleTopStep();
//   }

//   private handleTopStep() {
//     const onTopStep = this.playerState.grounded && this.playerState.currentStairTopY !== null && this.playerState.currentStairTopY >= this.towerHeight;
//     if (!onTopStep || this.winPending || this.domeShattered) return;
//     const allGems = this.playerState.gemsCollected >= this.playerState.totalGems && this.playerState.totalGems > 0;
//     if (allGems && !this.beaconDome.visible) this.finishWin();
//     else if (allGems) { this.shatterDome(); this.winPending = true; this.winPendingTimer = 1.25; }
//     else this.finishWin();
//   }

//   private finishWin() {
//     this.setGameStatus("win"); this.playerState.score += 2000; soundEngine.playWin();
//     const pos = new THREE.Vector3(0, this.towerHeight + 2, 0);
//     this.spawnParticles(pos, 60, 0xfbbf24, 5.0, "burst", this.towerHeight);
//     this.spawnParticles(pos, 60, 0x38bdf8, 5.0, "burst", this.towerHeight);
//   }

//   private shatterDome() {
//     if (this.domeShattered) return; this.domeShattered = true;
//     const radius = 3.2; const position = new THREE.Vector3(0, this.towerHeight, 0);
//     this.beaconDome.visible = false;
//     const shardMat = new THREE.MeshStandardMaterial({ color: "#bfe3ff", emissive: "#38bdf8", emissiveIntensity: 0.25, transparent: true, opacity: 0.85, roughness: 0.1, metalness: 0.05, depthWrite: false, side: THREE.DoubleSide });
//     const rings = 5; const segments = 14;
//     for (let ring = 0; ring < rings; ring++) {
//       const phi0 = (ring / rings) * Math.PI * 0.5; const phi1 = ((ring + 1) / rings) * Math.PI * 0.5;
//       for (let seg = 0; seg < segments; seg++) {
//         const theta0 = (seg / segments) * Math.PI * 2; const theta1 = ((seg + 1) / segments) * Math.PI * 2;
//         const p = (phi: number, theta: number) => new THREE.Vector3(radius * Math.sin(phi) * Math.cos(theta), radius * Math.cos(phi), radius * Math.sin(phi) * Math.sin(theta));
//         const a = p(phi0, theta0); const b = p(phi1, theta0); const c = p(phi1, theta1); const d = p(phi0, theta1);
//         const cells: THREE.Vector3[][] = [[a, b, c], [a, c, d]];
//         for (const tri of cells) {
//           const geo = new THREE.BufferGeometry();
//           const verts = new Float32Array(tri.flatMap((v) => [v.x, v.y, v.z]));
//           geo.setAttribute("position", new THREE.BufferAttribute(verts, 3)); geo.computeVertexNormals();
//           const shard = new THREE.Mesh(geo, shardMat.clone()); shard.position.copy(position);
//           const center = tri[0].clone().add(tri[1]).add(tri[2]).multiplyScalar(1 / 3);
//           const dir = center.clone().normalize();
//           const speed = 4.5 + Math.random() * 5.5;
//           const velocity = dir.multiplyScalar(speed); velocity.y += 2.5 + Math.random() * 3.0;
//           shard.userData = { velocity, angular: new THREE.Vector3((Math.random() - 0.5) * 8, (Math.random() - 0.5) * 8, (Math.random() - 0.5) * 8), life: 0, maxLife: 1.4 + Math.random() * 0.8 };
//           this.scene.add(shard); this.domeShards.push(shard);
//         }
//       }
//     }
//   }

//   private updateDomeShards(dt: number) {
//     for (let i = this.domeShards.length - 1; i >= 0; i--) {
//       const shard = this.domeShards[i];
//       const data = shard.userData as { velocity: THREE.Vector3; angular: THREE.Vector3; life: number; maxLife: number };
//       data.life += dt;
//       if (data.life >= data.maxLife) { this.scene.remove(shard); shard.geometry.dispose(); (shard.material as THREE.Material).dispose(); this.domeShards.splice(i, 1); continue; }
//       data.velocity.y -= 9.8 * dt; shard.position.addScaledVector(data.velocity, dt);
//       shard.rotation.x += data.angular.x * dt; shard.rotation.y += data.angular.y * dt; shard.rotation.z += data.angular.z * dt;
//       const mat = shard.material as THREE.MeshStandardMaterial;
//       mat.opacity = Math.max(0, 0.85 * (1 - data.life / data.maxLife));
//     }
//   }

//   private createWaterRipple(position: THREE.Vector3) {
//     const ringGeo = new THREE.RingGeometry(0.3, 0.45, 24); ringGeo.rotateX(-Math.PI / 2);
//     const ringMat = new THREE.MeshBasicMaterial({ color: 0x7ec8ff, transparent: true, opacity: 0.65, side: THREE.DoubleSide, depthWrite: false });
//     const ring = new THREE.Mesh(ringGeo, ringMat); ring.position.copy(position); ring.position.y = this.waterLevel + 0.02;
//     (ring as any).userData = { age: 0, maxAge: 1.8 }; this.scene.add(ring); this.waterRipples.push(ring);
//   }

//   private respawnAtCheckpoint(playSound = true) {
//     const cp = this.checkpoints.find((c) => c.id === this.activeCheckpoint);
//     if (playSound) soundEngine.playGameOver();
//     this.playerState.knockdownFloorY = null; this.ignoredElevator = -1; this.playerState.jiggle = 0; this.playerState.jiggleVel = 0;
//     if (cp) { this.playerState.x = cp.x; this.playerState.y = cp.y + 0.5; this.playerState.vx = 0; this.playerState.vy = 0; this.playerState.grounded = false; this.playerState.rideElevator = -1; this.playerState.currentStairTopY = null; this.playerState.smoothCamY = cp.y + 0.5; }
//     else { this.playerState.x = FIRST_STEP_CENTER; this.playerState.y = 0.5; this.playerState.vx = 0; this.playerState.vy = 0; this.playerState.grounded = false; this.playerState.rideElevator = -1; this.playerState.currentStairTopY = null; this.playerState.smoothCamY = 0.5; }
//     this.playerState.idleTimer = 2; this.playerState.camLeadAngle = 0;
//     this.playerState.facingYaw = Math.atan2(Math.sin(stepToTheta(this.playerState.x)), Math.cos(stepToTheta(this.playerState.x)));
//     this.wasInWater = false; this.waterEnterCooldown = 0.8;
//   }

//   private tryUseDoor() {
//     const source = this.doors.find((door) => wrappedStepDistance(this.playerState.x, door.x) < 0.65 && Math.abs(this.playerState.y - door.topY) < 0.75);
//     if (!source) return;
//     const destination = this.doors.find((door) => door.pairId === source.pairId && door.id !== source.id);
//     if (!destination) return;
//     this.spawnParticles(source.mesh.position.clone().add(new THREE.Vector3(0, 1, 0)), 18, source.color, 3.2, "burst", source.topY);
//     this.playerState.x = destination.x; this.playerState.y = destination.topY + 0.08; this.playerState.vx = 0; this.playerState.vy = 0;
//     this.playerState.grounded = true; this.playerState.rideElevator = -1; this.playerState.currentStairTopY = destination.topY;
//     this.ignoredElevator = -1; this.playerState.smoothCamY = destination.topY; this.playerState.idleTimer = 2; this.doorCooldown = 0.55;
//     this.spawnParticles(destination.mesh.position.clone().add(new THREE.Vector3(0, 1, 0)), 18, destination.color, 3.2, "burst", destination.topY); soundEngine.playCheckpoint();
//   }

//   private findGround(prevY: number, nextY: number): { topY: number; rideElevator: number } | null {
//     let hitTop = -Infinity; let ride = -1;
//     const ignoredFloor = this.playerState.knockdownFloorY;
//     for (const stair of this.staticStairs) {
//       // FIX SCHODEK: środek = stairCenterX(stair.x), half = width/2. Symetrycznie.
//       const centerX = stairCenterX(stair.x);
//       if ((ignoredFloor === null || Math.abs(stair.topY - ignoredFloor) > 0.15) &&
//           this.overlapsCentered(this.playerState.x, PLAYER_HALF_WIDTH, centerX, stair.width * 0.5) &&
//           prevY >= stair.topY - 0.45 && nextY <= stair.topY + 0.25) {
//         if (stair.topY > hitTop) { hitTop = stair.topY; ride = -1; }
//       }
//     }
//     this.elevators.forEach((elev, idx) => {
//       if (idx === this.ignoredElevator) return;
//       const centerX = this.elevatorCenterX(elev.x, elev.width);
//       if ((ignoredFloor === null || Math.abs(elev.currentTopY - ignoredFloor) > 0.15) &&
//           this.overlapsCentered(this.playerState.x, PLAYER_HALF_WIDTH, centerX, elev.width * 0.5) &&
//           prevY >= elev.currentTopY - 0.45 && nextY <= elev.currentTopY + 0.25) {
//         if (elev.currentTopY > hitTop) { hitTop = elev.currentTopY; ride = idx; }
//       }
//     });
//     this.collapsingStairs.forEach((cs) => {
//       if (!this.movableStairPhysicallyOverlaps(this.playerState.x, cs.x, cs.retractOffset)) return;
//       if ((ignoredFloor === null || Math.abs(cs.topY - ignoredFloor) > 0.15) && prevY >= cs.topY - 0.45 && nextY <= cs.topY + 0.08 && cs.topY > hitTop) { hitTop = cs.topY; ride = -1; }
//     });
//     this.togglableStairs.forEach((ts) => {
//       if (!this.movableStairPhysicallyOverlaps(this.playerState.x, ts.x, ts.retractOffset)) return;
//       if ((ignoredFloor === null || Math.abs(ts.topY - ignoredFloor) > 0.15) && prevY >= ts.topY - 0.45 && nextY <= ts.topY + 0.08 && ts.topY > hitTop) { hitTop = ts.topY; ride = -1; }
//     });
//     if (hitTop === -Infinity) return null;
//     return { topY: hitTop, rideElevator: ride };
//   }

//   private applyKnockdown(verticalVelocity = 7.5, elevatorToIgnore = this.playerState.rideElevator, resolvedY?: number, knockdownFloor: number | null = this.playerState.currentStairTopY) {
//     if (resolvedY !== undefined) this.playerState.y = resolvedY;
//     this.playerState.enemyHitCooldown = 0.8; this.playerState.knockdownFloorY = knockdownFloor;
//     this.ignoredElevator = elevatorToIgnore; this.playerState.vy = verticalVelocity;
//     this.playerState.grounded = false; this.playerState.rideElevator = -1; this.playerState.currentStairTopY = null;
//     this.playerState.coyoteTimer = 0; this.playerState.jumpBufferTimer = 0; this.playerState.jiggleVel -= 8;
//     soundEngine.playBonk();
//     const knockTheta = stepToTheta(this.playerState.x);
//     const knockRad = new THREE.Vector3(Math.sin(knockTheta), 0, Math.cos(knockTheta));
//     const knockPos = new THREE.Vector3(knockRad.x * PLAYER_STAND_RADIUS, this.playerState.y + 1.0, knockRad.z * PLAYER_STAND_RADIUS);
//     this.spawnParticles(knockPos, 14, 0xfef08a, 3.5, "burst", this.playerState.knockdownFloorY);
//   }

//   private findStairTopBelow(x: number, y: number): number | null {
//     let best: number | null = null; const slot = stairIndexAt(x);
//     for (const stair of this.staticStairs) {
//       if (stairIndexAt(stair.x) === slot && stair.topY <= y + 0.01) { if (best === null || stair.topY > best) best = stair.topY; }
//     }
//     return best;
//   }

//   private movableStairRadialCenter(retractOffset: number): number {
//     const outer = PLAYER_STAND_RADIUS; const inner = TOWER_RADIUS - 0.8;
//     return outer + (inner - outer) * retractOffset;
//   }

//   // FIX: jedyna funkcja kolizji schodka ruchomego - w pełni symetryczna.
//   private movableStairPhysicallyOverlaps(playerX: number, centerX: number, retractOffset: number): boolean {
//     // 1. obwód: |player-center| < HALF + 0.5 (schodek ma szerokość 1, half 0.5)
//     if (wrappedStepDistance(playerX, centerX) >= PLAYER_HALF_WIDTH + 0.5) return false;
//     // 2. promień
//     const stairCenter = this.movableStairRadialCenter(retractOffset);
//     const stairInner = stairCenter - PLATFORM_DEPTH * 0.5;
//     const stairOuter = stairCenter + PLATFORM_DEPTH * 0.5;
//     const playerInner = PLAYER_STAND_RADIUS - PLAYER_HALF_WIDTH;
//     const playerOuter = PLAYER_STAND_RADIUS + PLAYER_HALF_WIDTH;
//     return playerOuter > stairInner && playerInner < stairOuter;
//   }

//   private resolveMovableStairLateralHit(): boolean {
//     if (this.playerState.enemyHitCooldown > 0) return false;
//     const playerBottom = this.playerState.y; const playerTop = this.playerState.y + PLAYER_HEIGHT;
//     const stairStrikesPlayer = (centerX: number, retractOffset: number, topY: number): boolean => {
//       const stairBottom = topY - PLATFORM_THICKNESS;
//       if (playerBottom >= topY - 0.05) return false;
//       if (playerTop <= stairBottom + 0.02) return false;
//       return this.movableStairPhysicallyOverlaps(this.playerState.x, centerX, retractOffset);
//     };
//     for (const cs of this.collapsingStairs) { if (stairStrikesPlayer(cs.x, cs.retractOffset, cs.topY)) { this.applyKnockdown(-4.5, -1); return true; } }
//     for (const ts of this.togglableStairs) { if (stairStrikesPlayer(ts.x, ts.retractOffset, ts.topY)) { this.applyKnockdown(-4.5, -1); return true; } }
//     return false;
//   }

//   private findRiderCeilingBottom(ridingElevator: number, px: number, previousTopY: number, currentTopY: number): number | null {
//     if (currentTopY <= previousTopY + 0.0001) return null;
//     const previousHeadY = previousTopY + PLAYER_HEIGHT; const currentHeadY = currentTopY + PLAYER_HEIGHT;
//     let firstBottom: number | null = null;
//     const considerStatic = (platformBottom: number, platformTop: number, horizontalOverlap: boolean) => {
//       if (!horizontalOverlap) return;
//       const wasBelowPlatformTop = previousTopY < platformTop - 0.02;
//       const headReachedBottom = currentHeadY >= platformBottom - 0.02;
//       const wasNotAlreadyAbove = previousHeadY <= platformTop + PLAYER_HEIGHT;
//       if (wasBelowPlatformTop && headReachedBottom && wasNotAlreadyAbove) {
//         if (firstBottom === null || platformBottom < firstBottom) firstBottom = platformBottom;
//       }
//     };
//     for (const stair of this.staticStairs) {
//       considerStatic(stair.topY - PLATFORM_THICKNESS, stair.topY,
//         this.overlapsCentered(px, PLAYER_HALF_WIDTH, stairCenterX(stair.x), stair.width * 0.5));
//     }
//     for (const cs of this.collapsingStairs) {
//       considerStatic(cs.topY - PLATFORM_THICKNESS, cs.topY, this.movableStairPhysicallyOverlaps(px, cs.x, cs.retractOffset));
//     }
//     for (const ts of this.togglableStairs) {
//       considerStatic(ts.topY - PLATFORM_THICKNESS, ts.topY, this.movableStairPhysicallyOverlaps(px, ts.x, ts.retractOffset));
//     }
//     for (let i = 0; i < this.elevators.length; i++) {
//       if (i === ridingElevator) continue;
//       const elev = this.elevators[i];
//       if (!this.overlapsCentered(px, PLAYER_HALF_WIDTH, this.elevatorCenterX(elev.x, elev.width), elev.width * 0.5)) continue;
//       const otherCurrentTop = elev.currentTopY;
//       const otherPreviousTop = (elev as unknown as { prevTopY?: number }).prevTopY ?? otherCurrentTop;
//       const previousGap = otherPreviousTop - PLATFORM_THICKNESS - previousHeadY;
//       const currentGap = otherCurrentTop - PLATFORM_THICKNESS - currentHeadY;
//       if (previousGap >= -0.02 && currentGap <= 0.02) {
//         const bottom = otherCurrentTop - PLATFORM_THICKNESS;
//         if (firstBottom === null || bottom < firstBottom) firstBottom = bottom;
//       }
//     }
//     return firstBottom;
//   }

//   private checkCeilingCollision(prevY: number, nextY: number): number | null {
//     if (this.playerState.vy <= 0) return null;
//     const playerTop = nextY + PLAYER_HEIGHT;
//     let lowestCeiling: number | null = null;
//     const considerCeiling = (platBottom: number, hitsHorizontally: boolean) => {
//       if (!hitsHorizontally) return;
//       if (prevY + PLAYER_HEIGHT <= platBottom && playerTop >= platBottom) {
//         if (lowestCeiling === null || platBottom < lowestCeiling) lowestCeiling = platBottom;
//       }
//     };
//     for (const stair of this.staticStairs) {
//       considerCeiling(stair.topY - PLATFORM_THICKNESS,
//         this.overlapsCentered(this.playerState.x, PLAYER_HALF_WIDTH, stairCenterX(stair.x), stair.width * 0.5));
//     }
//     for (const elev of this.elevators) {
//       considerCeiling(elev.currentTopY - PLATFORM_THICKNESS,
//         this.overlapsCentered(this.playerState.x, PLAYER_HALF_WIDTH, this.elevatorCenterX(elev.x, elev.width), elev.width * 0.5));
//     }
//     for (const cs of this.collapsingStairs) {
//       considerCeiling(cs.topY - PLATFORM_THICKNESS, this.movableStairPhysicallyOverlaps(this.playerState.x, cs.x, cs.retractOffset));
//     }
//     for (const ts of this.togglableStairs) {
//       considerCeiling(ts.topY - PLATFORM_THICKNESS, this.movableStairPhysicallyOverlaps(this.playerState.x, ts.x, ts.retractOffset));
//     }
//     return lowestCeiling !== null ? lowestCeiling - PLAYER_HEIGHT : null;
//   }

//   private checkSideCollision(prevX: number, nextX: number): number {
//     const playerY = this.playerState.y; const playerTop = playerY + PLAYER_HEIGHT;
//     const blocksAt = (x: number, leftEdge: number, width: number, topY: number): boolean => {
//       const bottom = topY - PLATFORM_THICKNESS;
//       if (playerTop <= bottom + 0.02 || playerY >= topY - 0.02) return false;
//       return this.overlapsCentered(x, PLAYER_HALF_WIDTH, leftEdge + width * 0.5, width * 0.5);
//     };
//     const considerSide = (leftEdge: number, width: number, topY: number): boolean => {
//       const hitsNext = blocksAt(nextX, leftEdge, width, topY);
//       if (!hitsNext) return false;
//       const hitsPrev = blocksAt(prevX, leftEdge, width, topY);
//       return !hitsPrev;
//     };
//     for (const stair of this.staticStairs) { if (considerSide(stair.x, stair.width, stair.topY)) return prevX; }
//     for (const elev of this.elevators) { if (considerSide(elev.x, elev.width, elev.currentTopY)) return prevX; }
//     for (const cs of this.collapsingStairs) {
//       if (!this.movableStairPhysicallyOverlaps(nextX, cs.x, cs.retractOffset)) continue;
//       if (considerSide(cs.x - 0.5, 1, cs.topY)) return prevX;
//     }
//     for (const ts of this.togglableStairs) {
//       if (!this.movableStairPhysicallyOverlaps(nextX, ts.x, ts.retractOffset)) continue;
//       if (considerSide(ts.x - 0.5, 1, ts.topY)) return prevX;
//     }
//     return nextX;
//   }

//   private performCullingPass(camTheta: number, camY: number) {
//     this.culler.cullingEnabled = this.config.cullingEnabled;
//     this.culler.updateFrustum(this.camera);
//     const towerMidRadius = TOWER_RADIUS + PLATFORM_DEPTH * 0.5;
//     let matrixChanged = false;
//     for (let i = 0; i < this.staticStairs.length; i++) {
//       const stair = this.staticStairs[i];
//       const isVis = this.culler.isItemVisible(stair.theta, stair.topY, towerMidRadius, PLATFORM_DEPTH, camTheta, camY);
//       if (stair.wasVisible !== isVis) {
//         stair.wasVisible = isVis;
//         this.stairsInstancedMesh.setMatrixAt(i, isVis ? stair.defaultMatrix : stair.culledMatrix);
//         matrixChanged = true;
//       }
//     }
//     if (matrixChanged) this.stairsInstancedMesh.instanceMatrix.needsUpdate = true;
//     for (let i = 0; i < this.springs.length; i++) {
//       const sp = this.springs[i];
//       const isVis = this.culler.isItemVisible(sp.theta, sp.topY, PLAYER_STAND_RADIUS, 0.6, camTheta, camY);
//       const grp = sp.mesh?.parent as THREE.Group | undefined;
//       if (grp && grp.visible !== isVis) grp.visible = isVis;
//     }
//     for (let i = 0; i < this.doors.length; i++) {
//       const door = this.doors[i];
//       const isVis = this.culler.isItemVisible(door.theta, door.topY + 1, TOWER_RADIUS + 0.25, 1.5, camTheta, camY);
//       if (door.mesh.visible !== isVis) door.mesh.visible = isVis;
//     }
//     for (let i = 0; i < this.collapsingStairs.length; i++) {
//       const cs = this.collapsingStairs[i];
//       const isVis = this.culler.isItemVisible(cs.theta, cs.topY, PLAYER_STAND_RADIUS, 0.5, camTheta, camY);
//       if (cs.mesh.visible !== isVis) cs.mesh.visible = isVis;
//     }
//     const summitVis = !this.config.cullingEnabled || camY > this.towerHeight - 22;
//     if (this.topRing.visible !== summitVis) this.topRing.visible = summitVis;
//     if (this.summitCrown.visible !== summitVis) this.summitCrown.visible = summitVis;
//   }

//   private startLoop() {
//     const loop = (time: number) => {
//       this.animFrameId = window.requestAnimationFrame(loop);
//       if (this.config.simulatedFpsThrottle > 0) {
//         const throttleInterval = 1000 / this.config.simulatedFpsThrottle;
//         if (time - this.lastThrottleTime < throttleInterval) return;
//         this.lastThrottleTime = time;
//       }
//       const rawDelta = (time - this.lastTime) / 1000;
//       this.lastTime = time;
//       const frameDelta = Math.min(rawDelta, MAX_ACCUMULATOR);
//       this.accumulator += frameDelta;
//       let subSteps = 0;
//       while (this.accumulator >= FIXED_DT && subSteps < 5) { this.stepPhysics(FIXED_DT); this.accumulator -= FIXED_DT; subSteps++; }
//       if (subSteps >= 5) this.accumulator = 0;
//       this.updateVisuals(time * 0.001, frameDelta);
//       if (this.sky && (this.sky as any).material?.uniforms?.time) (this.sky as any).material.uniforms.time.value = time * 0.00005;
//       if (this.water && (this.water.material as any).uniforms?.time) (this.water.material as any).uniforms.time.value += frameDelta;
//       if (this.composer) this.composer.render(); else this.renderer.render(this.scene, this.camera);
//       this.playerHudTimer += frameDelta;
//       // HUD to koszt dla Reacta: kazde wywolanie u konsumenta konczy sie
//       // setState + reconciliacja drzewa, a obiekty Reacta tworza grafy
//       // cykliczne, ktore napedzaja cycle collector Gecko (profil CC:
//       // MANY_SUSPECTED, dziesiatki ms na slice -> czkawki).
//       // W menu/wygranej/przegranej HUD nie jest widoczny, a stan gracza stoi,
//       // wiec nie ma po co go wysylac. W trybie gry bez zmian: 10 Hz.
//       if (this.playerHudTimer >= 0.1) {
//         this.playerHudTimer = 0;
//         if (this.sceneMode === "play") this.onPlayerStateUpdate?.(this.playerState);
//       }
//     };
//     this.animFrameId = window.requestAnimationFrame(loop);
//   }

//   private updateVisuals(sec: number, dt: number = 1 / 60) {
//     this.player.update(this.playerState, sec, dt);
//     this.cameraRig.update(this.sceneMode, this.playerState, sec, dt);
//     if (this.checkpoints.length > 0 && this.config.cullingEnabled) this.flagVisibility.update(this.camera, this.waterLevel);
//     if (this.domeShards && this.domeShards.length > 0) this.updateDomeShards(dt);
//     if (this.winPending) { this.winPendingTimer -= dt; if (this.winPendingTimer <= 0) { this.winPending = false; this.finishWin(); } }
//     for (let i = 0; i < this.gems.length; i++) {
//       const gem = this.gems[i];
//       if (gem.mesh && !gem.collected) { gem.mesh.rotation.y = sec * 2.2; gem.mesh.position.y = gem.y + Math.sin(sec * 3.5 + gem.x) * 0.12; }
//     }
//     for (let i = 0; i < this.doors.length; i++) {
//       const door = this.doors[i]; if (!door.mesh.visible) continue;
//       // Wczesniej `children.find((child) => ...)` tworzylo NOWA domkniecie
//       // (obiekt GC) w kazdej klatce, dla kazdych widocznych drzwi. Teraz
//       // wynik szukania jest cache'owany w userData grupy — po pierwszej klatce
//       // zero alokacji, a zachowanie identyczne.
//       const cached = door.mesh.userData.arrow as THREE.Object3D | undefined;
//       const arrow = cached ?? (door.mesh.children.find((child) => child.userData.baseY !== undefined) as THREE.Object3D | undefined);
//       if (arrow) {
//         door.mesh.userData.arrow = arrow;
//         arrow.position.y = Number(arrow.userData.baseY) + Math.sin(sec * 4 + i) * 0.12;
//       }
//     }
//     if (this.summitCrown && this.summitCrown.visible) {
//       const trophy = this.trophy || this.summitCrown.getObjectByName("victoryTrophy");
//       if (trophy && trophy instanceof THREE.Mesh) {
//         trophy.rotation.y = sec * 1.5;
//         const mat = trophy.material as THREE.MeshStandardMaterial;
//         const allGems = this.playerState.gemsCollected >= this.playerState.totalGems && this.playerState.totalGems > 0;
//         if (allGems !== trophy.userData.allGems) {
//           trophy.userData.allGems = allGems;
//           mat.color.set(allGems ? "#fef08a" : "#94a3b8");
//           mat.emissive.set(allGems ? "#eab308" : "#1f2937");
//           mat.emissiveIntensity = allGems ? 0.9 : 0.15;
//         }
//       }
//     }
//     for (let cpIdx = 0; cpIdx < this.checkpoints.length; cpIdx++) {
//       const cp = this.checkpoints[cpIdx];
//       const animate = cp.mesh.visible && cp.flag.visible && (!this.config.cullingEnabled || this.flagVisibility.isVisible(cp.bounds, TOWER_RADIUS, -6, this.towerHeight));
//       cp.wave.update(sec, animate);
//     }
//     this.particles.update(dt);
//     for (let i = this.waterRipples.length - 1; i >= 0; i--) {
//       const ripple = this.waterRipples[i];
//       const data = (ripple as any).userData as { age: number; maxAge: number };
//       data.age += dt; const t = data.age / data.maxAge;
//       if (t >= 1) { this.scene.remove(ripple); ripple.geometry.dispose(); (ripple.material as THREE.Material).dispose(); this.waterRipples.splice(i, 1); continue; }
//       const scale = 1 + t * 8; ripple.scale.setScalar(scale);
//       (ripple.material as THREE.Material & { opacity: number }).opacity = 0.65 * (1 - t);
//     }
//     const camTheta = Math.atan2(this.camera.position.x, this.camera.position.z);
//     this.performCullingPass(camTheta, this.camera.position.y);
//     this.updateAmbientAudio();
//   }

//   private ambientAudioFor(objX: number, objY: number) {
//     return ambientSpatial(objX, objY, this.playerState.x, this.playerState.y, this.camera);
//   }

//   private updateAmbientAudio() {
//     if (this.sceneMode !== "play" || this.playerState.status !== "running") {
//       if (this.ambientAudioActive) { this.ambientAudioActive = false; soundEngine.clearAmbient(); }
//       return;
//     }
//     if (soundEngine.isMuted() || !soundEngine.isSfxEnabled()) {
//       if (this.ambientAudioActive) { this.ambientAudioActive = false; soundEngine.clearAmbient(); }
//       return;
//     }
//     this.ambientAudioActive = true;
//     soundEngine.updateAmbient(collectAmbientSources(this.hazards, this.elevators, this.playerState.x, this.playerState.y, this.camera));
//   }

//   private setupEvents() { window.addEventListener("keydown", this.onKeyDown); window.addEventListener("keyup", this.onKeyUp); }
//   private onKeyDown = (e: KeyboardEvent) => {
//     if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", " "].includes(e.key)) e.preventDefault();
//     if (e.key === "ArrowLeft" || e.key.toLowerCase() === "a") this.input.left = true;
//     if (e.key === "ArrowRight" || e.key.toLowerCase() === "d") this.input.right = true;
//     if ((e.key === "ArrowUp" || e.key.toLowerCase() === "w" || e.key === " ") && !this.input.up) { this.input.jumpQueued = true; this.input.up = true; }
//     if ((e.key === "ArrowDown" || e.key.toLowerCase() === "s") && !this.input.down) { this.input.doorQueued = true; this.input.down = true; }
//   };
//   private onKeyUp = (e: KeyboardEvent) => {
//     if (e.key === "ArrowLeft" || e.key.toLowerCase() === "a") this.input.left = false;
//     if (e.key === "ArrowRight" || e.key.toLowerCase() === "d") this.input.right = false;
//     if (e.key === "ArrowUp" || e.key.toLowerCase() === "w" || e.key === " ") this.input.up = false;
//     if (e.key === "ArrowDown" || e.key.toLowerCase() === "s") this.input.down = false;
//   };

//   public setGameStatus(status: GameStatus) { this.playerState.status = status; if (this.onGameStatusChange) this.onGameStatusChange(status); }

//   public setRenderResolution(width: number, height: number) {
//     const s = this.config.renderScale; const w = width * s; const h = height * s; const aspect = w / h;
//     this.renderer.setPixelRatio(1); this.renderer.setSize(w, h, false); this.composer.setSize(w, h);
//     const baseHalfHTan = Math.tan(THREE.MathUtils.degToRad(BASE_VERTICAL_FOV) / 2) * ASPECT_RATIO;
//     if (aspect < ASPECT_RATIO) { const vFov = THREE.MathUtils.radToDeg(2 * Math.atan(baseHalfHTan / aspect)); this.camera.fov = Math.min(vFov, MAX_VERTICAL_FOV); } else this.camera.fov = BASE_VERTICAL_FOV;
//     this.camera.aspect = aspect; this.camera.updateProjectionMatrix(); this.renderer.domElement.id = `game-canvas-${width}x${height}`;
//   }

//   public setSceneMode(mode: "menu" | "play") {
//     this.sceneMode = mode;
//     // W MENU scena jest nieruchoma (kamera tylko obraca widok), a mapa cienia
//     // zalezy wylacznie od swiatla i obiektow rzucajacych cien — nie od kamery.
//     // Zamrozenie autoUpdate kasuje caly przebieg cieni (2048x2048, mur,
//     // instancyjne schodki, zapadnie, windy, drzwi, checkpointy, pociski) na
//     // kazdej klatce menu, przy zerowej roznicy w obrazie. needsUpdate = true
//     // domyka jeszcze stan przy przejsciu w obie strony.
//     this.renderer.shadowMap.autoUpdate = mode === "play";
//     this.renderer.shadowMap.needsUpdate = true;
//     if (mode === "menu") {
//       this.ignoredElevator = -1; this.resetInput();
//       this.playerState.x = this.level.start.x; this.playerState.y = this.level.start.y;
//       this.playerState.vx = 0; this.playerState.vy = 0; this.playerState.grounded = true; this.playerState.status = "running";
//       this.playerState.elapsedTime = 0; this.playerState.jumpCount = 0; this.playerState.score = 0; this.playerState.gemsCollected = 0;
//       this.playerState.smoothCamY = this.level.start.y; this.playerState.camLeadAngle = 0; this.playerState.idleTimer = 3;
//       this.gems.forEach((g) => { g.collected = false; if (g.mesh) g.mesh.visible = true; });
//       this.checkpoints.forEach((cp) => { cp.activated = false; }); this.activeCheckpoint = 0;
//       this.collapsingStairs.forEach((cs) => { cs.state = "idle"; cs.retractOffset = 0; cs.timer = 0; });
//       this.levers.forEach((l) => { l.extended = false; }); this.togglableStairs.forEach((ts) => { ts.extended = false; });
//       this.resetDome();
//     }
//   }

//   public restartGame() {
//     this.ignoredElevator = -1; this.resetInput();
//     this.playerState.x = this.level.start.x; this.playerState.y = this.level.start.y;
//     this.playerState.vx = 0; this.playerState.vy = 0; this.playerState.grounded = true; this.playerState.rideElevator = -1;
//     this.playerState.score = 0; this.playerState.gemsCollected = 0; this.playerState.jumpCount = 0; this.playerState.elapsedTime = 0;
//     this.playerState.camLeadAngle = 0; this.playerState.smoothCamY = this.level.start.y; this.playerState.knockdownFloorY = null;
//     this.playerState.currentStairTopY = null; this.playerState.enemyHitCooldown = 0; this.playerState.idleTimer = 2;
//     this.playerState.facingYaw = Math.atan2(Math.sin(stepToTheta(this.level.start.x)), Math.cos(stepToTheta(this.level.start.x)));
//     this.activeCheckpoint = 0; this.doorCooldown = 0;
//     this.collapsingStairs.forEach((cs) => { cs.state = "idle"; cs.retractOffset = 0; cs.timer = 0; });
//     this.levers.forEach((l) => { l.extended = false; }); this.togglableStairs.forEach((ts) => { ts.extended = false; });
//     this.gems.forEach((g) => { g.collected = false; if (g.mesh) g.mesh.visible = true; });
//     this.checkpoints.forEach((cp) => { cp.activated = false; if (cp.mesh) { const flagMesh = cp.mesh.children[1] as THREE.Mesh; if (flagMesh && flagMesh.material instanceof THREE.MeshStandardMaterial) { flagMesh.material.color.set("#ef4444"); flagMesh.material.emissive.set("#991b1b"); } } });
//     this.resetDome();
//     this.setGameStatus("running");
//   }

//   private resetDome() {
//     this.winPending = false; this.winPendingTimer = 0; this.domeShattered = false;
//     if (this.beaconDome) this.beaconDome.visible = true;
//     for (const shard of this.domeShards) { this.scene.remove(shard); shard.geometry.dispose(); (shard.material as THREE.Material).dispose(); }
//     this.domeShards = [];
//     if (this.trophy) {
//       this.trophy.userData.allGems = false;
//       const mat = this.trophy.material as THREE.MeshStandardMaterial;
//       mat.color.set("#94a3b8"); mat.emissive.set("#1f2937"); mat.emissiveIntensity = 0.15;
//     }
//   }

//   private resetInput() { this.input.left = false; this.input.right = false; this.input.up = false; this.input.down = false; this.input.jumpQueued = false; this.input.doorQueued = false; }

//   public dispose() {
//     soundEngine.clearAmbient();
//     this.player.dispose(); this.particles.dispose();
//     window.cancelAnimationFrame(this.animFrameId); window.removeEventListener("keydown", this.onKeyDown); window.removeEventListener("keyup", this.onKeyUp);
//     this.renderer.dispose(); if (this.renderer.domElement.parentElement) this.renderer.domElement.parentElement.removeChild(this.renderer.domElement);
//     this.scene.traverse((obj) => { if (obj instanceof THREE.Mesh) { obj.geometry.dispose(); if (Array.isArray(obj.material)) obj.material.forEach((m) => m.dispose()); else obj.material.dispose(); } });
//   }
// }















































































import * as THREE from "three";
import { Sky } from "three/addons/objects/Sky.js";
import { Water } from "three/addons/objects/Water.js";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { TowerCullingManager } from "./culling";
import { CheckpointFlag } from "./fx/CheckpointFlag";
import { FlagVisibility } from "./render/FlagVisibility";
import {
  CollapsingStairDef,
  DoorDef,
  LeverDef,
  TogglableStairDef,
  ElevatorDef,
  EngineConfig,
  GameStatus,
  GemDef,
  HazardDef,
  StairDef,
  SpringDef,
} from "./gameTypes";
import { PlayerRig } from "./player/PlayerRig";
import { CameraRig } from "./camera/CameraRig";
import { ParticleSystem, type ParticleMode } from "./fx/ParticleSystem";
import { ambientSpatial, collectAmbientSources } from "./audio/ambientSpatial";
import {
  RENDER_WIDTH,
  RENDER_HEIGHT,
  ASPECT_RATIO,
  BASE_VERTICAL_FOV,
  MAX_VERTICAL_FOV,
  CIRCUMFERENCE_STEPS,
  PLAYER_HALF_WIDTH,
  WALK_SPEED,
  JUMP_SPEED,
  GRAVITY,
  TOWER_RADIUS,
  TOWER_WALL_RADIUS,
  PLATFORM_THICKNESS,
  PLATFORM_DEPTH,
  TAU,
  PLAYER_STAND_RADIUS,
  FIRST_STEP_CENTER,
  PLAYER_HEIGHT,
  FIXED_DT,
  MAX_ACCUMULATOR,
  wrapValue,
  stepToTheta,
  stairIndexAt,
  stairCenterX,
  wrappedStepDistance,
} from "./constants";
// UWAGA FIX: celowo usunięto overlapsWrapped z importu.
// Mieszał konwencję (center,half,left,width) i prowokował podawanie
// środka jako lewej krawędzi -> przesunięcie hitboxa o width/2.
// Wszystkie testy poziome idą teraz przez wrappedStepDistance (symetrycznie).
import defaultLevelJson from "../levels/lvl_0001.level.json";
import { loadLevel } from "../levels/loadLevel";
import type { TowerLevelDefinition } from "../levels/levelTypes";
import {
  createElevatorMaterial,
  createElevatorRailMaterial,
  createEnemyMaterial,
  createStairsMaterial,
  createTowerMaterial,
  applyMossGradient,
  applyGemGlow,
  createCollapsingStairMaterial,
  createTogglableStairMaterial,
  createDoorFrameMaterial,
  createDoorMaterial
} from "../gameTextures";
import { soundEngine } from "../soundEngine";

export * from "./constants";

/** Odstep miedzy klatkami renderu w MENU (~30 Hz — patrz startLoop). */
const MENU_FRAME_MS = 32;

export const DEFAULT_LEVEL = loadLevel(defaultLevelJson);

interface PreparedStair extends StairDef {
  theta: number;
  radial: THREE.Vector3;
  tangLength: number;
  defaultMatrix: THREE.Matrix4;
  culledMatrix: THREE.Matrix4;
  wasVisible?: boolean;
}

function uniformTexelBox(
  width: number,
  height: number,
  depth: number,
  baseRepeat: [number, number]
): THREE.BoxGeometry {
  const g = new THREE.BoxGeometry(width, height, depth);
  const uvAttr = g.attributes.uv as THREE.BufferAttribute | undefined;
  if (!uvAttr) return g;
  const uv = uvAttr.array as Float32Array;
  const maxDim = Math.max(width, height, depth);
  if (maxDim <= 0) return g;
  const faceDims: [number, number][] = [
    [depth, height],
    [depth, height],
    [width, depth],
    [width, depth],
    [width, height],
    [width, height],
  ];
  for (let face = 0; face < 6; face++) {
    const [fw, fh] = faceDims[face];
    const repeatU = (baseRepeat[0] * fw) / maxDim;
    const repeatV = (baseRepeat[1] * fh) / maxDim;
    const offset = face * 8;
    for (let i = 0; i < 4; i++) {
      const ui = offset + i * 2;
      const vi = ui + 1;
      if (ui < 0 || vi >= uv.length) continue;
      uv[ui] = uv[ui] * repeatU;
      uv[vi] = uv[vi] * repeatV;
    }
  }
  uvAttr.needsUpdate = true;
  g.computeBoundingBox();
  g.computeBoundingSphere();
  return g;
}

export class GlowerTowerGame {
  private host: HTMLElement;
  public readonly level: TowerLevelDefinition;
  public readonly towerHeight: number;
  private renderer!: THREE.WebGLRenderer;
  private scene!: THREE.Scene;
  public camera!: THREE.PerspectiveCamera;
  private culler = new TowerCullingManager();
  private readonly flagVisibility = new FlagVisibility();
  private sceneMode: "menu" | "play" = "menu";
  private ambientAudioActive = false;
  /** Znacznik czasu ostatniego zebrania zrodel dzwieku (rytm 100 ms). */
  private ambientSourcesAt = 0;
  /** Ostatnio wyslane do HUD wartosci — wysylamy tylko to, co widoczne. */
  private hudLastSecond = -1;
  private hudLastFloor = -1;
  private hudLastScore = -1;
  private hudLastGems = -1;
  private hudLastJumps = -1;
  private hudLastStatus: GameStatus | null = null;
  private player!: PlayerRig;
  private cameraRig!: CameraRig;
  private particles!: ParticleSystem;
  private staticStairs: PreparedStair[] = [];
  private stairsInstancedMesh!: THREE.InstancedMesh;
  private towerMesh!: THREE.Mesh;
  /** Dolna kotwica gradientu osadu (pelna sila) — wspolna dla muru i stopni. */
  private get groundTintBottomY(): number { return this.waterLevel - 0.45; }
  /**
   * Gorna kotwica gradientu osadu (krycie 0). Pas ma ~5 j.: 0.45 j. ponizej
   * lustra (zlacze ukryte pod woda) i ~4.6 j. nad woda — dzieki temu czern,
   * nasycona zielen i zanik mieszcza sie w widocznej czesci sciany.
   */
  private get groundTintTopY(): number { return this.waterLevel + 4.6; }
  private floorMesh!: THREE.Mesh;
  private sky!: Sky;
  /** Ostatnio ustawiony rozmiar bufora rysowania (patrz setRenderResolution). */
  private renderWidth = -1;
  private renderHeight = -1;
  /** Nakładka diagnostyczna i jej akumulatory (tylko tryb dev). */
  /**
   * Krok fizyki. 1/120 zamiast FIXED_DT (1/60): przy renderze 56-60 Hz
   * akumulator okresowo zbierał DWA kroki w jednej klatce, co przesuwało
   * postać o podwójny dystans — widoczne jako szarpnięcie przy poprawnym
   * średnim FPS. Krótszy krok rozbija ten skok na dwa mniejsze.
   */
  private physicsStep = 1 / 120;
  private water!: Water;
  private composer?: EffectComposer;
  private renderPass!: RenderPass;
  private outputPass!: OutputPass;
  private bloomPass!: UnrealBloomPass;
  private sun = new THREE.Vector3();
  private readonly physicsRadial = new THREE.Vector3();
  private waterLevel = -1.2;
  private wasInWater = false;
  private waterEnterCooldown = 0;
  private topRing!: THREE.Mesh;
  private summitCrown!: THREE.Group;
  private beaconDome!: THREE.Mesh;
  private trophy!: THREE.Mesh;
  private domeShards: THREE.Mesh[] = [];
  private domeShattered = false;
  private winPending = false;
  private winPendingTimer = 0;
  private waterRipples: THREE.Mesh[] = [];
  private pmremGenerator!: THREE.PMREMGenerator;
  private elevators: ElevatorDef[] = [];
  private gems: GemDef[] = [];
  private springs: SpringDef[] = [];
  private hazards: HazardDef[] = [];
  private doors: DoorDef[] = [];
  private checkpoints: {
    id: number; floor: number; x: number; y: number; activated: boolean;
    mesh: THREE.Group; flag: THREE.Mesh; wave: CheckpointFlag; bounds: THREE.Sphere;
  }[] = [];
  private activeCheckpoint = 0;
  private doorCooldown = 0;
  private collapsingStairs: CollapsingStairDef[] = [];
  private levers: LeverDef[] = [];
  private togglableStairs: TogglableStairDef[] = [];
  private leverCooldown = 0;
  private ignoredElevator = -1;
  private sunLight!: THREE.DirectionalLight;

  private hemiLight!: THREE.HemisphereLight;

  public playerState = {
    x: FIRST_STEP_CENTER,
    y: 0.5,
    vx: 0, vy: 0, grounded: true, coyoteTimer: 0, jumpBufferTimer: 0,
    facingRight: true, rideElevator: -1, status: "running" as GameStatus,
    walkCycle: 0, score: 0, gemsCollected: 0, totalGems: 0, jumpCount: 0,
    elapsedTime: 0, camLeadAngle: 0, verticalLead: 0, smoothCamY: 0.5,
    idleTimer: 0, facingYaw: 0, jiggle: 0, jiggleVel: 0, crownFlash: 0,
    enemyHitCooldown: 0, knockdownFloorY: null as number | null,
    currentStairTopY: null as number | null,
  };

  public input = { left: false, right: false, up: false, down: false, jumpQueued: false, doorQueued: false };
  public config: EngineConfig = {
    cullingEnabled: true, simulatedFpsThrottle: 0, filterMode: "crisp",
    renderScale: 1, soundMuted: true, sfxEnabled: true, musicEnabled: true,
  };
  private accumulator = 0;
  private lastTime = performance.now();
  /** Znacznik czasu ostatniej klatki renderu w menu (patrz MENU_FRAME_MS). */
  private lastMenuRender = 0;
  private animFrameId = 0;
  private lastThrottleTime = performance.now();
  private playerHudTimer = 0;
  public onPlayerStateUpdate?: (playerState: typeof this.playerState) => void;
  public onGameStatusChange?: (status: GameStatus) => void;

  constructor(host: HTMLElement, level: TowerLevelDefinition = DEFAULT_LEVEL) {
    this.host = host;
    this.level = level;
    this.towerHeight = level.towerHeight;
    this.playerState.x = level.start.x;
    this.playerState.y = level.start.y;
    this.playerState.smoothCamY = level.start.y;
    this.playerState.idleTimer = 2;
    this.playerState.facingYaw = Math.atan2(
      Math.sin(stepToTheta(level.start.x)),
      Math.cos(stepToTheta(level.start.x))
    );
    this.culler.setTower(TOWER_WALL_RADIUS, -6, this.towerHeight);
    this.initThree();
    this.buildWorld();
    this.player = new PlayerRig(this.scene);
    this.cameraRig = new CameraRig(this.camera, this.towerHeight);
    this.particles = new ParticleSystem(this.scene, 250);
    this.applySceneShadows();
    this.setupEvents();
    this.warmUpRender();
    this.startLoop();
  }

  /**
   * Jeden "treningowy" render przy budowie poziomu — wykonuje cala pierwsza,
   * najdrozsza prace, zanim gracz cokolwiek zobaczy:
   *   * pierwszy przebieg mapy cienia (cala wieza, 1024 x 1024),
   *   * pierwsze odbicie wody (cala scena do tekstury odbicia),
   *   * pierwsze uzycie kazdego programu shaderow i zwiazane z tym bindowania.
   * Bez tego wszystko to spadalo na pierwszą klatkę rozgrywki — i dokladnie to
   * widac bylo jako jeden duzy uskok zaraz po wejsciu na poziom. Render idzie
   * w czasie budowy silnika, czyli pod warstwa ladowania, wiec jest niewidoczny.
   */
  private warmUpRender() {
    this.camera.position.set(Math.sin(0.6) * 30, this.towerHeight * 0.5, Math.cos(0.6) * 30);
    this.camera.lookAt(0, this.towerHeight * 0.5, 0);
    this.camera.updateMatrixWorld();
    this.renderer.render(this.scene, this.camera);
  }

  // ── FIX: jeden symetryczny test obwodowy dla całej gry ──
  // Zastępuje overlapsWrapped(px,pHalf,left,width).
  // Zwraca true gdy środki są bliżej niż suma połówek, z wrapem wieży.
  private overlapsCentered(ax: number, aHalf: number, bx: number, bHalf: number): boolean {
    return wrappedStepDistance(ax, bx) < aHalf + bHalf;
  }
  private elevatorCenterX(xLeft: number, width: number): number {
    return xLeft + width * 0.5;
  }

  private applySceneShadows() {
    const skyMesh = this.sky as unknown as THREE.Object3D | undefined;
    const waterMesh = this.water as unknown as THREE.Object3D | undefined;
    this.scene.traverse((obj) => {
      if (!(obj instanceof THREE.Mesh)) return;
      if (obj === skyMesh) return;
      if (obj === waterMesh) { obj.castShadow = false; obj.receiveShadow = true; return; }
      // MUR WIEZY: rzuca cien, ale go NIE ODBIERA. To najwieksza powierzchnia
      // w kadrze (walec na cala wysokosc), a kazdy jego fragment kosztowal probe
      // mapy cienia (5 odczytow Vogel-dysku) w KAZDYM z dwoch przebiegow klatki
      // — w widoku glownym i w odbiciu wody. Walec jest wypukly, wiec sam siebie
      // nie zacienia; tracone sa tylko drobne cienie rzucane NA sciane przez
      // przylegajace stopnie i mechanizmy.
      if (obj === this.towerMesh) { obj.castShadow = true; obj.receiveShadow = false; return; }
      if (obj.userData?.noShadow === true) { obj.castShadow = false; obj.receiveShadow = false; return; }
      const materials = Array.isArray(obj.material) ? obj.material : [obj.material];
      const isDecorative = materials.some(
        (m) => m instanceof THREE.MeshBasicMaterial || m.depthWrite === false
      );
      if (isDecorative) {
        obj.castShadow = false;
        obj.receiveShadow = !materials.some((m) => m instanceof THREE.MeshBasicMaterial);
        return;
      }
      obj.castShadow = true;
      obj.receiveShadow = true;
    });
  }

  private initThree() {
    this.scene = new THREE.Scene();
    this.scene.background = null;
    this.scene.fog = new THREE.FogExp2(0xcccccc, 0.00025);
    this.camera = new THREE.PerspectiveCamera(BASE_VERTICAL_FOV, ASPECT_RATIO, 0.1, 20000);
    this.camera.position.set(0, 5, 14);
    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance", stencil: false, depth: true });
    this.renderer.setPixelRatio(1);
    this.renderer.setSize(RENDER_WIDTH, RENDER_HEIGHT, false);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.renderer.shadowMap.autoUpdate = true;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 0.9;
    const canvas = this.renderer.domElement;
    canvas.id = "game-canvas-640x640";
    canvas.style.width = "100%";
    canvas.style.height = "100%";
    canvas.style.objectFit = "cover";
    canvas.style.display = "block";
    this.applyCanvasFilter();
    this.host.appendChild(canvas);
    // Globalne światło otoczenia: niebo świeci od góry, odbicie podłoża od dołu.
    // Oświetla całą scenę (mur, stopnie, windy, drzwi, wrogów). Wyższa wartość
    // rozjaśnia GÓRNE powierzchnie stopni i wypiera ich kolory, dlatego trzymamy
    // ją blisko wartości z repo (0.66).
    this.hemiLight = new THREE.HemisphereLight("#fffddb", "#34697b", 0.7);
    this.scene.add(this.hemiLight);
    this.sunLight = new THREE.DirectionalLight("#ffe999", 1.9);
    this.sunLight.castShadow = true;
    // 1024 zamiast 2048: przebieg mapy cienia renderuje CALA wieze (mur, wszystkie
    // instancje stopni, mechanizmy) i powtarza sie w kazdej klatce, niezaleznie od
    // tego, gdzie stoi gracz — dlatego obciazenie jest takie samo na gorze i na
    // dole wiezy. Zmniejszenie mapy daje 4x mniej pracy, a przy ciasnej kamerze
    // cienia (patrz buildWorld) teksel ma nadal ok. 10 cm, czyli cien pozostaje
    // ostry w tym kadrze.
    this.sunLight.shadow.mapSize.set(1024, 1024);
    // Wartości startowe; buildWorld() dopasowuje ortho do bryły wieży.
    // |bias| MUSI być mały: shader dodaje go do znormalizowanej głębokości
    // (near..far), więc duża wartość ujemna robi „przeciek światła” i jasny pas
    // przy krawędzi cienia.
    this.sunLight.shadow.camera = new THREE.OrthographicCamera(-64, 64, 64, -64, 0.1, 450);
    this.sunLight.shadow.bias = -0.00007;
    // Acne zbijane przesunięciem próby wzdłuż normalnej odbiornika — liczy to
    // vertex shader, więc nie kosztuje dodatkowego przebiegu.
    this.sunLight.shadow.normalBias = 0.12;
    // Radius w PCFShadowMap skaluje tylko offsety prób Vogel-dysku, więc
    // rozmycie krawędzi jest darmowe.
    this.sunLight.shadow.radius = 0.6;
    this.sunLight.target.position.set(0, 5, 0);
    this.scene.add(this.sunLight.target);
    this.sunLight.shadow.camera.position.copy(this.sunLight.position);
    this.sunLight.shadow.camera.lookAt(this.sunLight.target.position);
    this.sunLight.shadow.camera.updateProjectionMatrix();
    this.sunLight.shadow.needsUpdate = true;
    this.scene.add(this.sunLight);
    // UnrealBloomPass buduje piramidę render targetów i robi kilkanaście
    // przebiegów na klatkę, a koszt skaluje się wprost z rozdzielczością —
    // dlatego pracuje na małym buforze (rozmycie jest miękkie z założenia,
    // więc różnica jest niewidoczna).
    this.bloomPass = new UnrealBloomPass(new THREE.Vector2(160, 160), 0.01, 0.0, 0.24);
    // Przy strength 0.01 efekt tylko dokłada rozmyty nalot w jasnych partiach
    // (niebo, woda), więc jest wyłączony. Włączenie: enabled = true.
    this.bloomPass.enabled = false;
    // Kompozytor NIE jest tworzony w initThree. new EffectComposer(renderer)
    // alokuje od razu DWA render targety w rozmiarze klatki typu HalfFloatType
    // (~6,5 MB przy 640x640), ktore przy wylaczonym blooma sa kompletnie
    // bezuzyteczne — a kazdy taki bufor to zasob procesu GPU, ktory przegladarka
    // musi sledzic i utrzymywac (w Firefoksie widac to jako robote IPC na
    // ImageBridge). Tworzymy go leniwie w ensureComposer(), tylko gdy bloom
    // faktycznie dziala.
    this.renderPass = new RenderPass(this.scene, this.camera);
    this.outputPass = new OutputPass();
  }

  /** Kompozytor powstaje dopiero, gdy bloom jest wlaczony (patrz initThree). */
  private ensureComposer(): EffectComposer {
    if (!this.composer) {
      this.composer = new EffectComposer(this.renderer);
      this.composer.addPass(this.renderPass);
      this.composer.addPass(this.bloomPass);
      this.composer.addPass(this.outputPass);
      const size = new THREE.Vector2();
      this.renderer.getSize(size);
      this.composer.setSize(size.x, size.y);
    }
    return this.composer;
  }

  public applyCanvasFilter() {
    const canvas = this.renderer.domElement;
    if (this.config.filterMode === "crisp") {
      canvas.style.imageRendering = "pixelated";
      (canvas.style as unknown as { imageRendering: string }).imageRendering = "crisp-edges";
    } else canvas.style.imageRendering = "auto";
  }

  private buildWorld() {
    // Sfera nieba w scenie — jak w repo. Probna zamiana na wypieczona cubemape
    // (scene.background) zostala WYCOFANA: wypiek 256 px na sciane pokrywa 90
    // stopni, czyli ~2.8 teksela na stopien, a sfera renderuje sie w
    // rozdzielczosci ekranu (~7 px na stopien). Powierzchnia powiekszona 2.5x
    // dawala rozmytą, mleczną plame zamiast chmur, co czytalo sie jako mgla.
    // Chcesz taniej — trzeba zmienic shader chmur, nie rozdzielczosc tla.
    this.sky = new Sky();
    this.sky.scale.setScalar(10000);
    this.sky.frustumCulled = false;
    this.scene.add(this.sky);
    const skyUniforms = (this.sky as any).material.uniforms;
    const elevation = 33; const azimuth = 220;
    const phi = THREE.MathUtils.degToRad(90 - elevation);
    const theta = THREE.MathUtils.degToRad(azimuth);
    this.sun.setFromSphericalCoords(1, phi, theta);
    skyUniforms["turbidity"].value = 2.0;
    skyUniforms["rayleigh"].value = 1.0;
    skyUniforms["mieCoefficient"].value = 0.005;
    skyUniforms["mieDirectionalG"].value = 0.8;
    skyUniforms["sunPosition"].value.copy(this.sun);
    if (skyUniforms["cloudCoverage"]) {
      skyUniforms["cloudScale"].value = 0.0002;
      skyUniforms["cloudSpeed"].value = 0.00001;
      skyUniforms["cloudCoverage"].value = 0.4;
      skyUniforms["cloudDensity"].value = 0.4;
      skyUniforms["cloudElevation"].value = 0.5;
      skyUniforms["time"].value = 0;
    }
    if (skyUniforms["exposure"] !== undefined) skyUniforms["exposure"].value = 0.028;
    const sunDistance = 125;
    this.sunLight.position.copy(this.sun).multiplyScalar(sunDistance);
    this.sunLight.target.position.set(0, 5, 0);
    this.scene.add(this.sunLight.target);
    // ------------------------------------------------------------------------
    // KAMERA CIENIA dopasowana do bryły wieży.
    //
    // Bias cienia jest dodawany do ZNORMALIZOWANEJ głębokości fragmentu
    // (near..far kamery cienia), więc zależy od skali ortho: szeroka kamera
    // (240 j. i zakres 450 j.) zamienia bias −0.0005 na ~0.22 j. „przecieku”
    // światła, przez co cień odkleja się od rzucającej geometrii i na schodkach
    // pojawia się jasny pas przy murze. Ciasna ortho + minimalny bias + acne
    // tłumione przez normalBias (próba przesuwana wzdłuż NORMALNEJ odbiornika,
    // czyli na stopniu w górę, a nie w stronę muru) dają cień dochodzący do
    // ściany.
    // ------------------------------------------------------------------------
    const elevationCos = Math.max(0.2, Math.sqrt(Math.max(0, 1 - this.sun.y * this.sun.y)));
    // Ciasna ortho = mniejszy teksel przy tej samej rozdzielczości mapy, czyli
    // ostrzejszy cień bez dodatkowych fragmentów. Margines pokrywa koniec cienia
    // wieży rzucany na wodę.
    const shadowHalf = Math.max(
      24,
      (this.towerHeight - this.sunLight.target.position.y) * elevationCos + TOWER_WALL_RADIUS + PLATFORM_DEPTH + 2
    );
    const shadowCamera = this.sunLight.shadow.camera as THREE.OrthographicCamera;
    shadowCamera.left = -shadowHalf; shadowCamera.right = shadowHalf;
    shadowCamera.top = shadowHalf; shadowCamera.bottom = -shadowHalf;
    const lightDistance = this.sunLight.position.distanceTo(this.sunLight.target.position);
    shadowCamera.near = Math.max(1, lightDistance - shadowHalf * 1.6);
    shadowCamera.far = lightDistance + shadowHalf * 1.6;
    shadowCamera.lookAt(this.sunLight.target.position);
    shadowCamera.updateProjectionMatrix();
    // Duży normalBias przesuwa próbę cienia wzdłuż normalnej odbiornika: na
    // stopniu w górę, na murze na zewnątrz — nie robi więc jasnego pasa przy
    // ścianie, a usuwa pojedyncze jasne piksele (acne) na terminatorze cienia.
    this.sunLight.shadow.bias = -0.00007;
    this.sunLight.shadow.normalBias = 0.12;
    this.sunLight.shadow.radius = 0.6;
    this.sunLight.shadow.needsUpdate = true;

    // --- DOŚWIETLENIE CIENIA -------------------------------------------------
    // AmbientLight nie ma kierunku, więc nie może padać z żadnej strony ani
    // tworzyć refleksów (brak N·L), a jedynie podnosi najciemniejsze partie,
    // żeby było widać, gdzie się idzie. Kolor jest neutralny.
    const fill = new THREE.AmbientLight("#d5dbd8", 0.3);
    this.scene.add(fill);
    (this.sunLight as any).color = new THREE.Color("#ffe999");
    this.hemiLight.color = new THREE.Color("#fffddb");
    this.hemiLight.groundColor = new THREE.Color("#405080");
    try {
      this.pmremGenerator = new THREE.PMREMGenerator(this.renderer);
      const sceneEnv = new THREE.Scene();
      sceneEnv.add(this.sky.clone());
      const renderTarget = this.pmremGenerator.fromScene(sceneEnv);
      this.scene.environment = null;
      this.scene.environmentIntensity = 0;
      renderTarget.dispose();
    } catch { }
    const waterGeometry = new THREE.PlaneGeometry(12000, 12000);
    const textureLoader = new THREE.TextureLoader();
    const waterNormalsUrl = new URL("../textures/waternormals.jpg", import.meta.url).href;
    const waterNormals = textureLoader.load(waterNormalsUrl);
    waterNormals.wrapS = THREE.RepeatWrapping; waterNormals.wrapT = THREE.RepeatWrapping;
    this.water = new Water(waterGeometry, {
      // Rozdzielczosc odbicia NIEZMIENIONA (512) — jak w repo. Kazde zmniejszenie
      // tego bufora widac na fali, wiec zostaje oryginalna wartosc.
      textureWidth: 512, textureHeight: 512, waterNormals: waterNormals,
      sunDirection: this.sun.clone().normalize(), sunColor: 0x7F7F7F, waterColor: 0x555555,
      distortionScale: 0.8, fog: this.scene.fog !== undefined,
    });
    this.water.material.onBeforeCompile = (shader) => {
      shader.uniforms.uTowerRadius = { value: TOWER_WALL_RADIUS };
      shader.fragmentShader = shader.fragmentShader.replace("void main() {", `uniform float uTowerRadius;\nvoid main() {`);
      shader.fragmentShader = shader.fragmentShader.replace(
        "vec4 noise = getNoise( worldPosition.xz * size );",
        `vec4 noise = getNoise( worldPosition.xz * size );
        vec2 toTower = worldPosition.xz;
        float distToTower = length(toTower);
        vec2 outward = toTower / max(distToTower, 0.001);
        if (distToTower > uTowerRadius && distToTower < uTowerRadius + 26.0) {
          float d = distToTower - uTowerRadius;
          float dirVar = outward.x * 0.8 + outward.y * 0.6;
          float dirVar2 = outward.x * outward.y * 2.0;
          float decay = exp(-d * 0.18);
          float freq = 1.7 + 0.35 * dirVar;
          float refl = sin(d * freq - time * 2.6 + dirVar2 * 1.5)
                     + 0.4 * sin(d * 2.7 - time * 4.1 - dirVar * 2.0);
          noise.xy += outward * refl * 0.38 * decay;
          float chopDecay = exp(-d * 0.75);
          float chop = sin(d * 8.0 - time * 6.5 + dirVar * 2.5)
                     * sin(worldPosition.x * 1.8 - worldPosition.z * 1.4 + time * 4.5);
          vec2 tangential = vec2(-outward.y, outward.x);
          noise.xy += tangential * chop * 0.25 * chopDecay;
        }`
      );
    };
    // Odbicie wody zostaje DOKLADNIE takie, jak w Water.js — bez zadnych owijek
    // onBeforeRender. Water sam dba o koszt: w przebiegu odbicia ustawia
    // renderer.shadowMap.autoUpdate = false (Water.js:323) i przywraca stan po
    // renderze, wiec mapa cienia liczy sie RAZ na klatke (w widoku glownym),
    // a shader tafii uzywa tego samego cienia przez getShadowMask().
    // Poprzednia wlasna owijka przywracala autoUpdate = true na czas tego
    // przebiegu, czyli dokladala drugie liczenie calej mapy cienia na klatke —
    // i to ona, a nie sama woda, dawala skoki narastajace z czasem.
    this.water.rotation.x = -Math.PI / 2;
    this.water.position.y = this.waterLevel;
    this.floorMesh = this.water as unknown as THREE.Mesh;
    this.floorMesh.frustumCulled = false;
    this.floorMesh.receiveShadow = true;
    this.scene.add(this.water);
    const towerTotalHeight = this.towerHeight + 6;
    const towerWallRadius = TOWER_WALL_RADIUS;
    const towerWallMaterial = createTowerMaterial(undefined, towerWallRadius, towerTotalHeight);
    this.towerMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(TOWER_WALL_RADIUS, TOWER_WALL_RADIUS, towerTotalHeight, 48, 1, false),
      towerWallMaterial
    );
    this.towerMesh.position.y = this.towerHeight / 2 - 3;
    // Osad (podmokły mech/glony) na PIERWSZYM rzędzie kafli muru. Rząd ma
    // wysokość towerTotalHeight / repeatV (identycznie jak UV w createTowerMaterial).
    // Dół gradientu leży pod lustrem wody, więc złącza nie widać — osad wychodzi
    // spod wody i zanika do zera, w górnej krawędzi wchodząc w kolor Glutka.
    applyMossGradient(towerWallMaterial, {
      // UWAGA: woda three.js jest NIEPRZEZROCZYSTA (alpha = 1.0), wiec wszystko
      // ponizej lustra (-1.2) jest niewidoczne. Dlatego 0.45 j. ponizej lustra
      // kladziemy pelna sile osadu (zlacze ukryte pod woda), a reszta rampy leci
      // NAD woda: CZARNY pas przy linii wody -> ZIELEN Glutka -> zanik do zera.
      bottomY: this.groundTintBottomY,
      topY: this.groundTintTopY,
      waterY: this.waterLevel,
      // 2.0: krycie osadu w shaderze wygasa liniowo (1 - t) i JEDNOCZESNIE
      // przejscie w zielen konczy sie dopiero przy t = 0.9, wiec przy 1.0 tinta
      // nigdy nie osiaga pelnej sily nad woda i wieza wyglada na slabo zielona.
      // Wartosc 2.0 nasyca krycie (clamp) w dolnej polowie pasa, wiec przy wodzie
      // widac czern, a kilkanascie jednostek wyzej pelna zielen Glutka.
      strength: 2.0,
      wet: 0.9,
      // Gradient CZARNY -> ZIELONY Glutka (bez szarego albedo — to dawalo plamy).
      mudColor: "#000000",
      slimeColor: "#4ade80", // kraniec ZIELONY = kolor Glutka
      // 0.06: minimalna podłoga albedo, żeby czarny koniec gradientu nie był
      // zerem (0 × światło = 0). Wyższa wartość wypiera czerń zielENIĄ i rampą
      // przestaje być czytelna.
      shadowFloor: 0.06,
    });
    // receiveShadow ustawia applySceneShadows() — dla muru celowo na false.
    this.towerMesh.castShadow = true; this.towerMesh.frustumCulled = false;
    this.scene.add(this.towerMesh);
    const foamRing = new THREE.Mesh(
      new THREE.TorusGeometry(TOWER_WALL_RADIUS + 0.14, 0.06, 10, 48),
      // Bylo: szary/popielaty pasek (#d6ecff, opacity 0.18) dookola wiezy na
      // poziomie wody. Teraz: CZARNY pas przy podstawie wiezy.
      new THREE.MeshStandardMaterial({ color: "#000000", roughness: 0.92, transparent: true, opacity: 0.35, depthWrite: false })
    );
    foamRing.rotation.x = Math.PI / 2; foamRing.position.y = this.waterLevel + 0.04; foamRing.renderOrder = 1;
    this.scene.add(foamRing);
    this.topRing = new THREE.Mesh(
      new THREE.TorusGeometry(TOWER_RADIUS - 0.5, 0.25, 14, 64),
      new THREE.MeshStandardMaterial({ color: "#fbbf24", emissive: "#d97706", emissiveIntensity: 0.18, roughness: 0.5, metalness: 0.8 })
    );
    this.topRing.position.y = this.towerHeight + 0.6; this.topRing.rotation.x = Math.PI / 2; this.topRing.castShadow = true;
    this.scene.add(this.topRing);
    this.summitCrown = new THREE.Group(); this.summitCrown.position.y = this.towerHeight;
    const beaconDome = new THREE.Mesh(
      new THREE.SphereGeometry(3.2, 24, 16, 0, Math.PI * 2, 0, Math.PI * 0.5),
      new THREE.MeshStandardMaterial({ color: "#7dd3fc", emissive: "#075985", emissiveIntensity: 0.12, transparent: true, opacity: 0.36, roughness: 0.08, metalness: 0.12, envMapIntensity: 1.2, depthWrite: false, side: THREE.DoubleSide })
    );
    this.beaconDome = beaconDome; this.summitCrown.add(beaconDome);
    const trophyGeo = new THREE.OctahedronGeometry(1.1, 0);
    const trophyMaterial = new THREE.MeshStandardMaterial({ color: "#94a3b8", emissive: "#1f2937", emissiveIntensity: 0.15, metalness: 0.85, roughness: 0.25 });
    const victoryTrophy = new THREE.Mesh(trophyGeo, trophyMaterial);
    victoryTrophy.position.y = 1.35; victoryTrophy.name = "victoryTrophy"; victoryTrophy.userData = { allGems: false };
    this.trophy = victoryTrophy; this.summitCrown.add(victoryTrophy); this.scene.add(this.summitCrown);
    this.buildStairs(); this.buildElevators(); this.buildSprings(); this.buildGems();
    this.buildHazards(); this.buildCheckpoints(); this.buildDoors();
    this.buildCollapsingStairs(); this.buildLeversAndTogglableStairs();
    this.prewarmSummitShaders();
    this.uploadSceneTextures();
  }

  private prewarmSummitShaders() {
    const wasTopVisible = this.topRing.visible; const wasCrownVisible = this.summitCrown.visible;
    this.topRing.visible = true; this.summitCrown.visible = true;
    const renderer = this.renderer as THREE.WebGLRenderer & { compileAsync?: (scene: THREE.Scene, camera: THREE.Camera) => Promise<void> };
    if (renderer.compileAsync) renderer.compileAsync(this.scene, this.camera).finally(() => { this.topRing.visible = wasTopVisible; this.summitCrown.visible = wasCrownVisible; });
    else { renderer.compile(this.scene, this.camera); this.topRing.visible = wasTopVisible; this.summitCrown.visible = wasCrownVisible; }
  }

  /**
   * Wgrywa WSZYSTKIE tekstury na GPU od razu po zbudowaniu świata.
   *
   * Dlaczego to jest potrzebne: compile()/compileAsync() kompilują programy
   * shaderów (zbiera materiały przez scene.traverse, więc także z obiektów
   * ukrytych przez culling), ale NIE wgrywają obrazów. Tekstura leci na kartę
   * dopiero w klatce, w której obiekt z tym materiałem jest faktycznie rysowany
   * — plus generowane są wtedy mipmapy. Dlatego pierwsze pojawienie się wroga
   * (ENEMY_col/nrm) albo windy (lift/STEP_col.png/nrm) powodowało wyraźne
   * cięcie: to był upload kilkuset kB obrazu w środku klatki.
   * renderer.initTexture() robi ten upload od razu, w czasie budowy świata.
   */
  private uploadSceneTextures() {
    const textures = new Set<THREE.Texture>();
    const slots = ["map", "normalMap", "emissiveMap", "roughnessMap", "metalnessMap", "alphaMap", "aoMap", "bumpMap"] as const;
    this.scene.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (!mesh.isMesh && !(obj as THREE.Points).isPoints && !(obj as THREE.Sprite).isSprite) return;
      const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      for (const material of materials) {
        if (!material) continue;
        for (const slot of slots) {
          const texture = (material as unknown as Record<string, THREE.Texture | null>)[slot];
          if (texture && texture.isTexture) textures.add(texture);
        }
      }
    });
    for (const texture of textures) this.renderer.initTexture(texture);
  }

  private buildStairs() {
    const towerMidRadius = TOWER_RADIUS + PLATFORM_DEPTH * 0.5;
    const stepArcLength = (TAU * TOWER_RADIUS) / CIRCUMFERENCE_STEPS;
    const slots = new Map<string, { id: string; stepX: number; topY: number }>();
    const addSlot = (id: string, x: number, topY: number) => {
      const stepX = stairIndexAt(x); const key = `${stepX}@${topY.toFixed(3)}`;
      if (!slots.has(key)) slots.set(key, { id, stepX, topY });
    };
    for (const stair of this.level.stairs) {
      const count = Math.max(1, Math.floor(stair.count ?? 1));
      for (let i = 0; i < count; i++) addSlot(count > 1 ? `${stair.id}#${i}` : stair.id, stair.x + i, stair.topY);
    }
    for (const door of this.level.doors) addSlot(`${door.id}-stair`, door.x, door.topY);
    for (const cp of this.level.checkpoints) addSlot(`checkpoint-${cp.id}-stair`, cp.x, cp.y);
    const prepared: PreparedStair[] = [];
    for (const slot of slots.values()) {
      const theta = stepToTheta(stairCenterX(slot.stepX));
      const radial = new THREE.Vector3(Math.sin(theta), 0, Math.cos(theta));
      const pos = new THREE.Vector3(radial.x * towerMidRadius, slot.topY - PLATFORM_THICKNESS * 0.5, radial.z * towerMidRadius);
      const quat = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, theta, 0));
      const scale = new THREE.Vector3(stepArcLength * 1.02, 1, 1);
      prepared.push({
        id: slot.id, x: slot.stepX, topY: slot.topY, width: 1,
        theta, radial, tangLength: stepArcLength,
        defaultMatrix: new THREE.Matrix4().compose(pos, quat, scale),
        culledMatrix: new THREE.Matrix4().compose(pos, quat, new THREE.Vector3(0, 0, 0)),
        wasVisible: true,
      });
    }
    this.staticStairs = prepared;
    const stairWidth = stepArcLength * 1.02;
    const stairGeo = uniformTexelBox(stairWidth, PLATFORM_THICKNESS, PLATFORM_DEPTH, [0.8, 0.8]);
    const stairGeoUnit = uniformTexelBox(1, PLATFORM_THICKNESS, PLATFORM_DEPTH, [0.8, 0.8]);
    const stairMat = createStairsMaterial();
    // Pierwsze stopnie (do wysokosci gradientu) tintowane TA SAMA metoda, co
    // zapadnie i schodki przelaczane: kolor MNOZY mape STEP_col, wiec tekstura
    // stopnia zostaje widoczna. Kolor idzie od tinty CZARNEGO na parterze do
    // ZIELENI Glutka, a krycie maleje do 0 — dyskretnie, kwantyzacja co 0.5
    // pietra, wiec kazdy stopien ma jeden skokowy odcien. Ta sama para kotwic,
    // co mur -> kolor odpowiada wysokosci w gradiencie sciany.
    applyMossGradient(stairMat, {
      bottomY: this.groundTintBottomY,
      topY: this.groundTintTopY,
      waterY: this.waterLevel,
      // 2.0: jak na murze — nasyca krycie w dolnej polowie pasa, wiec dolne
      // stopnie sa czarne, a wyzej widac pelna zielen Glutka.
      strength: 2.0,
      wet: 0.9,
      quantizeStep: 0.5,
      mudColor: "#000000", // parter: czarna tinta (jak w zamowieniu)
      slimeColor: "#4ade80", // gora pasa: zielen Glutka przy kryciu 0
      // 0.08: jak na murze — dolny stopień ma być czarny, nie zielonkawy.
      shadowFloor: 0.08,
    });
    this.stairsInstancedMesh = new THREE.InstancedMesh(stairGeoUnit, stairMat, prepared.length);
    this.stairsInstancedMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.stairsInstancedMesh.castShadow = true; this.stairsInstancedMesh.receiveShadow = true; this.stairsInstancedMesh.frustumCulled = false;
    prepared.forEach((stair, idx) => { this.stairsInstancedMesh.setMatrixAt(idx, stair.defaultMatrix); });
    this.stairsInstancedMesh.instanceMatrix.needsUpdate = true;
    this.scene.add(this.stairsInstancedMesh);
    stairGeo.dispose();
  }

  private buildElevators() {
    const elevatorSpecs = this.level.elevators;
    // Ten sam srodek bryly co schodki: kazdy schodek stoi na promieniu
    // TOWER_RADIUS + PLATFORM_DEPTH/2 (buildStairs: towerMidRadius).
    const towerMidRadius = TOWER_RADIUS + PLATFORM_DEPTH * 0.5;
    const stepArcLength = (TAU * TOWER_RADIUS) / CIRCUMFERENCE_STEPS;
    // IDENTYCZNE wymiary jak schodek: ta sama szerokosc (jeden slot * 1.02,
    // dokladnie jak stairGeo), ta sama grubosc i ta sama glebokosc.
    const elevWidth = stepArcLength * 1.02;
    const elevHeight = PLATFORM_THICKNESS; const elevDepth = PLATFORM_DEPTH;
    const elevGeo = uniformTexelBox(elevWidth, elevHeight, elevDepth, [0.8, 0.8]);
    const railThickness = PLATFORM_THICKNESS; const railMat = createElevatorRailMaterial();
    elevatorSpecs.forEach((spec) => {
      // Środek bierze się z siatki schodków (floor(x) + 0.5), tak sam jak dla
      // stopni statycznych — winda trafia dokładnie w swoje korytko.
      const centerX = stairCenterX(stairIndexAt(spec.x));
      const theta = stepToTheta(centerX);
      const radial = new THREE.Vector3(Math.sin(theta), 0, Math.cos(theta));
      const elevMat = createElevatorMaterial();
      const mesh = new THREE.Mesh(elevGeo, elevMat);
      mesh.castShadow = true; mesh.receiveShadow = true; mesh.frustumCulled = true; mesh.rotation.y = theta;
      mesh.position.set(radial.x * towerMidRadius, spec.yMin - PLATFORM_THICKNESS * 0.5, radial.z * towerMidRadius);
      this.scene.add(mesh);
      // FIZYKA DOSTAJE TE SAMA BRYLE CO WIZUAL: srodek = centerX, szerokosc =
      // jeden slot (elevatorCenterX liczy x + width/2, tak jak dla schodkow
      // staticStairs trzymaja x = indeks slotu i width = 1).
      this.elevators.push({ ...spec, x: centerX - 0.5, width: 1, mesh, currentTopY: spec.yMin, theta });
      const railTravel = spec.yMax - spec.yMin;
      const railGeo = new THREE.BoxGeometry(railThickness, railTravel, railThickness);
      const rail = new THREE.Mesh(railGeo, railMat);
      rail.rotation.y = theta;
      const railRadius = TOWER_RADIUS + railThickness * 0.5;
      rail.position.set(radial.x * railRadius, (spec.yMin + spec.yMax) / 2, radial.z * railRadius);
      rail.receiveShadow = true; this.scene.add(rail);
    });
  }

  private buildSprings() {
    this.level.springs.forEach((sp) => {
      // FIX: level trzyma lewą krawędź, visual i logika muszą używać środka.
      const centerX = sp.x + 0.5;
      const theta = stepToTheta(centerX);
      const radial = new THREE.Vector3(Math.sin(theta), 0, Math.cos(theta));
      const springGroup = new THREE.Group();
      const baseMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.5, 0.15, 16), new THREE.MeshStandardMaterial({ color: "#ef4444", metalness: 0.6, roughness: 0.3 }));
      baseMesh.position.y = sp.topY + 0.08; springGroup.add(baseMesh);
      // Gorna tarcza spreżyny: kolor Gluta (#4ade80 — ten sam hex co gelMat
      // w PlayerRig) i DOKLADNIE te same parametry odbicia co podstawa
      // (metalness 0.6, roughness 0.3). Wczesniej bylo metalness 0.8 + emissive
      // 0.6, a przy scene.environment = null metal bez odbicia traci diffuse
      // i wyglada matowo — a emisja dodatkowo splaszczala powierzchnie.
      const padMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 0.1, 16), new THREE.MeshStandardMaterial({ color: "#4ade80", metalness: 0.6, roughness: 0.3 }));
      padMesh.position.y = sp.topY + 0.18; springGroup.add(padMesh);
      springGroup.position.set(radial.x * PLAYER_STAND_RADIUS, 0, radial.z * PLAYER_STAND_RADIUS);
      springGroup.rotation.y = theta; this.scene.add(springGroup);
      // FIX: zapisujemy środek, nie lewą krawędź - kolizja jest symetryczna.
      this.springs.push({ ...sp, x: centerX, mesh: baseMesh, theta, cooldown: 0 });
    });
  }

  private buildGems() {
    const gemGeo = new THREE.OctahedronGeometry(0.32, 0);
    // Klejnoty maja lsnic jak szlif, nie jak plaskie plamy:
    //  - metalness 0.05 (bez tego metal bez envMap nie ma ani diffuse, ani
    //    specularu i w cieniu zostawal sam obrys),
    //  - chropowatosc 0.08 daje ostry refleks slonca, ktory iskrzy sie na
    //    kolejnych scianach szlifu,
    //  - flatShading: kazda sciana szlifu ma wlasna normalna, wiec widac bryle,
    //  - applyGemGlow dorzuca tania poswiate zalezna od sciany (w cieniu tez
    //    widac ksztalt, a nie sam obrys).
    const gemMat = new THREE.MeshStandardMaterial({
      // KOLORY Z REPO — nie zmieniamy barwy klejnotu (albedo i emisja jak było).
      color: "#f59e0b",
      emissive: "#d97706",
      emissiveIntensity: 0.6,
      roughness: 0.08,
      metalness: 0.05,
      flatShading: true,
    });
    // Poswiata szlifu w barwie emisji repo — zadnego nowego odcienia.
    applyGemGlow(gemMat, { coreColor: "#d97706", glow: 1.0 });
    this.playerState.totalGems = this.level.gems.length;
    this.level.gems.forEach((pt) => {
      // pt.x to już środek (visual bez +0.5) - zostawiamy jako środek.
      const theta = stepToTheta(pt.x);
      const radial = new THREE.Vector3(Math.sin(theta), 0, Math.cos(theta));
      // UWAGA: jeden WSPOLNY material dla wszystkich klejnotow. Material.clone()
      // nie przenosi instancyjnego onBeforeCompile (three/Material.js), wiec
      // klony zgubilyby szlif z applyGemGlow.
      const mesh = new THREE.Mesh(gemGeo, gemMat);
      mesh.castShadow = true; mesh.frustumCulled = true;
      mesh.position.set(radial.x * PLAYER_STAND_RADIUS, pt.y, radial.z * PLAYER_STAND_RADIUS);
      this.scene.add(mesh);
      this.gems.push({ id: pt.id, x: pt.x, y: pt.y, mesh, collected: false, theta });
    });
  }

  private findEnemyLandingX(fromX: number, topY: number, moveSteps: number, direction: -1 | 1): number {
    if (moveSteps <= 0) return stairCenterX(stairIndexAt(fromX));
    const fromSlot = stairIndexAt(fromX);
    const candidates = [direction, -direction] as const;
    for (const dir of candidates) {
      // FIX: fromSlot to już indeks, wrapujemy arytmetycznie, nie przez stairIndexAt(indeks).
      const targetSlot = wrapValue(fromSlot + dir * moveSteps, CIRCUMFERENCE_STEPS);
      // Zwykła pętla zamiast .some(domknięcie): ta funkcja jest wołana przy
      // każdym odbiciu każdej piłki, a domknięcie = nowy obiekt dla GC.
      let exists = false;
      for (const stair of this.staticStairs) {
        if (stairIndexAt(stair.x) === targetSlot && Math.abs(stair.topY - topY) < 0.2) { exists = true; break; }
      }
      if (exists) return stairCenterX(targetSlot);
    }
    return stairCenterX(fromSlot);
  }

  private buildHazards() {
    const hazardSpecs = this.level.enemies;
    const enemyMat = createEnemyMaterial();
    // TEKSTURY SA TERAZ WSPOLDZIELONE (cache w gameTextures), a ten blok zmienia
    // ich repeat/center/flipY — bez klonowania psulby takze inne materialy
    // korzystajace z ENEMY_col/ENEMY_nrm. Poza tym flipY ustawiony PO uploadzie
    // wymusza reinterpretacje obrazu, przez co kulka wychodzila przyciemniona.
    // Klon dzieli dane obrazu, ale ma wlasne ustawienia (zero dodatkowego
    // dekodowania, zero dodatkowej tekstury na GPU).
    if (enemyMat.map) {
      const map = enemyMat.map.clone();
      map.wrapS = THREE.RepeatWrapping; map.wrapT = THREE.RepeatWrapping;
      map.repeat.set(0.6, 0.6); map.offset.set(0, 0); map.center.set(0.5, 0.5); map.rotation = 0;
      map.flipY = false; map.needsUpdate = true;
      enemyMat.map = map;
    }
    if (enemyMat.normalMap) {
      const normalMap = enemyMat.normalMap.clone();
      normalMap.wrapS = THREE.RepeatWrapping; normalMap.wrapT = THREE.RepeatWrapping;
      normalMap.repeat.set(0.6, 0.6); normalMap.offset.set(0, 0); normalMap.center.set(0.5, 0.5); normalMap.rotation = 0;
      normalMap.flipY = false; normalMap.needsUpdate = true;
      enemyMat.normalMap = normalMap;
    }
    const orbGeo = new THREE.SphereGeometry(0.32, 14, 14);
    const playerJumpHeight = (JUMP_SPEED * JUMP_SPEED) / (2 * GRAVITY);
    const defaultBallBounceHeight = playerJumpHeight * 0.5;
    hazardSpecs.forEach((spec) => {
      const behavior = spec.behavior ?? "bounce";
      const amplitude = spec.amplitude ?? defaultBallBounceHeight;
      const speed = spec.speed ?? 1.2;
      const slot = stairIndexAt(spec.xCenter);
      let baseY = spec.y;
      for (const plat of this.staticStairs) { if (stairIndexAt(plat.x) === slot && Math.abs(plat.topY - spec.y) < 0.75) { baseY = plat.topY; break; } }
      const enemyX = stairCenterX(slot);
      const moveSteps = Math.max(0, Math.floor(spec.moveSteps ?? 0));
      const direction: -1 | 1 = spec.direction === -1 ? -1 : 1;
      const naturalFlightTime = 2 * Math.sqrt((2 * amplitude) / GRAVITY);
      const bounceDuration = naturalFlightTime / Math.max(0.25, speed);
      const targetX = this.findEnemyLandingX(enemyX, baseY, moveSteps, direction);
      const mesh = new THREE.Mesh(orbGeo, enemyMat);
      mesh.castShadow = true; mesh.receiveShadow = true; mesh.frustumCulled = true;
      mesh.userData.spinAxis = new THREE.Vector3(0, 0, 1);
      mesh.userData.spinSpeed = (speed ?? 1.2) * 0.8;
      this.scene.add(mesh);
      this.hazards.push({ id: spec.id, x: enemyX, y: spec.y, behavior, amplitude, speed, currentX: enemyX, bounceElapsed: 0, bounceDuration, bounceBaseY: baseY, bounceFromX: enemyX, bounceToX: targetX, moveSteps, direction, mesh, theta: stepToTheta(enemyX) });
    });
  }

  private buildLeversAndTogglableStairs() {
    var armLen = 0.7; var armGeo = new THREE.BoxGeometry(0.06, 0.06, armLen); var ballGeo = new THREE.SphereGeometry(0.08, 8, 8);
    var redMat = new THREE.MeshStandardMaterial({ color: "#ef4444", emissive: "#7f1d1d", emissiveIntensity: 0.9, roughness: 0.1, metalness: 0.6 });
    this.level.levers.forEach((spec) => {
      // FIX: normalizacja do środka stopnia - visual i trigger w tym samym miejscu.
      const centerX = stairCenterX(stairIndexAt(spec.x));
      var theta = stepToTheta(centerX);
      var radial = new THREE.Vector3(Math.sin(theta), 0, Math.cos(theta));
      var group = new THREE.Group();
      var armGroup = new THREE.Group(); armGroup.name = "armGroup";
      var arm = new THREE.Mesh(armGeo, new THREE.MeshStandardMaterial({ color: "#cbd5e1", emissive: "#475569", emissiveIntensity: 0.4, metalness: 0.5, roughness: 0.3 }));
      arm.position.set(0, 0, armLen / 2); armGroup.add(arm);
      var ball = new THREE.Mesh(ballGeo, redMat.clone()); ball.position.set(0, 0, armLen); ball.userData = { isBall: true }; armGroup.add(ball);
      armGroup.rotation.x = -0.6; group.add(armGroup);
      // Referencje do animowanych części zapisane RAZ, przy budowie. Wcześniej
      // pętla fizyki szukała ich przez children.find(function …) przy KAŻDYM
      // podkroku — czyli tworzyła dwie nowe domknięcia na dźwignię na krok
      // (60-300 obiektów/s przy pełnym obciążeniu) i dokładała pracy GC.
      group.userData.armGroup = armGroup;
      group.userData.ball = ball;
      group.position.set(radial.x * TOWER_RADIUS, spec.topY + 1.2, radial.z * TOWER_RADIUS);
      group.rotation.y = theta; this.scene.add(group);
      this.levers.push({ id: spec.id, x: centerX, topY: spec.topY, theta, mesh: group, extended: false });
    });
    const sAL = (TAU * TOWER_RADIUS) / CIRCUMFERENCE_STEPS;
    const tsWidth = sAL * 1.02;
    // TA SAMA BRYLA I SIATKA UV CO SCHODEK STATYCZNY. Schodki statyczne to
    // instancje jednostkowej bryly (szerokosc 1) rozciagnietej w X macierza
    // instancji, wiec ich UV w U wynosi 0.8 * 1 / 2.4 = 0.33. Tutaj szerokosc
    // byla zapiekana w geometrie (tsWidth = 1.6), przez co UV w U roslo do
    // 0.53, czyli tekstura i normalna mapa byly ~1.6x gesciej -> inny wyglad
    // ("inaczej nalozona tekstura, plaski stopien"). Teraz skalujemy mesch w X
    // tak samo jak instancje i UV jest identyczne.
    const tsGeo = uniformTexelBox(1, PLATFORM_THICKNESS, PLATFORM_DEPTH, [0.8, 0.8]);
    this.level.togglableStairs.forEach((spec) => {
      const theta = stepToTheta(stairCenterX(stairIndexAt(spec.x)));
      const radial = new THREE.Vector3(Math.sin(theta), 0, Math.cos(theta));
      const group = new THREE.Group();
      const mat = createTogglableStairMaterial();
      // Schodki CHOWANE: zachowuja tinte stanu dzwigni (zielony wysuniety /
      // czerwony schowany) i sa ona przyciemniane, im bardziej mokro — czyli
      // im nizej na gradiencie. Nad pasem gradientu wracaja do pelnej jasnosci,
      // a w pasie lsnia mokro tak samo jak mur. Material jest osobny dla
      // kazdego schodka, wiec kazdy dostaje wlasny zestaw uniformow.
      applyMossGradient(mat, {
        mode: "darken",
        bottomY: this.groundTintBottomY,
        topY: this.groundTintTopY,
        waterY: this.waterLevel,
        // 2.0: jak na stopniach statycznych — te schodki musza byc tak samo
        // ciemne w pasie, a kolor stanu dzwigni pozostaje rozroznialny (0.25).
        strength: 2.0,
        wet: 0.9,
        darkMin: 0.25,
      });
      const mesh = new THREE.Mesh(tsGeo, mat);
      // Skala X = szerokosc stopnia (jak macierz instancji schodkow statycznych),
      // wiec i rozmiar, i UV sa identyczne jak na zwyklym schodku.
      mesh.scale.set(tsWidth, 1, 1);
      mesh.castShadow = true; mesh.receiveShadow = true; group.add(mesh);
      group.position.set(radial.x * (TOWER_RADIUS - 0.8), spec.topY - PLATFORM_THICKNESS * 0.5, radial.z * (TOWER_RADIUS - 0.8));
      group.rotation.y = theta; this.scene.add(group);
      this.togglableStairs.push({ id: spec.id, x: stairCenterX(stairIndexAt(spec.x)), topY: spec.topY, leverId: spec.leverId, theta, mesh: group, extended: false, retractOffset: 0 });
    });
  }

  private buildCollapsingStairs() {
    const mat = createCollapsingStairMaterial();
    // ZAPADNIE (schodki zapadajace sie): ten sam gradient co schodki statyczne
    // — tinta czarny -> zielen Glutka, dyskretnie co pol pietra, z kryciem
    // malejacym do zera i mokrym polyskiem (mossWetness) identycznym jak mur.
    applyMossGradient(mat, {
      bottomY: this.groundTintBottomY,
      topY: this.groundTintTopY,
      waterY: this.waterLevel,
      strength: 2.0, // jak na stopniach: nasycona zielen nad woda
      wet: 0.9,
      quantizeStep: 0.5,
      mudColor: "#000000",
      slimeColor: "#4ade80",
      shadowFloor: 0.08, // jak na zwykłych stopniach: czerń na dnie gradientu
    });
    const sAL = (TAU * TOWER_RADIUS) / CIRCUMFERENCE_STEPS;
    const csWidth = sAL * 1.02;
    // Jak dla schodkow przelaczanych: jednostkowa bryla + skala X, zeby siatka
    // UV byla dokladnie taka sama jak na schodku statycznym.
    const csGeo = uniformTexelBox(1, PLATFORM_THICKNESS, PLATFORM_DEPTH, [0.8, 0.8]);
    this.level.collapsingStairs.forEach((spec) => {
      const centerX = stairCenterX(stairIndexAt(spec.x));
      const theta = stepToTheta(centerX);
      const radial = new THREE.Vector3(Math.sin(theta), 0, Math.cos(theta));
      const group = new THREE.Group();
      const mesh = new THREE.Mesh(csGeo, mat);
      mesh.scale.set(csWidth, 1, 1);
      mesh.castShadow = true; mesh.receiveShadow = true; group.add(mesh);
      group.position.set(radial.x * PLAYER_STAND_RADIUS, spec.topY - PLATFORM_THICKNESS * 0.5, radial.z * PLAYER_STAND_RADIUS);
      group.rotation.y = theta; this.scene.add(group);
      this.collapsingStairs.push({ id: spec.id, x: centerX, topY: spec.topY, theta, mesh: group, state: "idle", timer: 0, retractOffset: 0 });
    });
  }

  private buildCheckpoints() {
    // Kijek flagi jest DREWNIANY: dokladnie ta sama tekstura co prowadnica
    // windy (createElevatorRailMaterial deleguje tutaj) i rama drzwi
    // teleportacyjnych. Jedna instancja materialu dla wszystkich checkpointow;
    // powtarzamy teksture 1x po obwodzie i 3x po wysokosci cienkiego słupka,
    // zeby sloje biegly wzdluz kija (domyslne 0.5/0.9 jest strojone pod
    // prostokatna rame drzwi).
    // Uwaga: harness testow repo uruchamia te buildery takze w Node (bez DOM),
    // a TextureLoader potrzebuje document.createElementNS — dlatego poza
    // przegladarka bierzemy zwykly drewniany kolor zamiast tekstury.
    const poleMaterial =
      typeof document === "undefined"
        ? new THREE.MeshStandardMaterial({ color: "#8a6d4a", roughness: 0.9, metalness: 0.05 })
        : createDoorFrameMaterial();
    // Rama drzwi używa tego samego pliku z innym repeat, a tekstury są
    // współdzielone (cache w gameTextures) — dlatego kij dostaje własne kopie
    // (Texture.clone() dzieli obraz, ale ma osobny repeat/offset).
    if (poleMaterial.map) {
      poleMaterial.map = poleMaterial.map.clone();
      poleMaterial.map.wrapS = THREE.RepeatWrapping; poleMaterial.map.wrapT = THREE.RepeatWrapping;
      poleMaterial.map.repeat.set(1, 3); poleMaterial.map.needsUpdate = true;
    }
    if (poleMaterial.normalMap) {
      poleMaterial.normalMap = poleMaterial.normalMap.clone();
      poleMaterial.normalMap.wrapS = THREE.RepeatWrapping; poleMaterial.normalMap.wrapT = THREE.RepeatWrapping;
      poleMaterial.normalMap.repeat.set(1, 3); poleMaterial.normalMap.needsUpdate = true;
    }
    this.level.checkpoints.forEach((cp) => {
      const cpX = stairCenterX(stairIndexAt(cp.x));
      const theta = stepToTheta(cpX);
      const radial = new THREE.Vector3(Math.sin(theta), 0, Math.cos(theta));
      const group = new THREE.Group();
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 1.8, 8), poleMaterial);
      pole.position.y = cp.y + 0.9; pole.castShadow = true; pole.receiveShadow = true; group.add(pole);
      const wave = new CheckpointFlag();
      // Flaga: emissiveIntensity bylo 0.3, wiec stala poswiata wyrownujaca
      // jasnosc — flaga wygladala identycznie w cieniu i w sloncu. Teraz
      // poswiata jest sladowa (0.15) i dominuje oswietlenie: roznica
      // swiatlo/cien jest czytelna, a chropowatosc 0.5 dodaje lekki polysk
      // tkaniny, ktory lapie kat padania swiatla na fale.
      const flag = new THREE.Mesh(wave.geometry, new THREE.MeshStandardMaterial({
        color: "#ef4444",
        emissive: "#991b1b",
        emissiveIntensity: 0.15,
        roughness: 0.5,
        metalness: 0.06,
        side: THREE.DoubleSide,
        shadowSide: THREE.DoubleSide,
      }));
      flag.castShadow = true; flag.receiveShadow = true; flag.frustumCulled = true;
      flag.position.set(0, cp.y + 1.5, 0); group.add(flag);
      group.position.set(radial.x * (PLAYER_STAND_RADIUS + 0.9), 0, radial.z * (PLAYER_STAND_RADIUS + 0.9));
      group.rotation.y = theta; this.scene.add(group);
      group.updateWorldMatrix(true, true);
      const bounds = wave.geometry.boundingSphere!.clone().applyMatrix4(flag.matrixWorld);
      this.checkpoints.push({ ...cp, x: cpX, activated: false, mesh: group, flag, wave, bounds });
    });
  }

  private buildDoors() {
    const lowestByPair = new Map<string, number>();
    for (const door of this.level.doors) { const current = lowestByPair.get(door.pairId); if (current === undefined || door.topY < current) lowestByPair.set(door.pairId, door.topY); }
    this.level.doors.forEach((doorData) => {
      const doorX = stairCenterX(stairIndexAt(doorData.x));
      const theta = stepToTheta(doorX);
      const radial = new THREE.Vector3(Math.sin(theta), 0, Math.cos(theta));
      const isEntrance = doorData.topY === lowestByPair.get(doorData.pairId);
      const color = isEntrance ? "#22c55e" : "#ef4444";
      const group = new THREE.Group();
      const doorMaterial = createDoorMaterial(); const stoneMaterial = createDoorFrameMaterial();
      const panel = new THREE.Mesh(new THREE.BoxGeometry(0.85, 2.0, 0.16), doorMaterial);
      panel.position.set(0, 0.95, 0.03); panel.castShadow = true; group.add(panel);
      const leftPost = new THREE.Mesh(new THREE.BoxGeometry(0.18, 2.15, 0.3), stoneMaterial);
      const rightPost = leftPost.clone();
      leftPost.position.set(-0.53, 1.05, 0); rightPost.position.set(0.53, 1.05, 0);
      const lintelMat = stoneMaterial.clone();
      // Material.clone() dzieli tekstury, a nadproże obraca mapę o 90° —
      // bez klonowania obróciłaby się także mapa słupków drzwi, bo tekstury są
      // współdzielone.
      if (lintelMat.map) { lintelMat.map = lintelMat.map.clone(); lintelMat.map.center.set(0.5, 0.5); lintelMat.map.rotation = Math.PI / 2; lintelMat.map.needsUpdate = true; }
      if (lintelMat.normalMap) { lintelMat.normalMap = lintelMat.normalMap.clone(); lintelMat.normalMap.center.set(0.5, 0.5); lintelMat.normalMap.rotation = Math.PI / 2; lintelMat.normalMap.needsUpdate = true; }
      const lintel = new THREE.Mesh(new THREE.BoxGeometry(1.25, 0.2, 0.3), lintelMat);
      lintel.position.set(0, 2.05, 0); group.add(leftPost, rightPost, lintel);
      // Strzałka nad drzwiami: ciemna baza (kolor * 0.42) z lekkim metalem
      // łapiącym refleks słońca i śladową emisją, żeby kolor wejścia (zielony)
      // / wyjścia (czerwony) był czytelny także w cieniu.
      const arrowTint = new THREE.Color(color);
      const arrow = new THREE.Mesh(
        new THREE.ConeGeometry(0.18, 0.35, 4),
        new THREE.MeshStandardMaterial({
          color: arrowTint.clone().multiplyScalar(0.42),
          roughness: 0.3,
          metalness: 0.45,
          emissive: arrowTint.clone().multiplyScalar(0.1),
          flatShading: true,
        })
      );
      arrow.position.set(0, 2.55, 0.2); arrow.rotation.z = Math.PI; arrow.userData.baseY = 2.55; group.add(arrow);
      group.position.set(radial.x * (TOWER_RADIUS + 0.2), doorData.topY, radial.z * (TOWER_RADIUS + 0.2));
      group.rotation.y = theta; this.scene.add(group);
      this.doors.push({ ...doorData, x: doorX, color, theta, mesh: group });
    });
  }

  public spawnParticles(pos: THREE.Vector3, count: number, colorHex: number | string, speed = 2.5, mode: ParticleMode = "burst", floorY: number | null = null) {
    this.particles.spawn(pos, count, colorHex, speed, mode, floorY);
  }

  private stepPhysics(dt: number) {
    if (this.sceneMode === "menu") return;
    if (this.playerState.status !== "running") return;
    this.playerState.elapsedTime += dt;
    if (this.playerState.coyoteTimer > 0) this.playerState.coyoteTimer -= dt;
    if (this.playerState.jumpBufferTimer > 0) this.playerState.jumpBufferTimer -= dt;
    if (this.doorCooldown > 0) this.doorCooldown -= dt;
    if (this.playerState.crownFlash > 0) this.playerState.crownFlash = Math.max(0, this.playerState.crownFlash - dt);
    if (this.playerState.enemyHitCooldown > 0) this.playerState.enemyHitCooldown = Math.max(0, this.playerState.enemyHitCooldown - dt);
    const jiggleStiffness = 190; const jiggleDamping = 11.5;
    this.playerState.jiggleVel += (-jiggleStiffness * this.playerState.jiggle - jiggleDamping * this.playerState.jiggleVel) * dt;
    this.playerState.jiggle += this.playerState.jiggleVel * dt;
    this.playerState.jiggle = THREE.MathUtils.clamp(this.playerState.jiggle, -0.32, 0.32);

    // Petle indeksowane zamiast forEach z domknieciem: kazde wywolanie
    // array.forEach((x) => …) tworzy NOWY obiekt funkcji, a ta metoda jest
    // wolana do 5 razy na klatke (podkroki fizyki). Kilkanascie takich petli
    // w tej funkcji dawalo ~50 domkniec na klatke, czyli ~3000 obiektow na
    // sekunde trafiajacych prosto do kosza — to jest wlasnie ten churn, ktory
    // napedzal cycle collector i powodowal skoki. Petla indeksowana nie
    // alokuje niczego.
    for (let levIdx = 0; levIdx < this.levers.length; levIdx++) {
      const lev = this.levers[levIdx];
      // FIX: lev.x to już środek (patrz build) - odległość symetryczna, bez przesunięcia 0.5.
      const onIt = Math.abs(this.playerState.y - (lev.topY + 1.2)) < 1.5 && wrappedStepDistance(this.playerState.x, lev.x) < 0.9;
      if (onIt && this.input.doorQueued && this.leverCooldown <= 0) {
        this.input.doorQueued = false; lev.extended = !lev.extended; this.leverCooldown = 0.4;
        soundEngine.playLever();
        for (let tsIdx = 0; tsIdx < this.togglableStairs.length; tsIdx++) {
          const ts = this.togglableStairs[tsIdx];
          if (ts.leverId !== lev.id) continue;
          ts.extended = lev.extended;
          const info = this.ambientAudioFor(ts.x, ts.topY);
          if (info) soundEngine.playStairSlide(info.xDist, info.yDist, info.pan, 0.7);
        }
      }
      // Referencje z userData (patrz build) — zero alokacji na krok fizyki.
      const armGroup = lev.mesh.userData.armGroup as THREE.Group | undefined;
      if (armGroup) armGroup.rotation.x = THREE.MathUtils.lerp(armGroup.rotation.x, lev.extended ? -0.2 : -1.0, 0.12);
      const ball = lev.mesh.userData.ball as THREE.Mesh | undefined;
      if (ball && ball.material instanceof THREE.MeshStandardMaterial && ball.userData.extended !== lev.extended) {
        ball.userData.extended = lev.extended;
        ball.material.color.set(lev.extended ? "#4ade80" : "#ef4444");
        ball.material.emissive.set(lev.extended ? "#14532d" : "#7f1d1d");
      }
    }
    if (this.leverCooldown > 0) this.leverCooldown -= dt;

    for (let tsIdx = 0; tsIdx < this.togglableStairs.length; tsIdx++) {
      const ts = this.togglableStairs[tsIdx];
      const target = ts.extended ? 0 : 1;
      ts.retractOffset = THREE.MathUtils.lerp(ts.retractOffset, target, 1 - Math.exp(-6 * dt));
      if (Math.abs(ts.retractOffset - target) < 0.005) ts.retractOffset = target;
      this.physicsRadial.set(Math.sin(ts.theta), 0, Math.cos(ts.theta));
      const tOuter = TOWER_RADIUS + PLATFORM_DEPTH * 0.5; const tInner = TOWER_RADIUS - 0.8;
      const dist = tOuter + (tInner - tOuter) * ts.retractOffset;
      ts.mesh.position.set(this.physicsRadial.x * dist, ts.topY - PLATFORM_THICKNESS * 0.5, this.physicsRadial.z * dist);
      const tMesh = ts.mesh.children[0];
      if (tMesh && tMesh instanceof THREE.Mesh && tMesh.material instanceof THREE.MeshStandardMaterial) {
        const isGreen = ts.retractOffset < 0.5;
        if (tMesh.userData.isGreen !== isGreen) {
          tMesh.userData.isGreen = isGreen;
          tMesh.material.color.set(isGreen ? "#4ade80" : "#ef4444");
          tMesh.material.emissive.set(isGreen ? "#198745f0" : "#831b1bed");
        }
      }
    }

    if (this.input.doorQueued) { if (this.doorCooldown <= 0) this.tryUseDoor(); this.input.doorQueued = false; }

    for (let csIdx = 0; csIdx < this.collapsingStairs.length; csIdx++) {
      const cs = this.collapsingStairs[csIdx];
      // cs.x to środek - test symetryczny, ten był już dobry.
      const nextPlayerY = this.playerState.y + this.playerState.vy * dt;
      const isDescendingThroughTop = this.playerState.vy <= 0 &&
        this.playerState.y >= cs.topY - 0.2 && nextPlayerY <= cs.topY + 0.2;
      const onIt = (Math.abs(this.playerState.y - cs.topY) < 0.2 || isDescendingThroughTop) &&
        this.movableStairPhysicallyOverlaps(this.playerState.x, cs.x, cs.retractOffset);
      switch (cs.state) {
        case "idle":
          if (onIt && this.playerState.grounded) {
            cs.state = "retracting"; cs.timer = 0;
            const info = this.ambientAudioFor(cs.x, cs.topY);
            if (info) soundEngine.playStairSlide(info.xDist, info.yDist, info.pan, 1);
          }
          break;
        case "retracting":
          cs.retractOffset = THREE.MathUtils.lerp(cs.retractOffset, 1, 1 - Math.exp(-4.3 * dt));
          if (cs.retractOffset >= 0.98) { cs.state = "hidden"; cs.timer = 1.0; cs.retractOffset = 1; }
          break;
        case "hidden":
          cs.timer -= dt;
          if (cs.timer <= 0) {
            cs.state = "extending"; cs.timer = 1.0;
            const info = this.ambientAudioFor(cs.x, cs.topY);
            if (info) soundEngine.playStairSlide(info.xDist, info.yDist, info.pan, 1);
          }
          break;
        case "extending":
          cs.timer -= dt; cs.retractOffset = Math.max(0, cs.timer / 1.0);
          if (cs.timer <= 0) { cs.state = "idle"; cs.retractOffset = 0; cs.timer = 0; }
          break;
      }
      this.physicsRadial.set(Math.sin(cs.theta), 0, Math.cos(cs.theta));
      const outer = PLAYER_STAND_RADIUS; const inner = TOWER_RADIUS - 0.8;
      const dist = outer + (inner - outer) * cs.retractOffset;
      cs.mesh.position.set(this.physicsRadial.x * dist, cs.topY - PLATFORM_THICKNESS * 0.5, this.physicsRadial.z * dist);
    }

    const timeSec = this.playerState.elapsedTime;
    for (let elevIdx = 0; elevIdx < this.elevators.length; elevIdx++) {
      const elevator = this.elevators[elevIdx];
      const raw = (Math.sin(timeSec * elevator.speed + elevator.phase) + 1) * 0.5;
      const dwell = 0.15;
      const normalized = THREE.MathUtils.smoothstep(raw, dwell, 1 - dwell);
      const y = THREE.MathUtils.lerp(elevator.yMin, elevator.yMax, normalized);
      if (elevator.mesh) elevator.mesh.position.y = y - PLATFORM_THICKNESS * 0.5;
      (elevator as unknown as { prevTopY: number }).prevTopY = elevator.currentTopY;
      elevator.currentTopY = y;
    }

    for (let hazIdx = 0; hazIdx < this.hazards.length; hazIdx++) {
      const haz = this.hazards[hazIdx];
      switch (haz.behavior) {
        case "bounce": {
          haz.bounceElapsed += dt;
          if (haz.bounceElapsed >= haz.bounceDuration) {
            const hit = this.ambientAudioFor(haz.currentX, haz.bounceBaseY + 0.32);
            if (hit) soundEngine.playBallBounce(hit.xDist, hit.yDist, hit.pan);
            haz.bounceElapsed %= haz.bounceDuration; haz.x = haz.bounceToX;
            if (haz.moveSteps > 0) { const expectedSlot = wrapValue(stairIndexAt(haz.bounceFromX) + haz.direction * haz.moveSteps, CIRCUMFERENCE_STEPS); if (stairIndexAt(haz.x) !== expectedSlot) haz.direction = haz.direction === 1 ? -1 : 1; }
            haz.bounceFromX = haz.x; haz.bounceToX = this.findEnemyLandingX(haz.x, haz.bounceBaseY, haz.moveSteps, haz.direction);
          }
          const t = THREE.MathUtils.clamp(haz.bounceElapsed / haz.bounceDuration, 0, 1);
          const bounceY = 4 * haz.amplitude * t * (1 - t);
          let dx = haz.bounceToX - haz.bounceFromX; if (dx > CIRCUMFERENCE_STEPS * 0.5) dx -= CIRCUMFERENCE_STEPS; if (dx < -CIRCUMFERENCE_STEPS * 0.5) dx += CIRCUMFERENCE_STEPS;
          haz.currentX = wrapValue(haz.bounceFromX + dx * t, CIRCUMFERENCE_STEPS); haz.theta = stepToTheta(haz.currentX);
          const ballY = haz.bounceBaseY + 0.32 + bounceY;
          if (haz.mesh) { this.physicsRadial.set(Math.sin(haz.theta), 0, Math.cos(haz.theta)); haz.mesh.position.set(this.physicsRadial.x * PLAYER_STAND_RADIUS, ballY, this.physicsRadial.z * PLAYER_STAND_RADIUS); haz.mesh.userData.currentY = ballY; haz.mesh.rotation.x += dt * 5; haz.mesh.rotation.z += dt * 2.5; }
          break;
        }
        case "patrol": {
          const patrolN = Math.sin(timeSec * haz.speed); haz.currentX = wrapValue(haz.x + patrolN * haz.amplitude, CIRCUMFERENCE_STEPS); haz.theta = stepToTheta(haz.currentX);
          if (haz.mesh) { this.physicsRadial.set(Math.sin(haz.theta), 0, Math.cos(haz.theta)); haz.mesh.position.set(this.physicsRadial.x * PLAYER_STAND_RADIUS, haz.bounceBaseY + 0.7, this.physicsRadial.z * PLAYER_STAND_RADIUS); haz.mesh.userData.currentY = haz.bounceBaseY + 0.7; haz.mesh.rotation.x += dt * 5; haz.mesh.rotation.z += dt * 2.5; }
          break;
        }
        default:
          haz.currentX = haz.x; haz.theta = stepToTheta(haz.x);
          if (haz.mesh) { this.physicsRadial.set(Math.sin(haz.theta), 0, Math.cos(haz.theta)); haz.mesh.position.set(this.physicsRadial.x * PLAYER_STAND_RADIUS, haz.bounceBaseY + 0.7, this.physicsRadial.z * PLAYER_STAND_RADIUS); haz.mesh.userData.currentY = haz.bounceBaseY + 0.7; haz.mesh.rotation.x += dt * 5; haz.mesh.rotation.z += dt * 2.5; }
          break;
      }
      const hazMesh = haz.mesh;
      const hazY = hazMesh && (hazMesh.userData as Record<string, number>)?.currentY ? (hazMesh.userData as Record<string, number>).currentY : haz.y;
      // FIX WRÓG: symetryczny test środków. Było overlapsWrapped(px,HALF*1.5,center,0.4)
      // czyli środek jako left -> przesunięcie +0.2. Teraz half=0.2 (0.4/2).
      const enemyOverlap = this.overlapsCentered(this.playerState.x, PLAYER_HALF_WIDTH * 1.5, haz.currentX, 0.2);
      if (this.playerState.enemyHitCooldown <= 0 && hazY + 0.32 >= this.playerState.y - 0.1 && hazY - 0.32 <= this.playerState.y + PLAYER_HEIGHT && enemyOverlap) {
        const enemyFloor = this.findStairTopBelow(haz.currentX, hazY + 0.01);
        this.applyKnockdown(7.5, this.playerState.rideElevator, undefined, enemyFloor);
      }
    }

    for (let spIdx = 0; spIdx < this.springs.length; spIdx++) {
      const sp = this.springs[spIdx];
      if (sp.cooldown > 0) sp.cooldown -= dt;
    }

    if (this.playerState.rideElevator >= 0) {
      const ridingElevator = this.playerState.rideElevator;
      const activeElev = this.elevators[ridingElevator];
      if (activeElev) {
        const previousTopY = (activeElev as unknown as { prevTopY?: number }).prevTopY ?? activeElev.currentTopY;
        const currentTopY = activeElev.currentTopY;
        const ceilingBottom = this.findRiderCeilingBottom(ridingElevator, this.playerState.x, previousTopY, currentTopY);
        if (ceilingBottom !== null) {
          const resolvedY = ceilingBottom - PLAYER_HEIGHT - 0.02;
          this.applyKnockdown(-4.5, ridingElevator, resolvedY);
        } else { this.playerState.y = currentTopY; this.playerState.currentStairTopY = currentTopY; }
      }
    }

    const moveAxis = (this.input.right ? 1 : 0) - (this.input.left ? 1 : 0);
    this.playerState.vx = moveAxis * WALK_SPEED;
    const prevX = this.playerState.x;
    let nextX = wrapValue(this.playerState.x + this.playerState.vx * dt, CIRCUMFERENCE_STEPS);
    nextX = this.checkSideCollision(prevX, nextX);
    this.playerState.x = nextX;
    if (moveAxis !== 0) { this.playerState.facingRight = moveAxis > 0; this.playerState.walkCycle += dt * 9; this.playerState.idleTimer = 0; } else this.playerState.idleTimer += dt;

    if (this.input.jumpQueued) { this.playerState.jumpBufferTimer = 0.12; this.input.jumpQueued = false; }
    const canJump = this.playerState.grounded || this.playerState.coyoteTimer > 0;
    if (this.playerState.jumpBufferTimer > 0 && canJump) {
      this.playerState.vy = JUMP_SPEED; this.playerState.grounded = false; this.playerState.coyoteTimer = 0; this.playerState.jumpBufferTimer = 0; this.playerState.rideElevator = -1; this.playerState.jumpCount++; soundEngine.playJump();
      this.playerState.jiggleVel += 6.5;
      const theta = stepToTheta(this.playerState.x); const rad = new THREE.Vector3(Math.sin(theta), 0, Math.cos(theta));
      this.spawnParticles(new THREE.Vector3(rad.x * PLAYER_STAND_RADIUS, this.playerState.y + 0.08, rad.z * PLAYER_STAND_RADIUS), 10, 0x93c5fd, 1.8, "jump", this.playerState.y);
    }
    if (!this.input.up && this.playerState.vy > 4.0) this.playerState.vy *= 0.88;
    this.playerState.vy -= GRAVITY * dt;
    const prevY = this.playerState.y;
    let nextY = this.playerState.y + this.playerState.vy * dt;

    let knockedByElevator = false;
    if (this.playerState.rideElevator < 0) {
      const previousHeadY = prevY + PLAYER_HEIGHT; const nextHeadY = nextY + PLAYER_HEIGHT;
      for (let elevatorIndex = 0; elevatorIndex < this.elevators.length; elevatorIndex++) {
        if (elevatorIndex === this.ignoredElevator) continue;
        const elev = this.elevators[elevatorIndex];
        const currTopY = elev.currentTopY;
        const prevTopY = (elev as unknown as { prevTopY?: number }).prevTopY ?? currTopY;
        const previousBottomY = prevTopY - PLATFORM_THICKNESS;
        const currentBottomY = currTopY - PLATFORM_THICKNESS;
        const previousGap = previousBottomY - previousHeadY;
        const currentGap = currentBottomY - nextHeadY;
        const startedBelowElevator = prevY <= previousBottomY + 0.02;
        const crossedHead = previousGap >= -0.02 && currentGap <= 0.02;
        // FIX: środek windy, nie lewa krawędź.
        const overlapsNow = startedBelowElevator && nextHeadY > currentBottomY + 0.02 && nextY < currTopY - 0.02 &&
          this.overlapsCentered(this.playerState.x, PLAYER_HALF_WIDTH, this.elevatorCenterX(elev.x, elev.width), elev.width * 0.5);
        if ((crossedHead || overlapsNow) && this.overlapsCentered(this.playerState.x, PLAYER_HALF_WIDTH, this.elevatorCenterX(elev.x, elev.width), elev.width * 0.5)) {
          const resolvedY = Math.min(nextY, currentBottomY - PLAYER_HEIGHT - 0.02);
          this.applyKnockdown(-4.5, elevatorIndex, resolvedY);
          nextY = resolvedY; knockedByElevator = true; break;
        }
      }
    }

    if (!knockedByElevator) {
      const ceilingHit = this.checkCeilingCollision(prevY, nextY);
      if (ceilingHit !== null) {
        nextY = ceilingHit; this.playerState.vy = 0; this.playerState.jiggleVel -= 4; soundEngine.playBonk();
        const headTheta = stepToTheta(this.playerState.x);
        const headRad = new THREE.Vector3(Math.sin(headTheta), 0, Math.cos(headTheta));
        this.spawnParticles(new THREE.Vector3(headRad.x * PLAYER_STAND_RADIUS, nextY + PLAYER_HEIGHT, headRad.z * PLAYER_STAND_RADIUS), 10, 0xfef08a, 2.5, "burst", this.findStairTopBelow(this.playerState.x, nextY + PLAYER_HEIGHT));
      }
    }

    const groundHit = this.findGround(prevY, nextY);
    if (groundHit && this.playerState.vy <= 0) {
      if (!this.playerState.grounded) {
        const impact = Math.min(Math.abs(this.playerState.vy) / JUMP_SPEED, 1.6);
        this.playerState.jiggleVel -= 9 * impact; soundEngine.playLand(impact);
        if (impact > 0.18) {
          const landTheta = stepToTheta(this.playerState.x); const landRad = new THREE.Vector3(Math.sin(landTheta), 0, Math.cos(landTheta));
          this.spawnParticles(new THREE.Vector3(landRad.x * PLAYER_STAND_RADIUS, groundHit.topY + 0.06, landRad.z * PLAYER_STAND_RADIUS), Math.round(6 + impact * 8), 0xbfdbfe, 1.4 + impact * 1.2, "land", groundHit.topY);
        }
      }
      this.playerState.y = groundHit.topY; this.playerState.vy = 0; this.playerState.grounded = true;
      this.playerState.coyoteTimer = 0; this.playerState.rideElevator = groundHit.rideElevator;
      this.playerState.currentStairTopY = groundHit.topY; this.playerState.knockdownFloorY = null; this.ignoredElevator = -1;
    } else {
      if (this.playerState.grounded) this.playerState.coyoteTimer = 0.1;
      this.playerState.y = nextY; this.playerState.grounded = false; this.playerState.rideElevator = -1; this.playerState.currentStairTopY = null;
    }

    this.resolveMovableStairLateralHit();

    for (let spIdx = 0; spIdx < this.springs.length; spIdx++) {
      const sp = this.springs[spIdx];
      // FIX SPRĘŻYNA: sp.x to już środek (build +0.5). half=0.3 (0.6/2). Symetrycznie.
      const springOverlap = this.overlapsCentered(this.playerState.x, PLAYER_HALF_WIDTH * 1.5, sp.x, 0.3);
      if (sp.cooldown <= 0 && Math.abs(this.playerState.y - sp.topY) < 0.5 && springOverlap && this.playerState.vy <= 2) {
        sp.cooldown = 0.4; this.playerState.vy = sp.bounceForce; this.playerState.grounded = false; this.playerState.rideElevator = -1; soundEngine.playSuperJump();
        const theta = stepToTheta(sp.x); const rad = new THREE.Vector3(Math.sin(theta), 0, Math.cos(theta));
        this.spawnParticles(new THREE.Vector3(rad.x * PLAYER_STAND_RADIUS, sp.topY + 0.2, rad.z * PLAYER_STAND_RADIUS), 16, 0xf59e0b, 4.2, "burst", sp.topY);
      }
    }

    for (let gemIdx = 0; gemIdx < this.gems.length; gemIdx++) {
      const gem = this.gems[gemIdx];
      // FIX KLEJNOT: gem.x to środek, half=0.3. Było left -> przesunięcie +0.3.
      const gemOverlap = this.overlapsCentered(this.playerState.x, PLAYER_HALF_WIDTH, gem.x, 0.3);
      if (!gem.collected && gem.y >= this.playerState.y - 0.3 && gem.y <= this.playerState.y + 2.5 && gemOverlap) {
        gem.collected = true; this.playerState.gemsCollected++; this.playerState.score += 250; this.playerState.crownFlash = 0.3; soundEngine.playCoin();
        if (gem.mesh) { gem.mesh.visible = false; this.spawnParticles(gem.mesh.position, 14, 0xfbbf24, 3.5, "burst", this.findStairTopBelow(gem.x, gem.y)); }
      }
    }

    for (let cpIdx = 0; cpIdx < this.checkpoints.length; cpIdx++) {
      const cp = this.checkpoints[cpIdx];
      // FIX CHECKPOINT: cp.x to środek, half=0.6 (1.2/2).
      const cpOverlap = this.overlapsCentered(this.playerState.x, PLAYER_HALF_WIDTH * 2, cp.x, 0.6);
      if (!cp.activated && Math.abs(this.playerState.y - cp.y) < 1.2 && cpOverlap) {
        cp.activated = true; this.activeCheckpoint = cp.id; soundEngine.playCheckpoint(); this.playerState.score += 500;
        if (cp.mesh) {
          const flagMesh = cp.mesh.children[1] as THREE.Mesh;
          if (flagMesh && flagMesh.material instanceof THREE.MeshStandardMaterial) { flagMesh.material.color.set("#22c55e"); flagMesh.material.emissive.set("#15803d"); }
          const cTheta = stepToTheta(cp.x); const cRad = new THREE.Vector3(Math.sin(cTheta), 0, Math.cos(cTheta));
          const cPos = new THREE.Vector3(cRad.x * (PLAYER_STAND_RADIUS + 0.9), cp.y + 1.5, cRad.z * (PLAYER_STAND_RADIUS + 0.9));
          this.spawnParticles(cPos, 20, 0x22c55e, 3.0, "burst", cp.y);
        }
      }
    }

    const waterSurface = this.waterLevel + 0.25;
    if (this.waterEnterCooldown > 0) this.waterEnterCooldown -= dt;
    if (this.playerState.y <= waterSurface) {
      if (!this.wasInWater && this.playerState.vy < 0 && this.waterEnterCooldown <= 0) {
        this.wasInWater = true; this.waterEnterCooldown = 1.0;
        const theta = stepToTheta(this.playerState.x); const radial = new THREE.Vector3(Math.sin(theta), 0, Math.cos(theta));
        const splashPos = new THREE.Vector3(radial.x * PLAYER_STAND_RADIUS, waterSurface, radial.z * PLAYER_STAND_RADIUS);
        this.spawnParticles(splashPos, 32, 0x4fc3f7, 6.5); this.spawnParticles(splashPos.clone().add(new THREE.Vector3(0, 0.2, 0)), 20, 0xffffff, 4.0);
        this.createWaterRipple(splashPos); this.playerState.jiggleVel -= 12; soundEngine.playGameOver();
      }
      this.playerState.vy = THREE.MathUtils.lerp(this.playerState.vy, -0.8, dt * 2.5); this.playerState.vx *= 0.96;
      if (this.playerState.y < this.waterLevel - 1.5) {
        if (this.activeCheckpoint > 0) { this.resetInput(); this.respawnAtCheckpoint(false); } else this.setGameStatus("gameover");
        this.wasInWater = false;
      }
    } else this.wasInWater = false;
    if (this.playerState.y < -8) { if (this.activeCheckpoint > 0) this.respawnAtCheckpoint(); else { this.setGameStatus("gameover"); soundEngine.playGameOver(); } }
    this.handleTopStep();
  }

  private handleTopStep() {
    const onTopStep = this.playerState.grounded && this.playerState.currentStairTopY !== null && this.playerState.currentStairTopY >= this.towerHeight;
    if (!onTopStep || this.winPending || this.domeShattered) return;
    const allGems = this.playerState.gemsCollected >= this.playerState.totalGems && this.playerState.totalGems > 0;
    if (allGems && !this.beaconDome.visible) this.finishWin();
    else if (allGems) { this.shatterDome(); this.winPending = true; this.winPendingTimer = 1.25; }
    else this.finishWin();
  }

  private finishWin() {
    this.setGameStatus("win"); this.playerState.score += 2000; soundEngine.playWin();
    const pos = new THREE.Vector3(0, this.towerHeight + 2, 0);
    this.spawnParticles(pos, 60, 0xfbbf24, 5.0, "burst", this.towerHeight);
    this.spawnParticles(pos, 60, 0x38bdf8, 5.0, "burst", this.towerHeight);
  }

  private shatterDome() {
    if (this.domeShattered) return; this.domeShattered = true;
    const radius = 3.2; const position = new THREE.Vector3(0, this.towerHeight, 0);
    this.beaconDome.visible = false;
    const shardMat = new THREE.MeshStandardMaterial({ color: "#bfe3ff", emissive: "#38bdf8", emissiveIntensity: 0.25, transparent: true, opacity: 0.85, roughness: 0.1, metalness: 0.05, depthWrite: false, side: THREE.DoubleSide });
    const rings = 5; const segments = 14;
    for (let ring = 0; ring < rings; ring++) {
      const phi0 = (ring / rings) * Math.PI * 0.5; const phi1 = ((ring + 1) / rings) * Math.PI * 0.5;
      for (let seg = 0; seg < segments; seg++) {
        const theta0 = (seg / segments) * Math.PI * 2; const theta1 = ((seg + 1) / segments) * Math.PI * 2;
        const p = (phi: number, theta: number) => new THREE.Vector3(radius * Math.sin(phi) * Math.cos(theta), radius * Math.cos(phi), radius * Math.sin(phi) * Math.sin(theta));
        const a = p(phi0, theta0); const b = p(phi1, theta0); const c = p(phi1, theta1); const d = p(phi0, theta1);
        const cells: THREE.Vector3[][] = [[a, b, c], [a, c, d]];
        for (const tri of cells) {
          const geo = new THREE.BufferGeometry();
          const verts = new Float32Array(tri.flatMap((v) => [v.x, v.y, v.z]));
          geo.setAttribute("position", new THREE.BufferAttribute(verts, 3)); geo.computeVertexNormals();
          const shard = new THREE.Mesh(geo, shardMat.clone()); shard.position.copy(position);
          const center = tri[0].clone().add(tri[1]).add(tri[2]).multiplyScalar(1 / 3);
          const dir = center.clone().normalize();
          const speed = 4.5 + Math.random() * 5.5;
          const velocity = dir.multiplyScalar(speed); velocity.y += 2.5 + Math.random() * 3.0;
          shard.userData = { velocity, angular: new THREE.Vector3((Math.random() - 0.5) * 8, (Math.random() - 0.5) * 8, (Math.random() - 0.5) * 8), life: 0, maxLife: 1.4 + Math.random() * 0.8 };
          this.scene.add(shard); this.domeShards.push(shard);
        }
      }
    }
  }

  private updateDomeShards(dt: number) {
    for (let i = this.domeShards.length - 1; i >= 0; i--) {
      const shard = this.domeShards[i];
      const data = shard.userData as { velocity: THREE.Vector3; angular: THREE.Vector3; life: number; maxLife: number };
      data.life += dt;
      if (data.life >= data.maxLife) { this.scene.remove(shard); shard.geometry.dispose(); (shard.material as THREE.Material).dispose(); this.domeShards.splice(i, 1); continue; }
      data.velocity.y -= 9.8 * dt; shard.position.addScaledVector(data.velocity, dt);
      shard.rotation.x += data.angular.x * dt; shard.rotation.y += data.angular.y * dt; shard.rotation.z += data.angular.z * dt;
      const mat = shard.material as THREE.MeshStandardMaterial;
      mat.opacity = Math.max(0, 0.85 * (1 - data.life / data.maxLife));
    }
  }

  private createWaterRipple(position: THREE.Vector3) {
    const ringGeo = new THREE.RingGeometry(0.3, 0.45, 24); ringGeo.rotateX(-Math.PI / 2);
    const ringMat = new THREE.MeshBasicMaterial({ color: 0x7ec8ff, transparent: true, opacity: 0.65, side: THREE.DoubleSide, depthWrite: false });
    const ring = new THREE.Mesh(ringGeo, ringMat); ring.position.copy(position); ring.position.y = this.waterLevel + 0.02;
    (ring as any).userData = { age: 0, maxAge: 1.8 }; this.scene.add(ring); this.waterRipples.push(ring);
  }

  private respawnAtCheckpoint(playSound = true) {
    const cp = this.checkpoints.find((c) => c.id === this.activeCheckpoint);
    if (playSound) soundEngine.playGameOver();
    this.playerState.knockdownFloorY = null; this.ignoredElevator = -1; this.playerState.jiggle = 0; this.playerState.jiggleVel = 0;
    if (cp) { this.playerState.x = cp.x; this.playerState.y = cp.y + 0.5; this.playerState.vx = 0; this.playerState.vy = 0; this.playerState.grounded = false; this.playerState.rideElevator = -1; this.playerState.currentStairTopY = null; this.playerState.smoothCamY = cp.y + 0.5; }
    else { this.playerState.x = FIRST_STEP_CENTER; this.playerState.y = 0.5; this.playerState.vx = 0; this.playerState.vy = 0; this.playerState.grounded = false; this.playerState.rideElevator = -1; this.playerState.currentStairTopY = null; this.playerState.smoothCamY = 0.5; }
    this.playerState.idleTimer = 2; this.playerState.camLeadAngle = 0;
    this.playerState.facingYaw = Math.atan2(Math.sin(stepToTheta(this.playerState.x)), Math.cos(stepToTheta(this.playerState.x)));
    this.wasInWater = false; this.waterEnterCooldown = 0.8;
  }

  private tryUseDoor() {
    const source = this.doors.find((door) => wrappedStepDistance(this.playerState.x, door.x) < 0.65 && Math.abs(this.playerState.y - door.topY) < 0.75);
    if (!source) return;
    const destination = this.doors.find((door) => door.pairId === source.pairId && door.id !== source.id);
    if (!destination) return;
    this.spawnParticles(source.mesh.position.clone().add(new THREE.Vector3(0, 1, 0)), 18, source.color, 3.2, "burst", source.topY);
    this.playerState.x = destination.x; this.playerState.y = destination.topY + 0.08; this.playerState.vx = 0; this.playerState.vy = 0;
    this.playerState.grounded = true; this.playerState.rideElevator = -1; this.playerState.currentStairTopY = destination.topY;
    this.ignoredElevator = -1; this.playerState.smoothCamY = destination.topY; this.playerState.idleTimer = 2; this.doorCooldown = 0.55;
    this.spawnParticles(destination.mesh.position.clone().add(new THREE.Vector3(0, 1, 0)), 18, destination.color, 3.2, "burst", destination.topY); soundEngine.playCheckpoint();
  }

  private findGround(prevY: number, nextY: number): { topY: number; rideElevator: number } | null {
    let hitTop = -Infinity; let ride = -1;
    const ignoredFloor = this.playerState.knockdownFloorY;
    for (const stair of this.staticStairs) {
      // FIX SCHODEK: środek = stairCenterX(stair.x), half = width/2. Symetrycznie.
      const centerX = stairCenterX(stair.x);
      if ((ignoredFloor === null || Math.abs(stair.topY - ignoredFloor) > 0.15) &&
          this.overlapsCentered(this.playerState.x, PLAYER_HALF_WIDTH, centerX, stair.width * 0.5) &&
          prevY >= stair.topY - 0.45 && nextY <= stair.topY + 0.25) {
        if (stair.topY > hitTop) { hitTop = stair.topY; ride = -1; }
      }
    }
    this.elevators.forEach((elev, idx) => {
      if (idx === this.ignoredElevator) return;
      const centerX = this.elevatorCenterX(elev.x, elev.width);
      if ((ignoredFloor === null || Math.abs(elev.currentTopY - ignoredFloor) > 0.15) &&
          this.overlapsCentered(this.playerState.x, PLAYER_HALF_WIDTH, centerX, elev.width * 0.5) &&
          prevY >= elev.currentTopY - 0.45 && nextY <= elev.currentTopY + 0.25) {
        if (elev.currentTopY > hitTop) { hitTop = elev.currentTopY; ride = idx; }
      }
    });
    this.collapsingStairs.forEach((cs) => {
      if (!this.movableStairPhysicallyOverlaps(this.playerState.x, cs.x, cs.retractOffset)) return;
      if ((ignoredFloor === null || Math.abs(cs.topY - ignoredFloor) > 0.15) && prevY >= cs.topY - 0.45 && nextY <= cs.topY + 0.08 && cs.topY > hitTop) { hitTop = cs.topY; ride = -1; }
    });
    this.togglableStairs.forEach((ts) => {
      if (!this.movableStairPhysicallyOverlaps(this.playerState.x, ts.x, ts.retractOffset)) return;
      if ((ignoredFloor === null || Math.abs(ts.topY - ignoredFloor) > 0.15) && prevY >= ts.topY - 0.45 && nextY <= ts.topY + 0.08 && ts.topY > hitTop) { hitTop = ts.topY; ride = -1; }
    });
    if (hitTop === -Infinity) return null;
    return { topY: hitTop, rideElevator: ride };
  }

  private applyKnockdown(verticalVelocity = 7.5, elevatorToIgnore = this.playerState.rideElevator, resolvedY?: number, knockdownFloor: number | null = this.playerState.currentStairTopY) {
    if (resolvedY !== undefined) this.playerState.y = resolvedY;
    this.playerState.enemyHitCooldown = 0.8; this.playerState.knockdownFloorY = knockdownFloor;
    this.ignoredElevator = elevatorToIgnore; this.playerState.vy = verticalVelocity;
    this.playerState.grounded = false; this.playerState.rideElevator = -1; this.playerState.currentStairTopY = null;
    this.playerState.coyoteTimer = 0; this.playerState.jumpBufferTimer = 0; this.playerState.jiggleVel -= 8;
    soundEngine.playBonk();
    const knockTheta = stepToTheta(this.playerState.x);
    const knockRad = new THREE.Vector3(Math.sin(knockTheta), 0, Math.cos(knockTheta));
    const knockPos = new THREE.Vector3(knockRad.x * PLAYER_STAND_RADIUS, this.playerState.y + 1.0, knockRad.z * PLAYER_STAND_RADIUS);
    this.spawnParticles(knockPos, 14, 0xfef08a, 3.5, "burst", this.playerState.knockdownFloorY);
  }

  private findStairTopBelow(x: number, y: number): number | null {
    let best: number | null = null; const slot = stairIndexAt(x);
    for (const stair of this.staticStairs) {
      if (stairIndexAt(stair.x) === slot && stair.topY <= y + 0.01) { if (best === null || stair.topY > best) best = stair.topY; }
    }
    return best;
  }

  private movableStairRadialCenter(retractOffset: number): number {
    const outer = PLAYER_STAND_RADIUS; const inner = TOWER_RADIUS - 0.8;
    return outer + (inner - outer) * retractOffset;
  }

  // FIX: jedyna funkcja kolizji schodka ruchomego - w pełni symetryczna.
  private movableStairPhysicallyOverlaps(playerX: number, centerX: number, retractOffset: number): boolean {
    // 1. obwód: |player-center| < HALF + 0.5 (schodek ma szerokość 1, half 0.5)
    if (wrappedStepDistance(playerX, centerX) >= PLAYER_HALF_WIDTH + 0.5) return false;
    // 2. promień
    const stairCenter = this.movableStairRadialCenter(retractOffset);
    const stairInner = stairCenter - PLATFORM_DEPTH * 0.5;
    const stairOuter = stairCenter + PLATFORM_DEPTH * 0.5;
    const playerInner = PLAYER_STAND_RADIUS - PLAYER_HALF_WIDTH;
    const playerOuter = PLAYER_STAND_RADIUS + PLAYER_HALF_WIDTH;
    return playerOuter > stairInner && playerInner < stairOuter;
  }

  private resolveMovableStairLateralHit(): boolean {
    if (this.playerState.enemyHitCooldown > 0) return false;
    const playerBottom = this.playerState.y; const playerTop = this.playerState.y + PLAYER_HEIGHT;
    const stairStrikesPlayer = (centerX: number, retractOffset: number, topY: number): boolean => {
      const stairBottom = topY - PLATFORM_THICKNESS;
      if (playerBottom >= topY - 0.05) return false;
      if (playerTop <= stairBottom + 0.02) return false;
      return this.movableStairPhysicallyOverlaps(this.playerState.x, centerX, retractOffset);
    };
    for (const cs of this.collapsingStairs) { if (stairStrikesPlayer(cs.x, cs.retractOffset, cs.topY)) { this.applyKnockdown(-4.5, -1); return true; } }
    for (const ts of this.togglableStairs) { if (stairStrikesPlayer(ts.x, ts.retractOffset, ts.topY)) { this.applyKnockdown(-4.5, -1); return true; } }
    return false;
  }

  private findRiderCeilingBottom(ridingElevator: number, px: number, previousTopY: number, currentTopY: number): number | null {
    if (currentTopY <= previousTopY + 0.0001) return null;
    const previousHeadY = previousTopY + PLAYER_HEIGHT; const currentHeadY = currentTopY + PLAYER_HEIGHT;
    let firstBottom: number | null = null;
    const considerStatic = (platformBottom: number, platformTop: number, horizontalOverlap: boolean) => {
      if (!horizontalOverlap) return;
      const wasBelowPlatformTop = previousTopY < platformTop - 0.02;
      const headReachedBottom = currentHeadY >= platformBottom - 0.02;
      const wasNotAlreadyAbove = previousHeadY <= platformTop + PLAYER_HEIGHT;
      if (wasBelowPlatformTop && headReachedBottom && wasNotAlreadyAbove) {
        if (firstBottom === null || platformBottom < firstBottom) firstBottom = platformBottom;
      }
    };
    for (const stair of this.staticStairs) {
      considerStatic(stair.topY - PLATFORM_THICKNESS, stair.topY,
        this.overlapsCentered(px, PLAYER_HALF_WIDTH, stairCenterX(stair.x), stair.width * 0.5));
    }
    for (const cs of this.collapsingStairs) {
      considerStatic(cs.topY - PLATFORM_THICKNESS, cs.topY, this.movableStairPhysicallyOverlaps(px, cs.x, cs.retractOffset));
    }
    for (const ts of this.togglableStairs) {
      considerStatic(ts.topY - PLATFORM_THICKNESS, ts.topY, this.movableStairPhysicallyOverlaps(px, ts.x, ts.retractOffset));
    }
    for (let i = 0; i < this.elevators.length; i++) {
      if (i === ridingElevator) continue;
      const elev = this.elevators[i];
      if (!this.overlapsCentered(px, PLAYER_HALF_WIDTH, this.elevatorCenterX(elev.x, elev.width), elev.width * 0.5)) continue;
      const otherCurrentTop = elev.currentTopY;
      const otherPreviousTop = (elev as unknown as { prevTopY?: number }).prevTopY ?? otherCurrentTop;
      const previousGap = otherPreviousTop - PLATFORM_THICKNESS - previousHeadY;
      const currentGap = otherCurrentTop - PLATFORM_THICKNESS - currentHeadY;
      if (previousGap >= -0.02 && currentGap <= 0.02) {
        const bottom = otherCurrentTop - PLATFORM_THICKNESS;
        if (firstBottom === null || bottom < firstBottom) firstBottom = bottom;
      }
    }
    return firstBottom;
  }

  private checkCeilingCollision(prevY: number, nextY: number): number | null {
    if (this.playerState.vy <= 0) return null;
    const playerTop = nextY + PLAYER_HEIGHT;
    let lowestCeiling: number | null = null;
    const considerCeiling = (platBottom: number, hitsHorizontally: boolean) => {
      if (!hitsHorizontally) return;
      if (prevY + PLAYER_HEIGHT <= platBottom && playerTop >= platBottom) {
        if (lowestCeiling === null || platBottom < lowestCeiling) lowestCeiling = platBottom;
      }
    };
    for (const stair of this.staticStairs) {
      considerCeiling(stair.topY - PLATFORM_THICKNESS,
        this.overlapsCentered(this.playerState.x, PLAYER_HALF_WIDTH, stairCenterX(stair.x), stair.width * 0.5));
    }
    for (const elev of this.elevators) {
      considerCeiling(elev.currentTopY - PLATFORM_THICKNESS,
        this.overlapsCentered(this.playerState.x, PLAYER_HALF_WIDTH, this.elevatorCenterX(elev.x, elev.width), elev.width * 0.5));
    }
    for (const cs of this.collapsingStairs) {
      considerCeiling(cs.topY - PLATFORM_THICKNESS, this.movableStairPhysicallyOverlaps(this.playerState.x, cs.x, cs.retractOffset));
    }
    for (const ts of this.togglableStairs) {
      considerCeiling(ts.topY - PLATFORM_THICKNESS, this.movableStairPhysicallyOverlaps(this.playerState.x, ts.x, ts.retractOffset));
    }
    return lowestCeiling !== null ? lowestCeiling - PLAYER_HEIGHT : null;
  }

  private checkSideCollision(prevX: number, nextX: number): number {
    const playerY = this.playerState.y; const playerTop = playerY + PLAYER_HEIGHT;
    const blocksAt = (x: number, leftEdge: number, width: number, topY: number): boolean => {
      const bottom = topY - PLATFORM_THICKNESS;
      if (playerTop <= bottom + 0.02 || playerY >= topY - 0.02) return false;
      return this.overlapsCentered(x, PLAYER_HALF_WIDTH, leftEdge + width * 0.5, width * 0.5);
    };
    const considerSide = (leftEdge: number, width: number, topY: number): boolean => {
      const hitsNext = blocksAt(nextX, leftEdge, width, topY);
      if (!hitsNext) return false;
      const hitsPrev = blocksAt(prevX, leftEdge, width, topY);
      return !hitsPrev;
    };
    for (const stair of this.staticStairs) { if (considerSide(stair.x, stair.width, stair.topY)) return prevX; }
    for (const elev of this.elevators) { if (considerSide(elev.x, elev.width, elev.currentTopY)) return prevX; }
    for (const cs of this.collapsingStairs) {
      if (!this.movableStairPhysicallyOverlaps(nextX, cs.x, cs.retractOffset)) continue;
      if (considerSide(cs.x - 0.5, 1, cs.topY)) return prevX;
    }
    for (const ts of this.togglableStairs) {
      if (!this.movableStairPhysicallyOverlaps(nextX, ts.x, ts.retractOffset)) continue;
      if (considerSide(ts.x - 0.5, 1, ts.topY)) return prevX;
    }
    return nextX;
  }

  private performCullingPass(camTheta: number, camY: number) {
    this.culler.cullingEnabled = this.config.cullingEnabled;
    this.culler.updateFrustum(this.camera);
    const towerMidRadius = TOWER_RADIUS + PLATFORM_DEPTH * 0.5;
    let matrixChanged = false;
    for (let i = 0; i < this.staticStairs.length; i++) {
      const stair = this.staticStairs[i];
      const isVis = this.culler.isItemVisible(stair.theta, stair.topY, towerMidRadius, PLATFORM_DEPTH, camTheta, camY);
      if (stair.wasVisible !== isVis) {
        stair.wasVisible = isVis;
        this.stairsInstancedMesh.setMatrixAt(i, isVis ? stair.defaultMatrix : stair.culledMatrix);
        matrixChanged = true;
      }
    }
    if (matrixChanged) this.stairsInstancedMesh.instanceMatrix.needsUpdate = true;
    for (let i = 0; i < this.springs.length; i++) {
      const sp = this.springs[i];
      const isVis = this.culler.isItemVisible(sp.theta, sp.topY, PLAYER_STAND_RADIUS, 0.6, camTheta, camY);
      const grp = sp.mesh?.parent as THREE.Group | undefined;
      if (grp && grp.visible !== isVis) grp.visible = isVis;
    }
    for (let i = 0; i < this.doors.length; i++) {
      const door = this.doors[i];
      const isVis = this.culler.isItemVisible(door.theta, door.topY + 1, TOWER_RADIUS + 0.25, 1.5, camTheta, camY);
      if (door.mesh.visible !== isVis) door.mesh.visible = isVis;
    }
    for (let i = 0; i < this.collapsingStairs.length; i++) {
      const cs = this.collapsingStairs[i];
      const isVis = this.culler.isItemVisible(cs.theta, cs.topY, PLAYER_STAND_RADIUS, 0.5, camTheta, camY);
      if (cs.mesh.visible !== isVis) cs.mesh.visible = isVis;
    }
    const summitVis = !this.config.cullingEnabled || camY > this.towerHeight - 22;
    if (this.topRing.visible !== summitVis) this.topRing.visible = summitVis;
    if (this.summitCrown.visible !== summitVis) this.summitCrown.visible = summitVis;
  }

  private startLoop() {
    const loop = (time: number) => {
      this.animFrameId = window.requestAnimationFrame(loop);
      if (this.config.simulatedFpsThrottle > 0) {
        const throttleInterval = 1000 / this.config.simulatedFpsThrottle;
        if (time - this.lastThrottleTime < throttleInterval) return;
        this.lastThrottleTime = time;
      }
      const rawDelta = (time - this.lastTime) / 1000;
      // W MENU nie renderujemy co klatke monitora. Kamera kraży z predkoscia
      // 0.12 rad/s (w jednej klatce 60 Hz: 0.002 rad, czyli 0.1 stopnia), wiec
      // 30 Hz jest nieodroznialne, a polowa aktualizacji canvasu to polowa
      // pracy kompozytora: panel menu jest przezroczysta warstwa DOM nad
      // plotnem WebGL skalowanym CSS-em na caly ekran, i to wlasnie mieszanie
      // tych warstw obciazalo przegladarke w menu (w grze, gdzie panelu nie ma,
      // pomiar pokazywal 0 spikow). Ruch liczony jest z czasu bezwzglednego
      // (time * 0.001), wiec predkosc obrotu pozostaje identyczna.
      if (this.sceneMode === "menu") {
        if (time - this.lastMenuRender < MENU_FRAME_MS) return;
        this.lastMenuRender = time;
      }
      this.lastTime = time;
      const frameDelta = Math.min(rawDelta, MAX_ACCUMULATOR);
      this.accumulator += frameDelta;
      let subSteps = 0;
      // Krok z pola (patrz physicsStep): przy 60 Hz renderu i kroku 1/60
      // akumulator okresowo zbiera dwa kroki w jednej klatce i postac przesuwa
      // sie o podwojny dystans — to widac jako szarpniecie przy poprawnym FPS.
      // Krok 1/120 rozbija ten skok na dwa mniejsze.
      const step = this.physicsStep;
      while (this.accumulator >= step && subSteps < 8) { this.stepPhysics(step); this.accumulator -= step; subSteps++; }
      if (subSteps >= 8) this.accumulator = 0;
      this.updateVisuals(time * 0.001, frameDelta);
      if (this.sky && (this.sky as any).material?.uniforms?.time) (this.sky as any).material.uniforms.time.value = time * 0.00005;
      if (this.water && (this.water.material as any).uniforms?.time) (this.water.material as any).uniforms.time.value += frameDelta;
      // UWAGA: nieba NIE wypiekamy w petli. Wypiek to szesc przebiegow sfery z
      // chmurami fbm (6 x 256 x 256 x ~40 sin na piksel) — zrobiony w klatce
      // daje wyrazny, REGULARNY skok. Chmury przesuwaja sie o 5e-7 jednostki na
      // sekunde, wiec drugi wypiek nie jest potrzebny w ogole: niebo powstaje
      // raz, w buildWorld (patrz bakeSky).

      // Mapa cienia MUSI odswiezac sie w KAZDEJ klatce gry. Przy autoUpdate
      // false three pomija przebieg, a needsUpdate jest zerowane po kazdym
      // przebiegu (WebGLShadowMap.js), wiec nie da sie nim wymusic odswiezania
      // co druga klatke — cien stalby w miejscu i przyklejal sie do podloza.
      // W menu mapa jest zamrozona w setSceneMode, bo scena sie tam nie zmienia.
      if (this.sceneMode === "play") this.renderer.shadowMap.autoUpdate = true;
      if (this.bloomPass.enabled) this.ensureComposer().render();
      else this.renderer.render(this.scene, this.camera);
      this.playerHudTimer += frameDelta;
      // HUD to najdroższa pozycja pętli po stronie CPU: każde wywołanie u
      // konsumenta kończy się setState i reconciliacją drzewa Reacta, a fibery
      // tworzą graf cykliczny — to on nakręca cycle collector i major GC
      // (profil: reason CC_FINISHED, mark 23 ms). Dlatego stan wysyłamy tylko
      // wtedy, gdy zmieni się COŚ WIDOCZNEGO:
      //   * zegar jest wyświetlany jako m:ss (formatTime), więc zaokrąglamy go
      //     do pełnych sekund — 10 Hz na podsekundowe ułamki było marnowane,
      //   * wynik, klejnoty, skoki, piętro i status zmieniają się rzadko
      //     (zdarzenia), więc ich zmiana i tak wyzwala natychmiastową wysyłkę.
      // Efekt: ~1 wysyłka/s zamiast 10, przy identycznym obrazie HUD.
      if (this.playerHudTimer >= 0.1) {
        this.playerHudTimer = 0;
        if (this.sceneMode === "play") {
          const hudSecond = Math.floor(this.playerState.elapsedTime);
          const hudFloor = Math.floor(this.playerState.y);
          if (
            hudSecond !== this.hudLastSecond ||
            hudFloor !== this.hudLastFloor ||
            this.playerState.score !== this.hudLastScore ||
            this.playerState.gemsCollected !== this.hudLastGems ||
            this.playerState.jumpCount !== this.hudLastJumps ||
            this.playerState.status !== this.hudLastStatus
          ) {
            this.hudLastSecond = hudSecond;
            this.hudLastFloor = hudFloor;
            this.hudLastScore = this.playerState.score;
            this.hudLastGems = this.playerState.gemsCollected;
            this.hudLastJumps = this.playerState.jumpCount;
            this.hudLastStatus = this.playerState.status;
            this.onPlayerStateUpdate?.(this.playerState);
          }
        }
      }
    };
    this.animFrameId = window.requestAnimationFrame(loop);
  }

  private updateVisuals(sec: number, dt: number = 1 / 60) {
    this.player.update(this.playerState, sec, dt);
    this.cameraRig.update(this.sceneMode, this.playerState, sec, dt);
    if (this.checkpoints.length > 0 && this.config.cullingEnabled) this.flagVisibility.update(this.camera, this.waterLevel);
    if (this.domeShards && this.domeShards.length > 0) this.updateDomeShards(dt);
    if (this.winPending) { this.winPendingTimer -= dt; if (this.winPendingTimer <= 0) { this.winPending = false; this.finishWin(); } }
    for (let i = 0; i < this.gems.length; i++) {
      const gem = this.gems[i];
      if (gem.mesh && !gem.collected) { gem.mesh.rotation.y = sec * 2.2; gem.mesh.position.y = gem.y + Math.sin(sec * 3.5 + gem.x) * 0.12; }
    }
    for (let i = 0; i < this.doors.length; i++) {
      const door = this.doors[i]; if (!door.mesh.visible) continue;
      // Wczesniej `children.find((child) => ...)` tworzylo NOWA domkniecie
      // (obiekt GC) w kazdej klatce, dla kazdych widocznych drzwi. Teraz
      // wynik szukania jest cache'owany w userData grupy — po pierwszej klatce
      // zero alokacji, a zachowanie identyczne.
      const cached = door.mesh.userData.arrow as THREE.Object3D | undefined;
      const arrow = cached ?? (door.mesh.children.find((child) => child.userData.baseY !== undefined) as THREE.Object3D | undefined);
      if (arrow) {
        door.mesh.userData.arrow = arrow;
        arrow.position.y = Number(arrow.userData.baseY) + Math.sin(sec * 4 + i) * 0.12;
      }
    }
    if (this.summitCrown && this.summitCrown.visible) {
      const trophy = this.trophy || this.summitCrown.getObjectByName("victoryTrophy");
      if (trophy && trophy instanceof THREE.Mesh) {
        trophy.rotation.y = sec * 1.5;
        const mat = trophy.material as THREE.MeshStandardMaterial;
        const allGems = this.playerState.gemsCollected >= this.playerState.totalGems && this.playerState.totalGems > 0;
        if (allGems !== trophy.userData.allGems) {
          trophy.userData.allGems = allGems;
          mat.color.set(allGems ? "#fef08a" : "#94a3b8");
          mat.emissive.set(allGems ? "#eab308" : "#1f2937");
          mat.emissiveIntensity = allGems ? 0.9 : 0.15;
        }
      }
    }
    for (let cpIdx = 0; cpIdx < this.checkpoints.length; cpIdx++) {
      const cp = this.checkpoints[cpIdx];
      const animate = cp.mesh.visible && cp.flag.visible && (!this.config.cullingEnabled || this.flagVisibility.isVisible(cp.bounds, TOWER_RADIUS, -6, this.towerHeight));
      cp.wave.update(sec, animate);
    }
    this.particles.update(dt);
    for (let i = this.waterRipples.length - 1; i >= 0; i--) {
      const ripple = this.waterRipples[i];
      const data = (ripple as any).userData as { age: number; maxAge: number };
      data.age += dt; const t = data.age / data.maxAge;
      if (t >= 1) { this.scene.remove(ripple); ripple.geometry.dispose(); (ripple.material as THREE.Material).dispose(); this.waterRipples.splice(i, 1); continue; }
      const scale = 1 + t * 8; ripple.scale.setScalar(scale);
      (ripple.material as THREE.Material & { opacity: number }).opacity = 0.65 * (1 - t);
    }
    const camTheta = Math.atan2(this.camera.position.x, this.camera.position.z);
    this.performCullingPass(camTheta, this.camera.position.y);
    this.updateAmbientAudio();
  }

  private ambientAudioFor(objX: number, objY: number) {
    return ambientSpatial(objX, objY, this.playerState.x, this.playerState.y, this.camera);
  }

  private updateAmbientAudio() {
    if (this.sceneMode !== "play" || this.playerState.status !== "running") {
      if (this.ambientAudioActive) { this.ambientAudioActive = false; soundEngine.clearAmbient(); }
      return;
    }
    if (soundEngine.isMuted() || !soundEngine.isSfxEnabled()) {
      if (this.ambientAudioActive) { this.ambientAudioActive = false; soundEngine.clearAmbient(); }
      return;
    }
    this.ambientAudioActive = true;
    // collectAmbientSources tworzy tablice i po jednym obiekcie na kazde zrodlo
    // (wrog + winda), a soundEngine.updateAmbient i tak przyjmuje je najwyzej co
    // 100 ms — zbieranie ich 60x na sekunde to czysta produkcja smieci dla GC.
    // Ten sam rytm co odbiorca: zero zbednych alokacji, brak zmiany dzwieku.
    const now = performance.now();
    if (now - this.ambientSourcesAt < 100) return;
    this.ambientSourcesAt = now;
    soundEngine.updateAmbient(
      collectAmbientSources(this.hazards, this.elevators, this.playerState.x, this.playerState.y, this.camera, this.physicsStep)
    );
  }

  private setupEvents() { window.addEventListener("keydown", this.onKeyDown); window.addEventListener("keyup", this.onKeyUp); }
  private onKeyDown = (e: KeyboardEvent) => {
    if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", " "].includes(e.key)) e.preventDefault();
    if (e.key === "ArrowLeft" || e.key.toLowerCase() === "a") this.input.left = true;
    if (e.key === "ArrowRight" || e.key.toLowerCase() === "d") this.input.right = true;
    if ((e.key === "ArrowUp" || e.key.toLowerCase() === "w" || e.key === " ") && !this.input.up) { this.input.jumpQueued = true; this.input.up = true; }
    if ((e.key === "ArrowDown" || e.key.toLowerCase() === "s") && !this.input.down) { this.input.doorQueued = true; this.input.down = true; }
  };
  private onKeyUp = (e: KeyboardEvent) => {
    if (e.key === "ArrowLeft" || e.key.toLowerCase() === "a") this.input.left = false;
    if (e.key === "ArrowRight" || e.key.toLowerCase() === "d") this.input.right = false;
    if (e.key === "ArrowUp" || e.key.toLowerCase() === "w" || e.key === " ") this.input.up = false;
    if (e.key === "ArrowDown" || e.key.toLowerCase() === "s") this.input.down = false;
  };

  public setGameStatus(status: GameStatus) { this.playerState.status = status; if (this.onGameStatusChange) this.onGameStatusChange(status); }

  /**
   * Częstotliwość kroku fizyki. Podniesienie jej (np. do 120) zmniejsza skok
   * pozycji, gdy w jednej klatce renderu zbiorą się dwa kroki — kosztem
   * proporcjonalnie większej pracy CPU na fizykę (jest tania).
   * Dostępne także z konsoli: __jellyGame.setPhysicsRate(120).
   */
  public setPhysicsRate(hz: number) {
    this.physicsStep = 1 / Math.max(30, Math.min(240, hz));
    this.accumulator = 0;
  }

  public setRenderResolution(width: number, height: number) {
    const s = this.config.renderScale; const w = width * s; const h = height * s; const aspect = w / h;
    // WCZESNE WYJSCIE: three/WebGLRenderer.setSize() NIE sprawdza, czy rozmiar
    // sie zmienil, a przypisanie canvas.width/height bez zmiany wartosci i tak
    // unieważnia bufor rysowania. W Firefoksie to wymusza alokacje nowego
    // SharedSurface i przejscie przez ImageBridge (PBackgroundChild) — czyli
    // dokladnie ten slad IPC z profilu. Wystarczy pominac wywolanie, gdy
    // rozmiar jest ten sam.
    if (this.renderWidth === w && this.renderHeight === h) return;
    this.renderWidth = w; this.renderHeight = h;
    this.renderer.setPixelRatio(1); this.renderer.setSize(w, h, false); this.composer?.setSize(w, h);
    const baseHalfHTan = Math.tan(THREE.MathUtils.degToRad(BASE_VERTICAL_FOV) / 2) * ASPECT_RATIO;
    if (aspect < ASPECT_RATIO) { const vFov = THREE.MathUtils.radToDeg(2 * Math.atan(baseHalfHTan / aspect)); this.camera.fov = Math.min(vFov, MAX_VERTICAL_FOV); } else this.camera.fov = BASE_VERTICAL_FOV;
    this.camera.aspect = aspect; this.camera.updateProjectionMatrix(); this.renderer.domElement.id = `game-canvas-${width}x${height}`;
  }

  public setSceneMode(mode: "menu" | "play") {
    this.sceneMode = mode;
    // W MENU scena jest nieruchoma (kamera tylko obraca widok), a mapa cienia
    // zalezy wylacznie od swiatla i obiektow rzucajacych cien — nie od kamery.
    // Zamrozenie autoUpdate kasuje caly przebieg cieni (2048x2048, mur,
    // instancyjne schodki, zapadnie, windy, drzwi, checkpointy, pociski) na
    // kazdej klatce menu, przy zerowej roznicy w obrazie. needsUpdate = true
    // domyka jeszcze stan przy przejsciu w obie strony.
    this.renderer.shadowMap.autoUpdate = mode === "play";
    this.renderer.shadowMap.needsUpdate = true;
    if (mode === "menu") {
      this.ignoredElevator = -1; this.resetInput();
      this.playerState.x = this.level.start.x; this.playerState.y = this.level.start.y;
      this.playerState.vx = 0; this.playerState.vy = 0; this.playerState.grounded = true; this.playerState.status = "running";
      this.playerState.elapsedTime = 0; this.playerState.jumpCount = 0; this.playerState.score = 0; this.playerState.gemsCollected = 0;
      this.playerState.smoothCamY = this.level.start.y; this.playerState.camLeadAngle = 0; this.playerState.idleTimer = 3;
      this.gems.forEach((g) => { g.collected = false; if (g.mesh) g.mesh.visible = true; });
      this.checkpoints.forEach((cp) => { cp.activated = false; }); this.activeCheckpoint = 0;
      this.collapsingStairs.forEach((cs) => { cs.state = "idle"; cs.retractOffset = 0; cs.timer = 0; });
      this.levers.forEach((l) => { l.extended = false; }); this.togglableStairs.forEach((ts) => { ts.extended = false; });
      this.resetDome();
    }
  }

  public restartGame() {
    this.ignoredElevator = -1; this.resetInput();
    this.playerState.x = this.level.start.x; this.playerState.y = this.level.start.y;
    this.playerState.vx = 0; this.playerState.vy = 0; this.playerState.grounded = true; this.playerState.rideElevator = -1;
    this.playerState.score = 0; this.playerState.gemsCollected = 0; this.playerState.jumpCount = 0; this.playerState.elapsedTime = 0;
    this.playerState.camLeadAngle = 0; this.playerState.smoothCamY = this.level.start.y; this.playerState.knockdownFloorY = null;
    this.playerState.currentStairTopY = null; this.playerState.enemyHitCooldown = 0; this.playerState.idleTimer = 2;
    this.playerState.facingYaw = Math.atan2(Math.sin(stepToTheta(this.level.start.x)), Math.cos(stepToTheta(this.level.start.x)));
    this.activeCheckpoint = 0; this.doorCooldown = 0;
    this.collapsingStairs.forEach((cs) => { cs.state = "idle"; cs.retractOffset = 0; cs.timer = 0; });
    this.levers.forEach((l) => { l.extended = false; }); this.togglableStairs.forEach((ts) => { ts.extended = false; });
    this.gems.forEach((g) => { g.collected = false; if (g.mesh) g.mesh.visible = true; });
    this.checkpoints.forEach((cp) => { cp.activated = false; if (cp.mesh) { const flagMesh = cp.mesh.children[1] as THREE.Mesh; if (flagMesh && flagMesh.material instanceof THREE.MeshStandardMaterial) { flagMesh.material.color.set("#ef4444"); flagMesh.material.emissive.set("#991b1b"); } } });
    this.resetDome();
    this.setGameStatus("running");
  }

  private resetDome() {
    this.winPending = false; this.winPendingTimer = 0; this.domeShattered = false;
    if (this.beaconDome) this.beaconDome.visible = true;
    for (const shard of this.domeShards) { this.scene.remove(shard); shard.geometry.dispose(); (shard.material as THREE.Material).dispose(); }
    this.domeShards = [];
    if (this.trophy) {
      this.trophy.userData.allGems = false;
      const mat = this.trophy.material as THREE.MeshStandardMaterial;
      mat.color.set("#94a3b8"); mat.emissive.set("#1f2937"); mat.emissiveIntensity = 0.15;
    }
  }

  private resetInput() { this.input.left = false; this.input.right = false; this.input.up = false; this.input.down = false; this.input.jumpQueued = false; this.input.doorQueued = false; }

  public dispose() {
    soundEngine.clearAmbient();
    this.player.dispose(); this.particles.dispose();
    window.cancelAnimationFrame(this.animFrameId); window.removeEventListener("keydown", this.onKeyDown); window.removeEventListener("keyup", this.onKeyUp);
    this.composer?.dispose();
    // PMREMGenerator trzyma wlasne materialy i geometrie — bez tego kazda
    // przebudowa silnika (menu <-> poziom, restart, wybor poziomu) zostawiala
    // komplet zasobow GPU.
    this.pmremGenerator?.dispose?.();
    if (this.renderer.domElement.parentElement) this.renderer.domElement.parentElement.removeChild(this.renderer.domElement);
    // KLUCZOWE DLA PAMIECI: renderer.dispose() zwalnia zasoby three, ale NIE
    // niszczy kontekstu WebGL — a kazda przebudowa silnika tworzy NOWY kontekst
    // na nowym canvasie. Stare konteksty zyja do smieciowego zebrania, kazdy z
    // wlasnymi teksturami, buforami i programami, wiec pamiec rosla z kazdym
    // wejsciem do menu i kazdym restartem poziomu. forceContextLoss() oddaje
    // pamiec GPU NATYCHMIAST.
    this.renderer.forceContextLoss();
    this.renderer.dispose();
    this.scene.traverse((obj) => { if (obj instanceof THREE.Mesh) { obj.geometry.dispose(); if (Array.isArray(obj.material)) obj.material.forEach((m) => m.dispose()); else obj.material.dispose(); } });
  }
}
