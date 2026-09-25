// import * as THREE from "three";

// /** Conservative occlusion: the complete viewing cone must cross solid tower. */
// export function isSphereBehindTower(
//   sphere: THREE.Sphere,
//   eye: THREE.Vector3,
//   towerRadius: number,
//   towerBottom: number,
//   towerTop: number
// ): boolean {
//   const dx = sphere.center.x - eye.x;
//   const dy = sphere.center.y - eye.y;
//   const dz = sphere.center.z - eye.z;
//   const distanceSq = dx * dx + dy * dy + dz * dz;
//   const horizontalSq = dx * dx + dz * dz;
//   const radiusSq = sphere.radius * sphere.radius;
//   if (distanceSq <= radiusSq || horizontalSq < 1e-8) return false;

//   const distance = Math.sqrt(distanceSq);
//   const t = -(eye.x * dx + eye.z * dz) / horizontalSq;
//   if (t <= 0 || t >= 1 - sphere.radius / distance) return false;

//   const coneRadius = t * distance * sphere.radius / Math.sqrt(distanceSq - radiusSq);
//   const innerRadius = towerRadius - coneRadius - 0.01;
//   const x = eye.x + t * dx;
//   const y = eye.y + t * dy;
//   const z = eye.z + t * dz;
//   return innerRadius > 0 && x * x + z * z < innerRadius * innerRadius &&
//     y - coneRadius > towerBottom && y + coneRadius < towerTop;
// }

// /** CPU animation visibility, independent of Object3D.visible and shadow culling. */
// export class FlagVisibility {
//   private readonly mainFrustum = new THREE.Frustum();
//   private readonly reflectionFrustum = new THREE.Frustum();
//   private readonly matrix = new THREE.Matrix4();
//   private readonly rotation = new THREE.Matrix4();
//   private readonly eye = new THREE.Vector3();
//   private readonly target = new THREE.Vector3();
//   private readonly mirror = new THREE.PerspectiveCamera();
//   private reflectionEnabled = false;
//   private waterY = 0;

//   update(camera: THREE.PerspectiveCamera, waterY: number) {
//     camera.updateWorldMatrix(true, false);
//     this.eye.setFromMatrixPosition(camera.matrixWorld);
//     this.matrix.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
//     this.mainFrustum.setFromProjectionMatrix(this.matrix, camera.coordinateSystem, camera.reversedDepth);
//     this.waterY = waterY;
//     this.reflectionEnabled = this.eye.y >= waterY;
//     if (!this.reflectionEnabled) return;

//     // Match Water.js's reflected position/orientation. Omitting its oblique near
//     // clip makes the animation test conservative, so reflections never go stale.
//     this.rotation.extractRotation(camera.matrixWorld);
//     this.target.set(0, 0, -1).applyMatrix4(this.rotation).add(this.eye);
//     this.target.y = 2 * waterY - this.target.y;
//     this.mirror.position.set(this.eye.x, 2 * waterY - this.eye.y, this.eye.z);
//     this.mirror.up.set(0, 1, 0).applyMatrix4(this.rotation);
//     this.mirror.up.x *= -1;
//     this.mirror.up.z *= -1;
//     this.mirror.lookAt(this.target);
//     this.mirror.updateMatrixWorld(true);
//     this.matrix.multiplyMatrices(camera.projectionMatrix, this.mirror.matrixWorldInverse);
//     this.reflectionFrustum.setFromProjectionMatrix(this.matrix, camera.coordinateSystem, camera.reversedDepth);
//   }

//   isVisible(sphere: THREE.Sphere, towerRadius: number, towerBottom: number, towerTop: number): boolean {
//     if (this.mainFrustum.intersectsSphere(sphere) &&
//         !isSphereBehindTower(sphere, this.eye, towerRadius, towerBottom, towerTop)) return true;
//     return this.reflectionEnabled && sphere.center.y + sphere.radius >= this.waterY &&
//       this.reflectionFrustum.intersectsSphere(sphere) &&
//       !isSphereBehindTower(sphere, this.mirror.position, towerRadius, towerBottom, towerTop);
//   }
// }




import * as THREE from "three";
import { isSphereBehindTower } from "./occlusion";

// Re-exported so existing callers/tests keep a single, shared implementation.
export { isSphereBehindTower };

/** CPU animation visibility, independent of Object3D.visible and shadow culling. */
export class FlagVisibility {
  private readonly mainFrustum = new THREE.Frustum();
  private readonly reflectionFrustum = new THREE.Frustum();
  private readonly matrix = new THREE.Matrix4();
  private readonly rotation = new THREE.Matrix4();
  private readonly eye = new THREE.Vector3();
  private readonly target = new THREE.Vector3();
  private readonly mirror = new THREE.PerspectiveCamera();
  private reflectionEnabled = false;
  private waterY = 0;

  update(camera: THREE.PerspectiveCamera, waterY: number) {
    camera.updateWorldMatrix(true, false);
    this.eye.setFromMatrixPosition(camera.matrixWorld);
    this.matrix.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
    this.mainFrustum.setFromProjectionMatrix(this.matrix, camera.coordinateSystem, camera.reversedDepth);
    this.waterY = waterY;
    this.reflectionEnabled = this.eye.y >= waterY;
    if (!this.reflectionEnabled) return;

    // Match Water.js's reflected position/orientation. Omitting its oblique near
    // clip makes the animation test conservative, so reflections never go stale.
    this.rotation.extractRotation(camera.matrixWorld);
    this.target.set(0, 0, -1).applyMatrix4(this.rotation).add(this.eye);
    this.target.y = 2 * waterY - this.target.y;
    this.mirror.position.set(this.eye.x, 2 * waterY - this.eye.y, this.eye.z);
    this.mirror.up.set(0, 1, 0).applyMatrix4(this.rotation);
    this.mirror.up.x *= -1;
    this.mirror.up.z *= -1;
    this.mirror.lookAt(this.target);
    this.mirror.updateMatrixWorld(true);
    this.matrix.multiplyMatrices(camera.projectionMatrix, this.mirror.matrixWorldInverse);
    this.reflectionFrustum.setFromProjectionMatrix(this.matrix, camera.coordinateSystem, camera.reversedDepth);
  }

  isVisible(sphere: THREE.Sphere, towerRadius: number, towerBottom: number, towerTop: number): boolean {
    if (this.mainFrustum.intersectsSphere(sphere) &&
        !isSphereBehindTower(sphere, this.eye, towerRadius, towerBottom, towerTop)) return true;
    return this.reflectionEnabled && sphere.center.y + sphere.radius >= this.waterY &&
      this.reflectionFrustum.intersectsSphere(sphere) &&
      !isSphereBehindTower(sphere, this.mirror.position, towerRadius, towerBottom, towerTop);
  }
}