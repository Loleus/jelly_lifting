export interface LevelStart {
  x: number;
  y: number;
}

/**
 * Pojedynczy schodek na obwodzie wieży.
 *
 * Platformy nie istnieją jako osobny model. Szeroką półkę buduje się przez
 * `count` — tyle samych schodków ustawionych obok siebie w poziomie,
 * zaczynając od `x` i idąc w stronę rosnących kroków obwodu.
 */
export interface LevelStair {
  id: string;
  /** Pozycja pierwszego schodka w krokach obwodu (0..circumferenceSteps). */
  x: number;
  /** Wysokość górnej powierzchni schodka. */
  topY: number;
  /** Ile schodków obok siebie. Domyślnie 1. Większa wartość = platforma. */
  count?: number;
}

export interface LevelElevator {
  id: string;
  x: number;
  width: number;
  yMin: number;
  yMax: number;
  speed: number;
  phase: number;
}

export interface LevelGem {
  id: string;
  x: number;
  y: number;
}

export interface LevelSpring {
  id: string;
  x: number;
  topY: number;
  bounceForce: number;
}

export interface LevelEnemy {
  id: string;
  xCenter: number;
  y: number;
  /** bounce, patrol, static — domyślnie bounce */
  behavior?: "bounce" | "patrol" | "static";
  /** Wysokość odbicia (bounce) albo zasięg patrolu (patrol) */
  amplitude?: number;
  /** Prędkość w radianach na sekundę (patrol) */
  speed?: number;
  /** Ile schodków pokonuje podczas jednego odbicia; 0 = odbija się w miejscu. */
  moveSteps?: number;
  /** Początkowy kierunek skoku po schodkach. */
  direction?: -1 | 1;
}

export interface LevelCheckpoint {
  id: number;
  name: string;
  floor: number;
  x: number;
  y: number;
}

export interface LevelDoor {
  id: string;
  pairId: string;
  x: number;
  topY: number;
  color?: string;
}

export interface LevelLever { id: string; x: number; topY: number; }
export interface LevelTogglableStair { id: string; x: number; topY: number; leverId: string; }
export interface LevelCollapsingStair {
  id: string;
  x: number;
  topY: number;
}

export interface TowerLevelDefinition {
  schemaVersion: 1;
  id: string;
  name: string;
  towerHeight: number;
  circumferenceSteps: number;
  start: LevelStart;
  /** Jedyny budulec podłoża — schodki. Platformy = kilka schodków obok siebie. */
  stairs: LevelStair[];
  elevators: LevelElevator[];
  gems: LevelGem[];
  springs: LevelSpring[];
  enemies: LevelEnemy[];
  checkpoints: LevelCheckpoint[];
  doors: LevelDoor[];
  collapsingStairs: LevelCollapsingStair[];
  levers: LevelLever[];
  togglableStairs: LevelTogglableStair[];
}
