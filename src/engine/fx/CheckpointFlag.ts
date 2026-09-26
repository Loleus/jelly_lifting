import * as THREE from "three";

export const FLAG_LENGTH = 0.6;
export const FLAG_HALF_HEIGHT = 0.2;
export const FLAG_MAX_AMPLITUDE = 0.24;
export const FLAG_WAVE_BANDS = 1;
export const FLAG_WAVE_SPEED = 6;
const SEGMENTS = 16;

// Wektory pomocnicze do przeliczania normalnych — modułowe, więc ich liczba
// nie zależy od liczby klatek (patrz recomputeNormals).
const _pA = new THREE.Vector3();
const _pB = new THREE.Vector3();
const _pC = new THREE.Vector3();
const _nA = new THREE.Vector3();
const _nB = new THREE.Vector3();
const _nC = new THREE.Vector3();
const _cb = new THREE.Vector3();
const _ab = new THREE.Vector3();

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
    this.recomputeNormals();
    return true;
  }

  /**
   * To samo co BufferGeometry.computeVertexNormals(), ale BEZ alokacji.
   * Wersja z three tworzy przy KAŻDYM wywołaniu 8 obiektów Vector3 (linie
   * 1031-1033 w BufferGeometry.js), a ta metoda jest wołana co klatkę dla
   * każdej widocznej flagi — czyli setki małych obiektów na sekundę. To one
   * karmią cycle collector Gecko, który potem pracuje nawet w bezczynności.
   * Matematyka jest identyczna (akumulacja iloczynów wektorowych na wierzchołek
   * i normalizacja), więc wynik jest bit w bit ten sam.
   */
  private recomputeNormals() {
    const position = this.positions;
    const index = this.geometry.index;
    if (!index) return;
    let normal = this.geometry.getAttribute("normal") as THREE.BufferAttribute | undefined;
    if (!normal || normal.count !== position.count) {
      normal = new THREE.BufferAttribute(new Float32Array(position.count * 3), 3);
      normal.setUsage(THREE.DynamicDrawUsage);
      this.geometry.setAttribute("normal", normal);
    } else {
      for (let i = 0, il = normal.count; i < il; i++) normal.setXYZ(i, 0, 0, 0);
    }
    for (let i = 0, il = index.count; i < il; i += 3) {
      const vA = index.getX(i);
      const vB = index.getX(i + 1);
      const vC = index.getX(i + 2);
      _pA.fromBufferAttribute(position, vA);
      _pB.fromBufferAttribute(position, vB);
      _pC.fromBufferAttribute(position, vC);
      _cb.subVectors(_pC, _pB);
      _ab.subVectors(_pA, _pB);
      _cb.cross(_ab);
      _nA.fromBufferAttribute(normal, vA);
      _nB.fromBufferAttribute(normal, vB);
      _nC.fromBufferAttribute(normal, vC);
      _nA.add(_cb);
      _nB.add(_cb);
      _nC.add(_cb);
      normal.setXYZ(vA, _nA.x, _nA.y, _nA.z);
      normal.setXYZ(vB, _nB.x, _nB.y, _nB.z);
      normal.setXYZ(vC, _nC.x, _nC.y, _nC.z);
    }
    for (let i = 0, il = normal.count; i < il; i++) {
      _nA.fromBufferAttribute(normal, i);
      _nA.normalize();
      normal.setXYZ(i, _nA.x, _nA.y, _nA.z);
    }
    normal.needsUpdate = true;
  }
}