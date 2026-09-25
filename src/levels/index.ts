import { loadLevel } from "./loadLevel";
import type { TowerLevelDefinition } from "./levelTypes";

// Vite glob import automatically discovers every future lvl_XXXX.level.json file.
// Filenames define the order, so adding lvl_0003.level.json is enough to add a level.
const levelModules = import.meta.glob<{ default: unknown }>(
  "./lvl_*.level.json",
  { eager: true }
);

export const LEVELS: TowerLevelDefinition[] = Object.keys(levelModules)
  .sort()
  .map((path) => loadLevel(levelModules[path].default));

export const TOTAL_LEVELS = LEVELS.length;

/** Level to show in the background of the main menu — first unfinished. */
export function menuLevelIndex(progress: { completedLevels: number[] }): number {
  for (let i = 0; i < LEVELS.length; i++) {
    if (!progress.completedLevels.includes(i + 1)) return i;
  }
  return LEVELS.length - 1;
}
