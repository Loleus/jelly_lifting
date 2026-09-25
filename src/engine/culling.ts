// import * as THREE from "three";
// import { isSphereBehindTower } from "./render/FlagVisibility";

// export class TowerCullingManager {
//   private frustum: THREE.Frustum = new THREE.Frustum();
//   private projScreenMatrix: THREE.Matrix4 = new THREE.Matrix4();
//   private tempSphere: THREE.Sphere = new THREE.Sphere();
//   private cameraPosition: THREE.Vector3 = new THREE.Vector3();
//   private towerRadius = 0;
//   private towerBottom = 0;
//   private towerTop = 0;

//   public cullingEnabled: boolean = true;

//   public setTowerBounds(radius: number, bottom: number, top: number) {
//     this.towerRadius = radius;
//     this.towerBottom = bottom;
//     this.towerTop = top;
//   }

//   public updateFrustum(camera: THREE.Camera) {
//     camera.updateWorldMatrix(true, false);
//     this.cameraPosition.setFromMatrixPosition(camera.matrixWorld);
//     this.projScreenMatrix.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
//     this.frustum.setFromProjectionMatrix(this.projScreenMatrix, camera.coordinateSystem, camera.reversedDepth);
//   }

//   /** Cull only when outside the frustum or fully behind the finite solid tower. */
//   public isItemVisible(
//     itemTheta: number,
//     itemY: number,
//     itemRadius: number,
//     itemBoundingRadius: number,
//     _cameraTheta?: number,
//     _cameraY?: number
//   ): boolean {
//     if (!this.cullingEnabled) return true;

//     this.tempSphere.center.set(Math.sin(itemTheta) * itemRadius, itemY, Math.cos(itemTheta) * itemRadius);
//     this.tempSphere.radius = Math.max(itemBoundingRadius, 2.5);
//     if (!this.frustum.intersectsSphere(this.tempSphere)) return false;

//     // An angle alone treats the tower as infinitely tall and hides objects
//     // protruding over its rim. Preserve partial visibility of the entire bound.
//     return !isSphereBehindTower(
//       this.tempSphere, this.cameraPosition, this.towerRadius, this.towerBottom, this.towerTop
//     );
//   }
// }
import * as THREE from "three";
import { isSphereBehindTower } from "./render/occlusion";

export class TowerCullingManager {
  private frustum: THREE.Frustum = new THREE.Frustum();
  private projScreenMatrix: THREE.Matrix4 = new THREE.Matrix4();
  private tempSphere: THREE.Sphere = new THREE.Sphere();
  private tempVec: THREE.Vector3 = new THREE.Vector3();
  private eye: THREE.Vector3 = new THREE.Vector3();

  // Angular cutoff for back-of-tower occlusion (radians). ~117°.
  public maxAngularSpread: number = 2.05;
  public verticalSpread: number = 38.0; // Generous vertical window ensuring all visible steps are rendered
  public cullingEnabled: boolean = true;

  // Real tower shaft extents. Until setTower() is called the shaft is treated as
  // boundless in Y, which keeps the legacy angular-style behaviour for callers
  // that do not model the summit.
  private towerRadius = 6.0;
  private towerBottom = -Infinity;
  private towerTop = Infinity;
  private hasFiniteTop = false;

  /** Supplies the finite tower shaft used for occlusion tests. */
  public setTower(radius: number, bottom: number, top: number) {
    this.towerRadius = radius;
    this.towerBottom = bottom;
    this.towerTop = top;
    this.hasFiniteTop = Number.isFinite(top);
  }

  public updateFrustum(camera: THREE.Camera) {
    camera.updateWorldMatrix(true, false);
    this.eye.setFromMatrixPosition(camera.matrixWorld);
    this.projScreenMatrix.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
    this.frustum.setFromProjectionMatrix(this.projScreenMatrix, camera.coordinateSystem, camera.reversedDepth);
  }

  /**
   * Vertical Window + cheap Angular reject + Frustum + Finite-Tower Occlusion.
   *
   * WYDAJNOŚĆ: kolejność testów jest od najtańszego do najdroższego, tak aby
   * odrzucić większość obiektów zanim policzymy drogi test frustum (6 płaszczyzn)
   * albo dokładne zasłonięcie walcem (kilka sqrt):
   *   1. okno pionowe (2 odejmowania),
   *   2. TANI odsiew kątowy — odrzuca „tył wieży" prawie za darmo; pomijany
   *      tylko blisko szczytu, gdzie obiekty widać górą (to naprawia znikanie
   *      pierścienia/korony/drzwi nad wieżą),
   *   3. test frustum (dla kandydatów),
   *   4. dokładne zasłonięcie skończonym walcem — tylko blisko szczytu, gdzie
   *      krok 2 został pominięty.
   */
  public isItemVisible(
    itemTheta: number,
    itemY: number,
    itemRadius: number,
    itemBoundingRadius: number,
    cameraTheta: number,
    cameraY: number
  ): boolean {
    if (!this.cullingEnabled) return true;

    // 1. Okno pionowe.
    if (Math.abs(itemY - cameraY) > this.verticalSpread + itemBoundingRadius) {
      return false;
    }

    // Blisko szczytu można patrzeć „ponad" wieżą, więc odsiew kątowy jest tam
    // niepoprawny. Margines 4 j. nad krawędzią górną obejmuje pierścień i koronę.
    const nearSummit =
      this.hasFiniteTop &&
      (cameraY > this.towerTop - 8 || itemY > this.towerTop - 4);

    // 2. TANI odsiew kątowy (jak w oryginale) — poza strefą szczytu.
    if (!nearSummit) {
      let dTheta = (itemTheta - cameraTheta) % (Math.PI * 2);
      if (dTheta > Math.PI) dTheta -= Math.PI * 2;
      if (dTheta < -Math.PI) dTheta += Math.PI * 2;
      const angularThreshold = this.maxAngularSpread + itemBoundingRadius / itemRadius;
      if (Math.abs(dTheta) > angularThreshold) return false;
    }

    // 3. Test frustum (dla kandydatów).
    const wx = Math.sin(itemTheta) * itemRadius;
    const wz = Math.cos(itemTheta) * itemRadius;
    this.tempVec.set(wx, itemY, wz);
    this.tempSphere.set(this.tempVec, Math.max(itemBoundingRadius, 2.5));

    if (!this.frustum.intersectsSphere(this.tempSphere)) return false;

    // 4. Dokładne zasłonięcie skończonym walcem — tylko w strefie szczytu,
    //    bo tam pominęliśmy tani odsiew kątowy (krok 2).
    if (
      nearSummit &&
      isSphereBehindTower(this.tempSphere, this.eye, this.towerRadius, this.towerBottom, this.towerTop)
    ) {
      return false;
    }

    return true;
  }
}
