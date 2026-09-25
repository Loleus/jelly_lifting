import * as THREE from "three";

export const FLAG_LENGTH = 0.6;
export const FLAG_HALF_HEIGHT = 0.2;
export const FLAG_MAX_AMPLITUDE = 0.24;
export const FLAG_WAVE_BANDS = 1;
export const FLAG_WAVE_SPEED = 6;
const SEGMENTS = 16;

/** Keeps the last deformed surface available to the shadow pass while asleep. */
export class CheckpointFlag {
  readonly geometry = new THREE.BufferGeometry();
  private readonly positions: THREE.Float32BufferAttribute;
  private readonly amplitudes = new Float64Array(SEGMENTS + 1);
  private readonly phases = new Float64Array(SEGMENTS + 1);
  private lastTime = Number.NaN;

  constructor() {
    const vertices: number[] = [];
    const indices: number[] = [];
    for (let i = 0; i < SEGMENTS; i++) {
      const u = i / SEGMENTS;
      const x = u * FLAG_LENGTH;
      const h = FLAG_HALF_HEIGHT * (1 - u);
      vertices.push(x, h, 0, x, -h, 0);
      const top = i * 2;
      indices.push(top, top + 1, top + 2);
      if (i < SEGMENTS - 1) indices.push(top + 1, top + 3, top + 2);
    }
    vertices.push(FLAG_LENGTH, 0, 0);
    this.positions = new THREE.Float32BufferAttribute(vertices, 3);
    this.positions.setUsage(THREE.DynamicDrawUsage);
    this.geometry.setAttribute("position", this.positions);
    this.geometry.setIndex(indices);
    this.geometry.computeVertexNormals();
    (this.geometry.getAttribute("normal") as THREE.BufferAttribute).setUsage(THREE.DynamicDrawUsage);

    for (let i = 0; i <= SEGMENTS; i++) {
      const u = this.positions.getX(i * 2) / FLAG_LENGTH;
      this.amplitudes[i] = FLAG_MAX_AMPLITUDE * u;
      this.phases[i] = Math.PI * 2 * FLAG_WAVE_BANDS * u;
    }

    // One conservative bound for every wave phase, including Float32 rounding.
    const margin = 0.001;
    this.geometry.boundingBox = new THREE.Box3(
      new THREE.Vector3(-margin, -FLAG_HALF_HEIGHT - margin, -FLAG_MAX_AMPLITUDE - margin),
      new THREE.Vector3(FLAG_LENGTH + margin, FLAG_HALF_HEIGHT + margin, FLAG_MAX_AMPLITUDE + margin)
    );
    this.geometry.boundingSphere = this.geometry.boundingBox.getBoundingSphere(new THREE.Sphere());
  }

  update(seconds: number, visibleInColorPass: boolean): boolean {
    if (!visibleInColorPass || seconds === this.lastTime) return false;
    this.lastTime = seconds;
    const timePhase = seconds * FLAG_WAVE_SPEED;
    for (let i = 0; i <= SEGMENTS; i++) {
      const z = this.amplitudes[i] * Math.sin(this.phases[i] - timePhase);
      this.positions.setZ(i * 2, z);
      if (i < SEGMENTS) this.positions.setZ(i * 2 + 1, z);
    }
    this.positions.needsUpdate = true;
    // Only awake flags need new normals; leaving them flat changes the lighting.
    this.geometry.computeVertexNormals();
    return true;
  }
}