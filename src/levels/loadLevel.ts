import type { LevelDoor, TowerLevelDefinition } from "./levelTypes";

const requiredArrays = [
  "stairs",
  "elevators",
  "gems",
  "springs",
  "enemies",
  "checkpoints",
  "doors",
  "collapsingStairs",
  "levers",
  "togglableStairs",
] as const;

function assertFinite(value: unknown, label: string): asserts value is number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(`Level JSON: ${label} must be a finite number.`);
  }
}

/** Validates imported JSON before the level is handed to the engine. */
export function loadLevel(raw: unknown): TowerLevelDefinition {
  if (!raw || typeof raw !== "object") throw new Error("Level JSON: root must be an object.");
  const level = raw as Record<string, unknown>;
  if (level.schemaVersion !== 1) throw new Error("Level JSON: unsupported schemaVersion.");

  if (typeof level.id !== "string" || typeof level.name !== "string") {
    throw new Error("Level JSON: id and name are required.");
  }

  assertFinite(level.towerHeight, "towerHeight");
  assertFinite(level.circumferenceSteps, "circumferenceSteps");

  if (level.towerHeight < 1 || level.towerHeight > 200) {
    throw new Error("Level JSON: towerHeight out of range [1, 200].");
  }

  if (level.circumferenceSteps < 4 || level.circumferenceSteps > 64) {
    throw new Error("Level JSON: circumferenceSteps out of range [4, 64].");
  }

  const start = level.start as Record<string, unknown> | undefined;
  if (!start || typeof start !== "object") throw new Error("Level JSON: start is required.");
  assertFinite(start.x, "start.x");
  assertFinite(start.y, "start.y");

  const typed = level as unknown as TowerLevelDefinition;

  // Required arrays
  for (const key of requiredArrays) {
    if (!Array.isArray((level as Record<string, unknown>)[key])) {
      throw new Error(`Level JSON: ${key} must be an array.`);
    }
  }

  const ids = new Set<string>();
  const collections = [
    typed.stairs,
    typed.elevators,
    typed.gems,
    typed.springs,
    typed.enemies,
    typed.doors,
  ];

  for (const collection of collections) {
    for (const item of collection) {
      if (!item.id || ids.has(item.id))
        throw new Error(`Level JSON: duplicate or empty entity id '${item.id}'.`);
      ids.add(item.id);
    }
  }

  // Schodki są jedynym budulcem podłoża. `count` opisuje ile ich stoi obok siebie.
  for (const stair of typed.stairs) {
    assertFinite(stair.x, `stair ${stair.id}.x`);
    assertFinite(stair.topY, `stair ${stair.id}.topY`);
    if (stair.count !== undefined) {
      assertFinite(stair.count, `stair ${stair.id}.count`);
      if (!Number.isInteger(stair.count) || stair.count < 1) {
        throw new Error(`Level JSON: stair ${stair.id}.count must be integer >= 1.`);
      }
    }
  }

  // Validate door pairs
  const doorPairs = new Map<string, LevelDoor[]>();
  for (const door of typed.doors) {
    assertFinite(door.x, `door ${door.id}.x`);
    assertFinite(door.topY, `door ${door.id}.topY`);
    const pair = doorPairs.get(door.pairId) ?? [];
    pair.push(door);
    doorPairs.set(door.pairId, pair);
  }

  for (const [pairId, pair] of doorPairs) {
    if (pair.length !== 2)
      throw new Error(`Level JSON: door pair '${pairId}' must contain exactly two doors.`);
  }

  return typed;
}
