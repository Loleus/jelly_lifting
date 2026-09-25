import * as THREE from "three";

const _point = new THREE.Vector3();

/**
 * Conservative test: is `sphere` completely hidden behind the tower shaft?
 *
 * The tower is a FINITE cylinder (radius `towerRadius`, spanning
 * `towerBottom` … `towerTop`). This matters near the summit: objects above the
 * tower top — or seen from a camera above it — are visible even at large angles
 * around the shaft, because you can see over the top. An angular-only test
 * (tacitly assuming an infinite cylinder) wrongly culls them and they visibly
 * pop out of existence.
 *
 * Returns true only when the whole viewing cone to the sphere is blocked by
 * solid tower, i.e. it is safe to cull.
 */
export function isSphereBehindTower(
  sphere: THREE.Sphere,
  eye: THREE.Vector3,
  towerRadius: number,
  towerBottom: number,
  towerTop: number
): boolean {
  const dx = sphere.center.x - eye.x;
  const dy = sphere.center.y - eye.y;
  const dz = sphere.center.z - eye.z;
  const distanceSq = dx * dx + dy * dy + dz * dz;
  const horizontalSq = dx * dx + dz * dz;
  const radiusSq = sphere.radius * sphere.radius;
  if (distanceSq <= radiusSq || horizontalSq < 1e-8) return false;

  const distance = Math.sqrt(distanceSq);
  // Closest approach of the eye→sphere segment to the tower axis (in XZ).
  const t = -(eye.x * dx + eye.z * dz) / horizontalSq;
  if (t <= 0 || t >= 1 - sphere.radius / distance) return false;

  // Half-width of the tangent cone at that point — shrink the tower by it, so
  // the sphere must be fully covered (never culls something partly visible).
  const coneRadius = t * distance * sphere.radius / Math.sqrt(distanceSq - radiusSq);
  const innerRadius = towerRadius - coneRadius - 0.01;
  _point.set(eye.x + t * dx, eye.y + t * dy, eye.z + t * dz);

  return (
    innerRadius > 0 &&
    _point.x * _point.x + _point.z * _point.z < innerRadius * innerRadius &&
    _point.y - coneRadius > towerBottom &&
    _point.y + coneRadius < towerTop
  );
}
