// ============================================================================
//  STAŁE SILNIKA + MATEMATYKA WIEŻY (jedyne źródło prawdy)
// ============================================================================
//  Wszystkie moduły silnika (GlowerTowerGame, player/, fx/, camera/, audio/)
//  importują stąd. Zmiana wartości tutaj = zmiana w całej grze.
// ============================================================================

/* ------------------------------ render / kadr ----------------------------- */

export const RENDER_WIDTH = 640;
export const RENDER_HEIGHT = 640;
export const ASPECT_RATIO = RENDER_WIDTH / RENDER_HEIGHT; // 1:1

// Bazowe parametry kadru. Używane do wyliczenia pionowego FOV przy innych
// proporcjach tak, aby poziome pole widzenia nigdy się nie zawężało.
export const BASE_VERTICAL_FOV = 38;
export const MAX_VERTICAL_FOV = 64;

export interface ResolutionProfile {
  id: string;
  label: string;
  width: number;
  height: number;
}

/**
 * Natywne rozdzielczości renderowania. Canvas nigdy nie renderuje w rozdzielczości
 * ekranu — zawsze w jednej z poniższych, a CSS tylko ją skaluje z zachowaniem proporcji.
 */
export const RESOLUTION_PROFILES: Record<string, ResolutionProfile> = {
  desktop: { id: "desktop", label: "640×480 · 16:9", width: 640, height: 480 },
  tabletPortrait: { id: "tabletPortrait", label: "480×640 · 3:4", width: 480, height: 640 },
  phonePortrait: { id: "phonePortrait", label: "400×660 · 10:16", width: 400, height: 660 },
  phoneLandscape: { id: "phoneLandscape", label: "640×480 · 16:9", width: 640, height: 480 },
};

/** Dobiera natywną rozdzielczość na podstawie rozmiaru okna przeglądarki. */
export function pickResolutionProfile(vw: number, vh: number): ResolutionProfile {
  const isPortrait = vh >= vw;
  const shortSide = Math.min(vw, vh);
  if (isPortrait) {
    if (shortSide < 620) return RESOLUTION_PROFILES.phonePortrait;
    return RESOLUTION_PROFILES.tabletPortrait;
  }
  return RESOLUTION_PROFILES.desktop;
}

/* ------------------------------- geometria -------------------------------- */

export const CIRCUMFERENCE_STEPS = 24;
export const STEP_HEIGHT = 1;
export const TOWER_RADIUS = 6;
export const PLATFORM_THICKNESS = 0.35;
export const PLATFORM_DEPTH = 2.4;
export const TAU = Math.PI * 2;
/** Promień, na którym stoi gracz (środek głębokości schodka). */
export const PLAYER_STAND_RADIUS = TOWER_RADIUS + PLATFORM_DEPTH * 0.5;
export const FIRST_STEP_CENTER = 0.5;
export const TOWER_ANGLE_OFFSET = -(FIRST_STEP_CENTER / CIRCUMFERENCE_STEPS) * TAU;

/* --------------------------------- gracz ---------------------------------- */

/** Pół-szerokość kolizji gracza (całe ciało: głowa, tułów, nogi). */
export const PLAYER_HALF_WIDTH = 0.16;
export const PLAYER_HEIGHT = 2.05;
/** Odległość od pivotu grupy gracza (stopy) do lokalnego zera siatki ciała. */
export const PLAYER_FOOT_OFFSET = 0.52;
export const WALK_SPEED = 3.1;
export const JUMP_SPEED = 12.0;
export const GRAVITY = 28.5;

/* -------------------------------- pętla ----------------------------------- */

/** Stały krok fizyki: 60 Hz (tempo gry nie zależy od FPS). */
export const FIXED_DT = 1 / 60;
export const MAX_ACCUMULATOR = 0.25;

/* ------------------------- matematyka obwodu wieży ------------------------ */

export const wrapValue = (value: number, size: number): number => {
  const wrapped = value % size;
  return wrapped < 0 ? wrapped + size : wrapped;
};

/** Kąt (rad) dla pozycji na obwodzie wyrażonej w krokach/schodkach. */
export const stepToTheta = (stepIndex: number): number =>
  (stepIndex / CIRCUMFERENCE_STEPS) * TAU + TOWER_ANGLE_OFFSET;

/** Czy odcinek gracza [x-hw, x+hw] nachodzi na platformę [px, px+w] (z zawinięciem). */
export const overlapsWrapped = (
  playerX: number,
  halfWidth: number,
  platformX: number,
  platformWidth: number
): boolean => {
  const tries = [playerX - CIRCUMFERENCE_STEPS, playerX, playerX + CIRCUMFERENCE_STEPS];
  return tries.some(
    (px) => px + halfWidth > platformX && px - halfWidth < platformX + platformWidth
  );
};

/** Indeks schodka [n, n+1), na którym leży dany punkt obwodu. */
export const stairIndexAt = (x: number): number =>
  Math.floor(wrapValue(x, CIRCUMFERENCE_STEPS));

/** Środek schodka o danym indeksie, w krokach obwodu. */
export const stairCenterX = (stepIndex: number): number =>
  wrapValue(stepIndex, CIRCUMFERENCE_STEPS) + 0.5;

/** Najkrótsza odległość po obwodzie (bez znaku), w krokach. */
export const wrappedStepDistance = (a: number, b: number): number => {
  const direct = Math.abs(a - b);
  return Math.min(direct, CIRCUMFERENCE_STEPS - direct);
};

/** Najkrótszy PODPISANY offset a→b po obwodzie (dodatni = rosnące X). */
export const wrappedSignedDelta = (from: number, to: number): number => {
  let d = to - from;
  if (d > CIRCUMFERENCE_STEPS / 2) d -= CIRCUMFERENCE_STEPS;
  if (d < -CIRCUMFERENCE_STEPS / 2) d += CIRCUMFERENCE_STEPS;
  return d;
};
