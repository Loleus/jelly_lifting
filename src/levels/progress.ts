export interface LevelBestScore {
  jumps: number;
  timeSec: number;
  /** Czy w najlepszym wyniku zebrano wszystkie diamenty (wyższy priorytet). */
  gotAllGems?: boolean;
}

export interface SavedProgress {
  /** Tylko poziomy zaliczone po zebraniu WSZYSTKICH klejnotów. */
  completedLevels: number[];
  /** Najwyższy aktualnie dostępny poziom, wyprowadzony z pełnych zaliczeń. */
  unlockedLevel: number;
  bestScores: Record<string, LevelBestScore>;
}

const STORAGE_KEY = "glower-tower-progress-v5";

import { TOTAL_LEVELS } from "../levels";

function getTotalLevels(): number {
  return TOTAL_LEVELS;
}

function freshProgress(): SavedProgress {
  return {
    completedLevels: [],
    unlockedLevel: 1,
    bestScores: {},
  };
}

/**
 * Następny poziom jest dostępny wyłącznie po pełnym zaliczeniu poprzedniego.
 * Nie ufamy staremu `unlockedLevel`, bo wersja sprzed tej poprawki dopisywała
 * do `completedLevels` także przejścia bez wszystkich klejnotów.
 */
function getUnlockedLevel(completedLevels: readonly number[], totalLevels: number): number {
  const cleared = new Set(completedLevels);
  let unlocked = 1;
  while (unlocked < totalLevels && cleared.has(unlocked)) unlocked++;
  return unlocked;
}

/** Zachowuje tylko ciąg pełnych zaliczeń, na które zapis ma dowód `gotAllGems`. */
function normalizeClearedLevels(
  completedLevels: unknown,
  bestScores: Record<string, LevelBestScore>,
  totalLevels: number
): number[] {
  if (!Array.isArray(completedLevels)) return [];
  const reported = new Set(
    completedLevels.filter((level): level is number =>
      typeof level === "number" && Number.isInteger(level) && level >= 1 && level <= totalLevels
    )
  );
  const cleared: number[] = [];
  for (let level = 1; level <= totalLevels; level++) {
    // `gotAllGems === true` is deliberate: legacy entries without this proof
    // must not keep an accidentally unlocked next level alive.
    if (!reported.has(level) || bestScores[String(level)]?.gotAllGems !== true) break;
    cleared.push(level);
  }
  return cleared;
}

export function loadProgress(): SavedProgress {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return freshProgress();

    const parsed = JSON.parse(raw) as Partial<SavedProgress>;
    if (!Array.isArray(parsed.completedLevels)) {
      return freshProgress();
    }

    const bestScores = parsed.bestScores && typeof parsed.bestScores === "object"
      ? parsed.bestScores
      : {};
    const completedLevels = normalizeClearedLevels(
      parsed.completedLevels,
      bestScores,
      getTotalLevels()
    );
    const progress: SavedProgress = {
      completedLevels,
      unlockedLevel: getUnlockedLevel(completedLevels, getTotalLevels()),
      bestScores,
    };

    // Jednorazowo naprawia istniejące zapisy z błędnie odblokowanymi poziomami.
    if (JSON.stringify(parsed) !== JSON.stringify(progress)) saveProgress(progress);
    return progress;
  } catch {
    return freshProgress();
  }
}

function saveProgress(progress: SavedProgress) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  } catch {
    // storage full or unavailable — no big deal
  }
}

export function markLevelCompleted(
  levelNumber: number,
  allGems: boolean,
  jumps: number,
  timeSec: number,
  totalLevels: number,
): SavedProgress {
  const progress = loadProgress();
  const completedSet = new Set(progress.completedLevels);
  // Samo dojście na szczyt nie odblokowuje kolejnego poziomu. Poziom trafia
  // do progresu dopiero po zebraniu kompletu klejnotów.
  if (allGems) completedSet.add(levelNumber);

  const bestScores = { ...progress.bestScores };
  const key = String(levelNumber);
  const existing = bestScores[key];
  // NOWY WYNIK JEST LEPSZY, GDY:
  //   1) nie było jeszcze żadnego zapisu,
  //   2) zebrano więcej gemów (allGems) niż poprzednio,
  //   3) przy tylu samych gemach: MNIEJ skoków (to kryterium główne — liczba
  //      użytych skoków), a przy RÓWNEJ liczbie skoków — KRÓTSZY czas.
  // Wcześniej warunek używał `||` zamiast zapisanej kolejności, przez co
  // zapisywał się zawsze OSTATNI wynik (np. 28 skoków w minutę nadpisywało
  // 27 skoków w 10 minut), a nie najlepszy.
  const isBetter =
    !existing ||
    (allGems && (!existing.gotAllGems ||
      jumps < existing.jumps ||
      (jumps === existing.jumps && timeSec < existing.timeSec)));
  if (isBetter) {
    bestScores[key] = { jumps, timeSec, gotAllGems: allGems };
  }

  const next: SavedProgress = {
    completedLevels: Array.from(completedSet).sort((a, b) => a - b),
    unlockedLevel: getUnlockedLevel(Array.from(completedSet), totalLevels),
    bestScores,
  };

  saveProgress(next);
  return next;
}

export function isUnlocked(levelNumber: number, progress: SavedProgress): boolean {
  return levelNumber >= 1 && levelNumber <= progress.unlockedLevel;
}

export function isCompleted(levelNumber: number, progress: SavedProgress): boolean {
  return progress.completedLevels.includes(levelNumber);
}

export function resetProgress(): SavedProgress {
  const fresh = freshProgress();
  saveProgress(fresh);
  return fresh;
}
