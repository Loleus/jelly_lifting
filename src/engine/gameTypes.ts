import * as THREE from "three";

export type GameStatus = "running" | "gameover" | "win" | "paused";

/**
 * Pojedynczy schodek — jedyna powierzchnia, po której chodzi gracz.
 * Platformy powstają przez ustawienie kilku schodków obok siebie.
 */
export interface StairDef {
  id: string;
  x: number; // krok obwodu (0..24)
  width: number; // zawsze 1 krok
  topY: number;
}

export interface ElevatorDef {
  id: string;
  x: number;
  width: number;
  yMin: number;
  yMax: number;
  speed: number;
  phase: number;
  mesh?: THREE.Mesh;
  light?: THREE.PointLight;
  currentTopY: number;
  theta: number;
}

export interface GemDef {
  id: string;
  x: number;
  y: number;
  mesh?: THREE.Mesh;
  collected: boolean;
  theta: number;
}

export interface SpringDef {
  id: string;
  x: number;
  topY: number;
  bounceForce: number;
  mesh?: THREE.Mesh;
  theta: number;
  cooldown: number;
}

export interface HazardDef {
  id: string;
  x: number;
  y: number;
  behavior: "bounce" | "patrol" | "static";
  amplitude: number;
  speed: number;
  currentX: number;
  bounceElapsed: number;
  bounceDuration: number;
  bounceBaseY: number;
  bounceFromX: number;
  bounceToX: number;
  moveSteps: number;
  direction: -1 | 1;
  mesh?: THREE.Mesh;
  theta: number;
}

export interface DoorDef {
  id: string;
  pairId: string;
  x: number;
  topY: number;
  color: string;
  theta: number;
  mesh: THREE.Group;
}

export interface Particle {
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  color: THREE.Color;
  size: number;
  life: number;
  maxLife: number;
}

export interface EngineConfig {
  cullingEnabled: boolean;
  simulatedFpsThrottle: number; // 0 = uncapped, 30 = 30fps, 15 = 15fps
  filterMode: "crisp" | "smooth" | "crt";
  renderScale: 1 | 2;
  /**
   * Główny wyłącznik dźwięku. DOMYŚLNIE `true` (wyciszony) — już w menu.
   * Odmutowanie przez użytkownika jest zarazem zezwoleniem na odtwarzanie
   * audio (wymóg gestu użytkownika m.in. na iOS Safari).
   */
  soundMuted: boolean;
  /** Efekty dźwiękowe (skok, lądowanie, diament…). Niezależne od muzyki. */
  sfxEnabled: boolean;
  /** Melodie (menu / rozgrywka). Niezależne od efektów. */
  musicEnabled: boolean;
}

export interface LeverDef { id: string; x: number; topY: number; theta: number; mesh: THREE.Group; extended: boolean; }
export interface TogglableStairDef { id: string; x: number; topY: number; leverId: string; theta: number; mesh: THREE.Group; extended: boolean; retractOffset: number; }
export interface CollapsingStairDef {
  id: string;
  x: number;
  topY: number;
  theta: number;
  mesh: THREE.Group;
  state: string;
  timer: number;
  retractOffset: number;
}

export interface Checkpoint {
  id: number;
  name: string;
  floor: number;
  x: number;
  y: number;
  activated: boolean;
  mesh?: THREE.Mesh;
}

declare global {
  interface Window {
    __fontsLoaded: boolean;
  }
}

export {};
