import React, { useState, useMemo, useRef, useEffect } from "react";
import {
  ArrowLeft,
  Copy,
  Download,
  Upload,
  Play,
  CheckCircle2,
  AlertTriangle,
  Layers,
  Eye,
  RotateCcw,
  XCircle,
} from "lucide-react";
import type { LevelStair, TowerLevelDefinition } from "../levels/levelTypes";
import { loadLevel } from "../levels/loadLevel";
import { LEVELS } from "../levels";

interface LevelEditorScreenProps {
  level: TowerLevelDefinition;
  onLevelChange: (next: TowerLevelDefinition) => void;
  onBackToMenu: () => void;
  onTestLevelIn3D: (level: TowerLevelDefinition) => void;
}

type ToolType =
  | "stair"
  | "collapsing"
  | "gem"
  | "spring"
  | "enemy_patrol"
  | "enemy_bounce"
  | "checkpoint"
  | "elevator"
  | "lever_pair"
  | "door_pair"
  | "erase";

interface ValidationIssue {
  type: "error" | "warning" | "ok";
  message: string;
}

const EDITOR_STORAGE_KEY = "glower-editor-level-v3";

// Neonowo-fluorescencyjne kolory dla par drzwi — zgodne z nową paletą
const DOOR_PORTAL_COLORS = [
  "#00E5FF", // neon cyan
  "#FF00E5", // neon magenta
  "#FFF600", // neon yellow
  "#39FF14", // neon green
  "#FF3131", // neon red
  "#FF6EC7", // neon pink
  "#7F5AF6", // neon violet
];

export function createBlankLevel(idNum: number = 41): TowerLevelDefinition {
  return {
    schemaVersion: 1,
    id: `lvl_${String(idNum).padStart(4, "0")}`,
    name: `Nowy Poziom ${idNum}`,
    towerHeight: 48,
    circumferenceSteps: 24,
    start: { x: 1, y: 0.5 },
    stairs: [
      { id: "st-start", x: 0, topY: 0, count: 3 },
      { id: "st-summit", x: 12, topY: 48, count: 5 },
    ],
    elevators: [],
    gems: [
      { id: "g01", x: 1.5, y: 0 },
      { id: "g02", x: 11.5, y: 12 },
      { id: "g03", x: 21.5, y: 24 },
      { id: "g04", x: 7.5, y: 36 },
      { id: "g05", x: 14.5, y: 48 },
    ],
    springs: [],
    enemies: [],
    checkpoints: [
      { id: 1, name: "Punkt I", floor: 12, x: 10, y: 12 },
      { id: 2, name: "Punkt II", floor: 24, x: 20, y: 24 },
      { id: 3, name: "Punkt III", floor: 36, x: 6, y: 36 },
      { id: 4, name: "Punkt IV", floor: 48, x: 13, y: 48 },
    ],
    collapsingStairs: [],
    levers: [],
    togglableStairs: [],
    doors: [],
  };
}

export function loadEditorLevel(): TowerLevelDefinition {
  try {
    const raw = localStorage.getItem(EDITOR_STORAGE_KEY);
    if (raw) {
      const saved = loadLevel(JSON.parse(raw));
      // Migracja starszego projektu edytora: silnik sam buduje podłoże pod
      // checkpointem, więc techniczne schodki cp_st_* nie są potrzebne w JSON.
      saved.stairs = saved.stairs.filter((stair) => !stair.id.startsWith("cp_st_"));
      // Klejnoty w JSON mają X przesunięte o 0.5 względem kafelka siatki.
      saved.gems.forEach((gem) => {
        gem.x = Math.floor(gem.x) + 0.5;
      });
      return normalizeCheckpointIds(saved);
    }
  } catch {
    /* ignore fallback */
  }
  return createBlankLevel(41);
}

export function saveEditorLevel(level: TowerLevelDefinition) {
  try {
    const normalized = normalizeCheckpointIds(JSON.parse(JSON.stringify(level)));
    localStorage.setItem(EDITOR_STORAGE_KEY, JSON.stringify(normalized));
  } catch {
    /* quota ignore */
  }
}

/**
 * Checkpoint 1 jest zawsze najniżej na wieży. Przy tym samym Y kolejność
 * rozstrzyga X. Funkcja mutuje przekazany level, aby zapis i podgląd były zgodne.
 */
function normalizeCheckpointIds(level: TowerLevelDefinition): TowerLevelDefinition {
  level.checkpoints
    .sort((a, b) => a.y - b.y || a.x - b.x)
    .forEach((checkpoint, index) => {
      checkpoint.id = index + 1;
    });
  return level;
}

/** Formatuje pojedynczy obiekt na dokładnie jedną linię, np. { "id": "st-01", "x": 0, "topY": 0, "count": 3 } */
function formatItem(obj: Record<string, unknown>): string {
  const pairs = Object.entries(obj)
    .filter(([_, v]) => v !== undefined)
    .map(([k, v]) => `"${k}": ${JSON.stringify(v)}`);
  return `{ ${pairs.join(", ")} }`;
}

/** Formatuje cały level do JSON-a z jednoliniowymi obiektami: dokładnie jedno id na jedną linię */
export function formatLevelJson(lvl: TowerLevelDefinition): string {
  // Formatowany JSON zawsze ma checkpointy ułożone od najniższego do najwyższego.
  const level = normalizeCheckpointIds(JSON.parse(JSON.stringify(lvl)));
  const formatArray = (arr: unknown[], indent = "    "): string => {
    if (!arr || arr.length === 0) return "[]";
    const items = arr
      .map((item) => `${indent}${formatItem(item as Record<string, unknown>)}`)
      .join(",\n");
    return `[\n${items}\n  ]`;
  };

  const lines = [
    "{",
    `  "schemaVersion": ${level.schemaVersion ?? 1},`,
    `  "id": ${JSON.stringify(level.id)},`,
    `  "name": ${JSON.stringify(level.name)},`,
    `  "towerHeight": ${level.towerHeight},`,
    `  "circumferenceSteps": ${level.circumferenceSteps},`,
    `  "start": ${formatItem(level.start as unknown as Record<string, unknown>)},`,
    `  "stairs": ${formatArray(level.stairs)},`,
    `  "elevators": ${formatArray(level.elevators)},`,
    `  "gems": ${formatArray(level.gems)},`,
    `  "springs": ${formatArray(level.springs)},`,
    `  "enemies": ${formatArray(level.enemies)},`,
    `  "checkpoints": ${formatArray(level.checkpoints)},`,
    `  "collapsingStairs": ${formatArray(level.collapsingStairs)},`,
    `  "levers": ${formatArray(level.levers)},`,
    `  "togglableStairs": ${formatArray(level.togglableStairs)},`,
    `  "doors": ${formatArray(level.doors)}`,
    "}",
  ];
  return lines.join("\n");
}

export const LevelEditorScreen: React.FC<LevelEditorScreenProps> = ({
  level,
  onLevelChange,
  onBackToMenu,
  onTestLevelIn3D,
}) => {
  const [activeTool, setActiveTool] = useState<ToolType>("stair");

  // ── Parametry Schodka: count 1..23 ────────────────────────────────────
  const [stairCount, setStairCount] = useState<number>(2);

  // ── Parametry Windy: zakres 1..48 oraz prędkość ───────────────────────
  const [elevatorRange, setElevatorRange] = useState<number>(12);
  const [elevatorSpeed, setElevatorSpeed] = useState<number>(0.75);

  // ── Parametry Wroga Patrol ────────────────────────────────────────────
  const [patrolAmplitude, setPatrolAmplitude] = useState<number>(1.5);
  const [patrolSpeed, setPatrolSpeed] = useState<number>(1.4);

  // ── Parametry Wroga Bounce ────────────────────────────────────────────
  const [bounceAmplitude, setBounceAmplitude] = useState<number>(1.5);
  const [bounceMoveSteps, setBounceMoveSteps] = useState<number>(0);
  const [bounceSpeed, setBounceSpeed] = useState<number>(1.2);

  // ── Stan sekwencyjnego stawiania (Krok 2) ─────────────────────────────
  const [pendingLever, setPendingLever] = useState<{
    id: string;
    x: number;
    topY: number;
    stairId: string;
    previousStair?: LevelStair;
  } | null>(null);

  const [pendingDoor, setPendingDoor] = useState<{
    pairId: string;
    firstDoorId: string;
    x: number;
    topY: number;
    color: string;
    stairId: string;
    previousStair?: LevelStair;
  } | null>(null);

  const [viewTab, setViewTab] = useState<"grid2d" | "json" | "validator">("grid2d");
  const [hoveredCell, setHoveredCell] = useState<{ x: number; y: number } | null>(null);
  const [showJumpArcs, setShowJumpArcs] = useState<boolean>(true);
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);
  const [springWarning, setSpringWarning] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    saveEditorLevel(level);
  }, [level]);

  const updateLevel = (mutate: (draft: TowerLevelDefinition) => void) => {
    const next: TowerLevelDefinition = JSON.parse(JSON.stringify(level));
    mutate(next);
    onLevelChange(normalizeCheckpointIds(next));
  };

  const cancelPendingPlacement = () => {
    if (pendingLever) {
      updateLevel((next) => {
        next.levers = next.levers.filter((lever) => lever.id !== pendingLever.id);
        next.togglableStairs = next.togglableStairs.filter(
          (stair) => stair.leverId !== pendingLever.id
        );
        next.stairs = next.stairs.filter((stair) => stair.id !== pendingLever.stairId);
        if (pendingLever.previousStair) next.stairs.push(pendingLever.previousStair);
      });
    } else if (pendingDoor) {
      updateLevel((next) => {
        next.doors = next.doors.filter((door) => door.id !== pendingDoor.firstDoorId);
        next.stairs = next.stairs.filter((stair) => stair.id !== pendingDoor.stairId);
        if (pendingDoor.previousStair) next.stairs.push(pendingDoor.previousStair);
      });
    }
    setPendingLever(null);
    setPendingDoor(null);
  };

  const handleEditorBack = () => {
    cancelPendingPlacement();
    onBackToMenu();
  };

  // ── Walidacja poziomu ──────────────────────────────────────────────────
  const validation = useMemo(() => {
    const issues: ValidationIssue[] = [];

    const allX: { label: string; x: number }[] = [];
    level.stairs.forEach((s) => allX.push({ label: `Schodek ${s.id}`, x: s.x }));
    level.springs.forEach((s) => allX.push({ label: `Sprężyna ${s.id}`, x: s.x }));
    level.enemies.forEach((e) => allX.push({ label: `Wróg ${e.id}`, x: e.xCenter }));
    level.collapsingStairs.forEach((c) => allX.push({ label: `Zapadnia ${c.id}`, x: c.x }));
    level.levers.forEach((l) => allX.push({ label: `Dźwignia ${l.id}`, x: l.x }));
    level.elevators.forEach((el) => allX.push({ label: `Winda ${el.id}`, x: el.x }));
    level.doors.forEach((d) => allX.push({ label: `Drzwi ${d.id}`, x: d.x }));
    level.checkpoints.forEach((c) => allX.push({ label: `Checkpoint ${c.id}`, x: c.x }));

    allX.forEach((item) => {
      if (!Number.isInteger(item.x) || item.x < 0 || item.x > 23) {
        issues.push({
          type: "error",
          message: `${item.label} ma niecałkowite lub błędne X=${item.x}, wymagane całkowite 0..23`,
        });
      }
    });

    // Klejnot jest jedynym elementem osadzanym w środku kafelka: X=n+0.5.
    level.gems.forEach((gem) => {
      if (
        gem.x < 0.5 ||
        gem.x > 23.5 ||
        !Number.isInteger(gem.x - 0.5)
      ) {
        issues.push({
          type: "error",
          message: `Klejnot ${gem.id} ma X=${gem.x}, wymagany środek kafelka n+0.5`,
        });
      }
    });

    level.stairs.forEach((st) => {
      const c = st.count ?? 1;
      if (!Number.isInteger(c) || c < 1 || c > 23) {
        issues.push({
          type: "error",
          message: `Schodek ${st.id} ma count=${c}, dozwolone całkowite 1..23`,
        });
      }
    });

    const stairsByX = new Map<number, number[]>();
    level.stairs.forEach((st) => {
      const count = st.count ?? 1;
      for (let i = 0; i < count; i++) {
        const cx = (st.x + i) % 24;
        const list = stairsByX.get(cx) ?? [];
        list.push(st.topY);
        stairsByX.set(cx, list);
      }
    });
    stairsByX.forEach((yList, xVal) => {
      yList.sort((a, b) => a - b);
      for (let i = 0; i < yList.length - 1; i++) {
        const dy = yList[i + 1] - yList[i];
        if (dy > 0.01 && dy < 1.95) {
          issues.push({
            type: "warning",
            message: `Kolumna X=${xVal}: schodki na Y=${yList[i]} i Y=${yList[i + 1]} w odstępie ${dy.toFixed(1)}, min zalecane 2.0`,
          });
        }
      }
    });

    level.enemies.forEach((en) => {
      if (en.y >= 48) {
        issues.push({
          type: "error",
          message: `Wróg ${en.id} jest na szczycie Y=${en.y}, szczyt musi być wolny od wrogów`,
        });
      }
    });

    level.springs.forEach((sp) => {
      const hasStair = level.stairs.some((st) => {
        const count = st.count ?? 1;
        const inX = (((sp.x - st.x) % 24) + 24) % 24 < count;
        return inX && Math.abs(st.topY - sp.topY) < 0.1;
      });
      if (!hasStair) {
        issues.push({
          type: "error",
          message: `Sprężyna ${sp.id} na X=${sp.x}, Y=${sp.topY} nie ma schodka pod spodem`,
        });
      }
    });

    level.levers.forEach((lv) => {
      const hasStair = level.stairs.some(
        (st) => st.x === lv.x && Math.abs(st.topY - lv.topY) < 0.1
      );
      if (!hasStair) {
        issues.push({
          type: "warning",
          message: `Dźwignia ${lv.id} na X=${lv.x}, Y=${lv.topY} nie ma schodka na tych samych współrzędnych`,
        });
      }
    });

    if (level.checkpoints.length !== 4) {
      issues.push({
        type: "warning",
        message: `Poziom ma ${level.checkpoints.length} checkpointów, zalecane dokładnie 4`,
      });
    }

    // BFS Osiągalności
    const nodes: { id: string; x: number; y: number; springBoost?: number }[] = [];
    level.stairs.forEach((st) => {
      const count = st.count ?? 1;
      for (let i = 0; i < count; i++) {
        nodes.push({ id: `${st.id}_${i}`, x: (st.x + i) % 24, y: st.topY });
      }
    });
    level.collapsingStairs.forEach((cs) => nodes.push({ id: cs.id, x: cs.x, y: cs.topY }));
    level.togglableStairs.forEach((ts) => nodes.push({ id: ts.id, x: ts.x, y: ts.topY }));
    level.springs.forEach((sp) => {
      const n = nodes.find((node) => node.x === sp.x && Math.abs(node.y - sp.topY) < 0.1);
      if (n) n.springBoost = 5.5;
    });

    const visited = new Set<string>();
    const queue: typeof nodes = [];
    nodes
      .filter((n) => n.y <= 1.0)
      .forEach((n) => {
        visited.add(n.id);
        queue.push(n);
      });

    let maxReachedY = 0;
    while (queue.length > 0) {
      const curr = queue.shift()!;
      if (curr.y > maxReachedY) maxReachedY = curr.y;
      const maxYJump = curr.springBoost ?? 2.05;
      for (const next of nodes) {
        if (visited.has(next.id)) continue;
        const dy = next.y - curr.y;
        if (dy > maxYJump || dy < -6.0) continue;
        const dxDirect = Math.abs(next.x - curr.x);
        const dx = Math.min(dxDirect, 24 - dxDirect);
        const maxDx = dy > 1.2 ? 2.0 : 3.0;
        if (dx <= maxDx) {
          visited.add(next.id);
          queue.push(next);
        }
      }
    }

    if (level.elevators.length > 0) maxReachedY = Math.max(maxReachedY, 46);
    if (level.doors.length > 0) maxReachedY = Math.max(maxReachedY, 48);

    if (maxReachedY >= 46) {
      issues.unshift({
        type: "ok",
        message: `BFS Osiągalności: Szczyt wieży Y=${maxReachedY} jest osiągalny od startu`,
      });
    } else {
      issues.unshift({
        type: "warning",
        message: `BFS Osiągalności: skoki docierają do Y=${maxReachedY.toFixed(1)} / 48`,
      });
    }

    return issues;
  }, [level]);

  // ── Obsługa kliknięcia w komórkę 2D ─────────────────────────────────────
  const handleCellClick = (cellX: number, cellY: number) => {
    const safeCount = Math.max(1, Math.min(23, Math.round(stairCount) || 1));

    if (pendingLever) {
      updateLevel((next) => {
        next.togglableStairs.push({
          id: `ts_${cellX}_${Math.round(cellY)}`,
          x: cellX,
          topY: cellY,
          leverId: pendingLever.id,
        });
      });
      setPendingLever(null);
      return;
    }

    if (pendingDoor) {
      updateLevel((next) => {
        next.stairs = next.stairs.filter((s) => !(s.x === cellX && s.topY === cellY));
        next.stairs.push({
          id: `st_door_${cellX}_${Math.round(cellY)}`,
          x: cellX,
          topY: cellY,
          count: 1,
        });
        next.doors.push({
          id: `door_${pendingDoor.pairId}_b`,
          pairId: pendingDoor.pairId,
          x: cellX,
          topY: cellY,
          color: pendingDoor.color,
        });
      });
      setPendingDoor(null);
      return;
    }

    // Zapamiętujemy dokładnie element widoczny pod kursorem zanim zmienimy level.
    // Tor windy może przebiegać za innym elementem, więc samo X nie wystarcza.
    const clickedCell = activeTool === "erase" ? getCellContent(cellX, cellY) : null;

    updateLevel((next) => {
      if (activeTool === "stair") {
        const idx = next.stairs.findIndex((s) => s.x === cellX && s.topY === cellY);
        if (idx >= 0) {
          if (next.stairs[idx].count === safeCount) {
            next.stairs.splice(idx, 1);
          } else {
            next.stairs[idx].count = safeCount;
          }
        } else {
          next.stairs.push({ id: `st_${cellX}_${cellY}`, x: cellX, topY: cellY, count: safeCount });
        }
      } else if (activeTool === "collapsing") {
        const idx = next.collapsingStairs.findIndex((c) => c.x === cellX && c.topY === cellY);
        if (idx >= 0) next.collapsingStairs.splice(idx, 1);
        else next.collapsingStairs.push({ id: `cs_${cellX}_${cellY}`, x: cellX, topY: cellY });
      } else if (activeTool === "gem") {
        // Klejnoty mają w JSON X przesunięte o 0.5 względem kafelka siatki.
        const gemX = cellX + 0.5;
        const idx = next.gems.findIndex((g) => g.x === gemX && Math.abs(g.y - cellY) < 0.3);
        if (idx >= 0) next.gems.splice(idx, 1);
        else next.gems.push({ id: `g_${cellX}_${cellY}`, x: gemX, y: cellY });
      } else if (activeTool === "spring") {
        const idx = next.springs.findIndex((s) => s.x === cellX && s.topY === cellY);
        if (idx >= 0) {
          next.springs.splice(idx, 1);
        } else {
          const hasStair = next.stairs.some((st) => {
            const count = st.count ?? 1;
            const rel = (((cellX - st.x) % 24) + 24) % 24;
            return rel < count && st.topY === cellY;
          });
          if (hasStair) {
            next.springs.push({
              id: `sp_${cellX}_${cellY}`,
              x: cellX,
              topY: cellY,
              bounceForce: 18.5,
            });
          } else {
            setSpringWarning(`Sprężynę można postawić tylko na schodku na X=${cellX} Y=${cellY}`);
            setTimeout(() => setSpringWarning(null), 2500);
          }
        }
      } else if (activeTool === "enemy_patrol") {
        const idx = next.enemies.findIndex(
          (en) => en.xCenter === cellX && Math.abs(en.y - (cellY + 0.55)) < 0.3
        );
        if (idx >= 0) {
          next.enemies.splice(idx, 1);
        } else {
          next.enemies.push({
            id: `en_patrol_${cellX}_${Math.round(cellY)}`,
            xCenter: cellX,
            y: cellY + 0.55,
            behavior: "patrol",
            amplitude: patrolAmplitude,
            speed: patrolSpeed,
          });
        }
      } else if (activeTool === "enemy_bounce") {
        const idx = next.enemies.findIndex(
          (en) => en.xCenter === cellX && Math.abs(en.y - (cellY + 0.55)) < 0.3
        );
        if (idx >= 0) {
          next.enemies.splice(idx, 1);
        } else {
          next.enemies.push({
            id: `en_bounce_${cellX}_${Math.round(cellY)}`,
            xCenter: cellX,
            y: cellY + 0.55,
            behavior: "bounce",
            amplitude: bounceAmplitude,
            moveSteps: bounceMoveSteps,
            speed: bounceSpeed,
          });
        }
      } else if (activeTool === "checkpoint") {
        const idx = next.checkpoints.findIndex((cp) => cp.x === cellX && Math.abs(cp.y - cellY) < 0.3);
        if (idx >= 0) {
          next.checkpoints.splice(idx, 1);
        } else {
          // Nie dodajemy schodka do JSON-a: buildStairs() w silniku gry
          // tworzy automatycznie pojedynczy schodek pod każdym checkpointem.
          next.checkpoints.push({
            id: next.checkpoints.length + 1,
            name: `Checkpoint ${next.checkpoints.length + 1}`,
            floor: Math.round(cellY),
            x: cellX,
            y: cellY,
          });
        }
      } else if (activeTool === "elevator") {
        const idx = next.elevators.findIndex((el) => el.x === cellX && Math.abs(el.yMin - cellY) < 0.5);
        if (idx >= 0) {
          next.elevators.splice(idx, 1);
        } else {
          const yMax = Math.min(48, cellY + elevatorRange);
          next.elevators.push({
            id: `el_${cellX}_${cellY}`,
            x: cellX,
            width: 1.2,
            yMin: cellY,
            yMax,
            speed: elevatorSpeed,
            phase: 0,
          });
        }
      } else if (activeTool === "lever_pair") {
        const levId = `lev_${cellX}_${Math.round(cellY)}`;
        const stairId = `st_lev_${cellX}_${cellY}`;
        const previousStair = next.stairs.find((s) => s.x === cellX && s.topY === cellY);
        next.stairs = next.stairs.filter((s) => !(s.x === cellX && s.topY === cellY));
        next.stairs.push({ id: stairId, x: cellX, topY: cellY, count: 1 });
        next.levers.push({ id: levId, x: cellX, topY: cellY });
        setPendingLever({ id: levId, x: cellX, topY: cellY, stairId, previousStair });
      } else if (activeTool === "door_pair") {
        const pairId = `pair_${cellX}_${Math.round(cellY)}`;
        const color = DOOR_PORTAL_COLORS[(next.doors.length / 2) % DOOR_PORTAL_COLORS.length] || "#00E5FF";
        const stairId = `st_door_${cellX}_${Math.round(cellY)}`;
        const doorId = `door_${pairId}_a`;
        const previousStair = next.stairs.find((s) => s.x === cellX && s.topY === cellY);

        next.stairs = next.stairs.filter((s) => !(s.x === cellX && s.topY === cellY));
        next.stairs.push({
          id: stairId,
          x: cellX,
          topY: cellY,
          count: 1,
        });

        next.doors.push({
          id: doorId,
          pairId,
          x: cellX,
          topY: cellY,
          color,
        });

        setPendingDoor({
          pairId,
          firstDoorId: doorId,
          x: cellX,
          topY: cellY,
          color,
          stairId,
          previousStair,
        });
      } else if (activeTool === "erase") {
        if (!clickedCell) return;

        // Pierwszy pasujący warunek to element, który widać na wierzchu kafelka.
        if (clickedCell.doorBase || clickedCell.doorBody) {
          const door = clickedCell.doorBase ?? clickedCell.doorBody;
          const pair = next.doors.filter((item) => item.pairId === door!.pairId);
          next.doors = next.doors.filter((item) => item.pairId !== door!.pairId);
          // Kasujemy wyłącznie schodki techniczne stworzone automatycznie dla drzwi.
          pair.forEach((item) => {
            const generatedId = `st_door_${item.x}_${Math.round(item.topY)}`;
            next.stairs = next.stairs.filter((stair) => stair.id !== generatedId);
          });
        } else if (clickedCell.enemy) {
          next.enemies = next.enemies.filter((enemy) => enemy.id !== clickedCell.enemy!.id);
        } else if (clickedCell.gem) {
          next.gems = next.gems.filter((gem) => gem.id !== clickedCell.gem!.id);
        } else if (clickedCell.spring) {
          next.springs = next.springs.filter((spring) => spring.id !== clickedCell.spring!.id);
        } else if (clickedCell.cp) {
          next.checkpoints = next.checkpoints.filter(
            (checkpoint) => checkpoint.id !== clickedCell.cp!.id
          );
        } else if (clickedCell.ts) {
          next.togglableStairs = next.togglableStairs.filter(
            (stair) => stair.id !== clickedCell.ts!.id
          );
        } else if (clickedCell.lev) {
          const lever = clickedCell.lev;
          next.levers = next.levers.filter((item) => item.id !== lever.id);
          next.togglableStairs = next.togglableStairs.filter(
            (stair) => stair.leverId !== lever.id
          );
          // Nie usuwamy zwykłego schodka użytkownika, tylko techniczny schodek dźwigni.
          next.stairs = next.stairs.filter(
            (stair) => stair.id !== `st_lev_${lever.x}_${lever.topY}`
          );
        } else if (clickedCell.coll) {
          next.collapsingStairs = next.collapsingStairs.filter(
            (stair) => stair.id !== clickedCell.coll!.id
          );
        } else if (clickedCell.elev) {
          // Winda jest usuwana tylko po kliknięciu jej widocznego toru.
          next.elevators = next.elevators.filter(
            (elevator) => elevator.id !== clickedCell.elev!.id
          );
        } else if (clickedCell.stair) {
          // Usuwa właściwy rząd, nawet gdy kliknięto któryś z kafelków count > 1.
          next.stairs = next.stairs.filter((stair) => stair.id !== clickedCell.stair!.id);
        }
      }
    });
  };

  const handleCellRightClick = (cx: number, cy: number, cell: ReturnType<typeof getCellContent>) => {
    updateLevel((next) => {
      if (cell.enemy) {
        const en = next.enemies.find((e) => e.id === cell.enemy?.id);
        if (en) {
          if (activeTool === "enemy_patrol") {
            en.behavior = "patrol";
            en.amplitude = patrolAmplitude;
            en.speed = patrolSpeed;
          } else if (activeTool === "enemy_bounce") {
            en.behavior = "bounce";
            en.amplitude = bounceAmplitude;
            en.moveSteps = bounceMoveSteps;
            en.speed = bounceSpeed;
          }
        }
      } else if (cell.stair) {
        const target = next.stairs.find((s) => s.x === cx && s.topY === cy);
        if (target) target.count = Math.max(1, Math.min(23, Math.round(stairCount) || 1));
      } else if (cell.elev) {
        const target = next.elevators.find((el) => el.id === cell.elev?.id);
        if (target) {
          target.yMax = Math.min(48, target.yMin + elevatorRange);
          target.speed = elevatorSpeed;
        }
      }
    });
  };

  const handleLoadPreset = (presetIdx: number) => {
    const loaded = LEVELS[presetIdx];
    if (loaded) onLevelChange(normalizeCheckpointIds(JSON.parse(JSON.stringify(loaded))));
  };

  const handleCopyJson = () => {
    try {
      const validated = loadLevel(level);
      const formatted = formatLevelJson(validated);
      navigator.clipboard.writeText(formatted);
      setCopyFeedback("Skopiowano zwalidowany JSON do schowka!");
    } catch (e: any) {
      setCopyFeedback(`Błąd walidacji: ${e.message}`);
    }
    setTimeout(() => setCopyFeedback(null), 3000);
  };

  const handleDownloadJson = () => {
    try {
      const validated = loadLevel(level);
      const formatted = formatLevelJson(validated);
      const blob = new Blob([formatted], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${level.id}.level.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e: any) {
      alert(`Błąd JSON: ${e.message}`);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        onLevelChange(normalizeCheckpointIds(loadLevel(JSON.parse(ev.target?.result as string))));
      } catch (err: any) {
        alert(`Błąd wczytywania pliku: ${err.message}`);
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  // ── Wszystkie kondygnacje 0..48 w JEDNYM widoku ──────────────────────────
  const yRows = useMemo(() => {
    const rows: number[] = [];
    for (let y = 48; y >= 0; y -= 0.5) {
      rows.push(y);
    }
    return rows;
  }, []);

  const scrollToHeight = (targetY: number) => {
    const el = document.getElementById(`editor-row-${targetY}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  };

  const getCellContent = (cx: number, cy: number) => {
    const stair = level.stairs.find((st) => {
      const count = st.count ?? 1;
      const rel = (((cx - st.x) % 24) + 24) % 24;
      return rel < count && st.topY === cy;
    });
    const coll = level.collapsingStairs.find((cs) => cs.x === cx && cs.topY === cy);
    const gem = level.gems.find((g) => Math.floor(g.x) === cx && Math.abs(g.y - cy) < 0.4);
    const spring = level.springs.find((sp) => sp.x === cx && sp.topY === cy);
    const enemy = level.enemies.find((en) => en.xCenter === cx && Math.abs(en.y - (cy + 0.55)) < 0.3);
    const cp = level.checkpoints.find((c) => c.x === cx && Math.abs(c.y - cy) < 0.3);
    const elev = level.elevators.find((el) => el.x === cx && cy >= el.yMin && cy <= el.yMax);
    const lev = level.levers.find((l) => l.x === cx && Math.abs(l.topY - cy) < 0.3);
    const ts = level.togglableStairs.find((t) => t.x === cx && t.topY === cy);

    const doorBase = level.doors.find((d) => d.x === cx && d.topY === cy);
    const doorBody = level.doors.find(
      (d) => d.x === cx && cy > d.topY && cy <= d.topY + 2.05
    );

    return { stair, coll, gem, spring, enemy, cp, elev, lev, ts, doorBase, doorBody };
  };

  const isPlacementPreview = (cx: number, cy: number): boolean => {
    if (!hoveredCell) return false;
    const { x, y } = hoveredCell;
    const wrappedOffset = (((cx - x) % 24) + 24) % 24;

    if (activeTool === "stair") {
      return cy === y && wrappedOffset < stairCount;
    }

    if (activeTool === "door_pair" || pendingDoor) {
      return cx === x && cy >= y && cy <= Math.min(48, y + 2);
    }

    if (activeTool === "elevator") {
      return cx === x && cy >= y && cy <= Math.min(48, y + elevatorRange);
    }

    return cx === x && cy === y;
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black font-freckle text-slate-200 overflow-hidden">
      {/* ── GÓRNY PASEK: grafit ─────────────────────────────────────────── */}
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-cyan-500/30 bg-[#1a1a1a] px-4 py-2 text-sm shadow-md">
        <div className="flex items-center gap-3">
          <button
            onClick={handleEditorBack}
            className="flex items-center gap-1.5 rounded-xl bg-[#2a2a2a] px-3 py-1.5 text-cyan-300 hover:bg-[#333] hover:text-cyan-200"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Menu</span>
          </button>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400">ID:</span>
            <input
              type="text"
              value={level.id}
              onChange={(e) => onLevelChange({ ...level, id: e.target.value })}
              className="w-24 rounded-lg border border-cyan-500/30 bg-[#0d0d0d] px-2 py-0.5 text-xs text-cyan-100"
            />
            <span className="text-xs text-slate-400">Nazwa:</span>
            <input
              type="text"
              value={level.name}
              onChange={(e) => onLevelChange({ ...level, name: e.target.value })}
              className="w-44 rounded-lg border border-amber-400/30 bg-[#0d0d0d] px-2 py-0.5 text-xs text-amber-200"
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400">Szablon:</span>
          <select
            onChange={(e) => handleLoadPreset(Number(e.target.value))}
            defaultValue=""
            className="rounded-lg border border-cyan-500/30 bg-[#0d0d0d] px-2 py-1 text-xs text-cyan-100"
          >
            <option value="" disabled>
              Wybierz planszę
            </option>
            {LEVELS.map((lvl, idx) => (
              <option key={lvl.id} value={idx}>
                #{idx + 1} {lvl.name} 💎 {lvl.gems.length}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onTestLevelIn3D(level)}
            className="flex items-center gap-1.5 rounded-xl bg-emerald-400 px-3.5 py-1.5 text-xs font-bold text-black shadow-[0_0_20px_rgba(52,211,153,0.5)] transition-all hover:bg-emerald-300 active:scale-95"
          >
            <Play className="h-4 w-4 fill-current" />
            <span>TESTUJ W 3D NA ŻYWO</span>
          </button>
          <button
            onClick={handleCopyJson}
            className="flex items-center gap-1 rounded-xl bg-[#2a2a2a] px-2.5 py-1.5 text-xs text-cyan-300 hover:bg-[#333]"
          >
            <Copy className="h-3.5 w-3.5" />
            <span>Kopiuj JSON</span>
          </button>
          <button
            onClick={handleDownloadJson}
            className="flex items-center gap-1 rounded-xl bg-[#2a2a2a] px-2.5 py-1.5 text-xs text-cyan-300 hover:bg-[#333]"
          >
            <Download className="h-3.5 w-3.5" />
            <span>.json</span>
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1 rounded-xl bg-[#2a2a2a] px-2.5 py-1.5 text-xs text-cyan-300 hover:bg-[#333]"
          >
            <Upload className="h-3.5 w-3.5" />
            <span>Wczytaj</span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleFileUpload}
            className="hidden"
          />
        </div>
      </header>

      {copyFeedback && (
        <div className="bg-emerald-400 px-4 py-1 text-center text-xs font-bold text-black shadow-[0_0_15px_rgba(52,211,153,0.6)]">
          {copyFeedback}
        </div>
      )}

      {springWarning && (
        <div className="bg-[#FF3131] px-4 py-1 text-center text-xs font-bold text-white shadow-[0_0_15px_rgba(255,49,49,0.6)]">
          {springWarning}
        </div>
      )}

      {/* ── PASEK KROKU 2 DLA DŹWIGNI LUB DRZWI ──────────────────────────── */}
      {pendingLever && (
        <div className="flex items-center justify-between bg-[#1a0a2e] px-4 py-1.5 text-xs text-violet-300 border-b border-violet-500/50 shadow-[0_0_10px_rgba(139,92,246,0.3)]">
          <span>
            🕹️ <strong className="text-violet-200">KROK 2 DŹWIGNI:</strong> Postawiono dźwignię. Kliknij na siatce miejsce na <strong className="text-violet-200">schodek sterowany</strong>.
          </span>
          <button
            onClick={cancelPendingPlacement}
            className="flex items-center gap-1 rounded bg-violet-600/80 px-2 py-0.5 text-white hover:bg-violet-500"
          >
            <XCircle className="h-3.5 w-3.5" /> Anuluj
          </button>
        </div>
      )}

      {pendingDoor && (
        <div className="flex items-center justify-between bg-[#0a2e2e] px-4 py-1.5 text-xs text-cyan-300 border-b border-cyan-400/50 shadow-[0_0_10px_rgba(0,229,255,0.3)]">
          <span>
            🚪 <strong className="text-cyan-200">KROK 2 DRZWI:</strong> Postawiono Wejście. Kliknij miejsce na <strong className="text-cyan-200">Wyjście</strong> tej samej pary.
          </span>
          <button
            onClick={cancelPendingPlacement}
            className="flex items-center gap-1 rounded bg-cyan-600/80 px-2 py-0.5 text-black hover:bg-cyan-500"
          >
            <XCircle className="h-3.5 w-3.5" /> Anuluj
          </button>
        </div>
      )}

      {/* ── PASEK PĘDZLI: grafit, neonowe aktywne ────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-cyan-500/20 bg-[#161616] px-4 py-1.5 text-xs">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="mr-1 text-slate-400">Pędzel:</span>
          {[
            { id: "stair", label: "🟫 Schodek", color: "bg-[#FF8C00] text-black shadow-[0_0_10px_rgba(255,140,0,0.6)]" },
            { id: "collapsing", label: "🟥 Zapadnia", color: "bg-[#FF3131] text-white shadow-[0_0_10px_rgba(255,49,49,0.6)]" },
            { id: "elevator", label: "🟦 Winda", color: "bg-[#00E5FF] text-black shadow-[0_0_10px_rgba(0,229,255,0.6)]" },
            { id: "gem", label: "💎 Klejnot", color: "bg-[#39FF14] text-black shadow-[0_0_10px_rgba(57,255,20,0.6)]" },
            { id: "spring", label: "🟡 Sprężyna", color: "bg-[#FFF600] text-black shadow-[0_0_10px_rgba(255,246,0,0.6)]" },
            { id: "enemy_patrol", label: "🦅 Wróg Patrol", color: "bg-[#FF6EC7] text-black shadow-[0_0_10px_rgba(255,110,199,0.6)]" },
            { id: "enemy_bounce", label: "⚽ Wróg Bounce", color: "bg-[#FF3131] text-white shadow-[0_0_10px_rgba(255,49,49,0.6)]" },
            { id: "checkpoint", label: "🚩 Checkpoint", color: "bg-[#00FFA3] text-black shadow-[0_0_10px_rgba(0,255,163,0.6)]" },
            { id: "lever_pair", label: "🕹️ Dźwignia → Schodek", color: "bg-[#7F5AF6] text-white shadow-[0_0_10px_rgba(127,90,246,0.6)]" },
            { id: "door_pair", label: "🚪 Drzwi Teleport", color: "bg-[#00E5FF] text-black shadow-[0_0_10px_rgba(0,229,255,0.6)]" },
            { id: "erase", label: "🧹 Gumka", color: "bg-[#4a4a4a] text-white shadow-[0_0_10px_rgba(255,255,255,0.3)]" },
          ].map((tool) => (
            <button
              key={tool.id}
              onClick={() => {
                setActiveTool(tool.id as ToolType);
                cancelPendingPlacement();
              }}
              className={`rounded-lg px-2.5 py-1 font-semibold transition-all ${
                activeTool === tool.id
                  ? `${tool.color} scale-105 ring-2 ring-white/60`
                  : "bg-[#242424] text-slate-400 hover:bg-[#2e2e2e] hover:text-slate-200"
              }`}
            >
              {tool.label}
            </button>
          ))}
        </div>

        {/* ── DEDYKOWANY PANEL PARAMETRÓW ─────────────────────────────────── */}
        {activeTool === "stair" && (
          <div className="flex items-center gap-2 rounded-xl border border-[#FF8C00]/50 bg-[#1a1000] px-3 py-1">
            <span className="font-bold text-[#FF8C00]">Count:</span>
            <input
              type="range"
              min={1}
              max={23}
              step={1}
              value={stairCount}
              onChange={(e) => setStairCount(Number(e.target.value))}
              className="w-24 accent-[#FF8C00]"
            />
            <input
              type="number"
              min={1}
              max={23}
              step={1}
              value={stairCount}
              onChange={(e) => {
                const v = Math.max(1, Math.min(23, Math.round(Number(e.target.value)) || 1));
                setStairCount(v);
              }}
              className="w-12 rounded-lg border border-[#FF8C00]/50 bg-[#0d0d0d] px-1 py-0.5 text-center text-xs text-[#FF8C00]"
            />
          </div>
        )}

        {activeTool === "elevator" && (
          <div className="flex items-center gap-3 rounded-xl border border-[#00E5FF]/50 bg-[#001a1a] px-3 py-1 text-cyan-300">
            <span className="font-bold text-[#00E5FF]">🟦 Winda:</span>
            <div className="flex items-center gap-1.5">
              <span>Zakres Y:</span>
              <input
                type="range"
                min={1}
                max={48}
                step={0.5}
                value={elevatorRange}
                onChange={(e) => setElevatorRange(Math.max(1, Math.min(48, Number(e.target.value) || 1)))}
                className="w-20 accent-[#00E5FF]"
              />
              <input
                type="number"
                min={1}
                max={48}
                step={0.5}
                value={elevatorRange}
                onChange={(e) => setElevatorRange(Math.max(1, Math.min(48, Number(e.target.value) || 1)))}
                className="w-14 rounded border border-[#00E5FF]/50 bg-[#0d0d0d] px-1 py-0.5 text-center text-xs text-[#00E5FF]"
              />
              <span className="text-[10px] text-cyan-500">pięter</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span>Szybkość:</span>
              <input
                type="number"
                min={0.2}
                max={3.0}
                step={0.05}
                value={elevatorSpeed}
                onChange={(e) => setElevatorSpeed(Math.max(0.2, Math.min(3.0, Number(e.target.value) || 0.5)))}
                className="w-14 rounded border border-[#00E5FF]/50 bg-[#0d0d0d] px-1 py-0.5 text-center text-xs text-[#00E5FF]"
              />
            </div>
          </div>
        )}

        {activeTool === "enemy_patrol" && (
          <div className="flex items-center gap-3 rounded-xl border border-[#FF6EC7]/50 bg-[#1a0a14] px-3 py-1 text-pink-300">
            <span className="font-bold text-[#FF6EC7]">🦅 Patrol:</span>
            <div className="flex items-center gap-1.5">
              <span>Zasięg X:</span>
              <input
                type="number"
                min={0.5}
                max={5.0}
                step={0.5}
                value={patrolAmplitude}
                onChange={(e) => setPatrolAmplitude(Math.max(0.5, Math.min(5.0, Number(e.target.value) || 0.5)))}
                className="w-14 rounded border border-[#FF6EC7]/50 bg-[#0d0d0d] px-1 py-0.5 text-center text-xs text-[#FF6EC7]"
              />
            </div>
            <div className="flex items-center gap-1.5">
              <span>Prędkość:</span>
              <input
                type="number"
                min={0.5}
                max={3.0}
                step={0.1}
                value={patrolSpeed}
                onChange={(e) => setPatrolSpeed(Math.max(0.5, Math.min(3.0, Number(e.target.value) || 1.0)))}
                className="w-14 rounded border border-[#FF6EC7]/50 bg-[#0d0d0d] px-1 py-0.5 text-center text-xs text-[#FF6EC7]"
              />
            </div>
          </div>
        )}

        {activeTool === "enemy_bounce" && (
          <div className="flex items-center gap-3 rounded-xl border border-[#FF3131]/50 bg-[#1a0505] px-3 py-1 text-red-300">
            <span className="font-bold text-[#FF3131]">⚽ Bounce:</span>
            <div className="flex items-center gap-1.5">
              <span>Wysokość Y:</span>
              <input
                type="number"
                min={0.5}
                max={4.0}
                step={0.5}
                value={bounceAmplitude}
                onChange={(e) => setBounceAmplitude(Math.max(0.5, Math.min(4.0, Number(e.target.value) || 0.5)))}
                className="w-14 rounded border border-[#FF3131]/50 bg-[#0d0d0d] px-1 py-0.5 text-center text-xs text-[#FF3131]"
              />
            </div>
            <div className="flex items-center gap-1.5">
              <span>Kroki X:</span>
              <input
                type="number"
                min={0}
                max={4}
                step={1}
                value={bounceMoveSteps}
                onChange={(e) => setBounceMoveSteps(Math.max(0, Math.min(4, Math.round(Number(e.target.value)) || 0)))}
                className="w-12 rounded border border-[#FF3131]/50 bg-[#0d0d0d] px-1 py-0.5 text-center text-xs text-[#FF3131]"
              />
              <span className="text-[10px] text-red-400">{bounceMoveSteps === 0 ? "w miejscu" : "w bok"}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span>Tempo:</span>
              <input
                type="number"
                min={0.5}
                max={3.0}
                step={0.1}
                value={bounceSpeed}
                onChange={(e) => setBounceSpeed(Math.max(0.5, Math.min(3.0, Number(e.target.value) || 1.0)))}
                className="w-14 rounded border border-[#FF3131]/50 bg-[#0d0d0d] px-1 py-0.5 text-center text-xs text-[#FF3131]"
              />
            </div>
          </div>
        )}

        {/* Zakładki widoku */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setViewTab("grid2d")}
            className={`flex items-center gap-1 rounded-lg px-3 py-1 font-bold ${
              viewTab === "grid2d"
                ? "bg-emerald-400 text-black shadow-[0_0_10px_rgba(52,211,153,0.5)]"
                : "bg-[#242424] text-slate-400 hover:bg-[#2e2e2e]"
            }`}
          >
            <Layers className="h-3.5 w-3.5" />
            <span>2D Siatka</span>
          </button>
          <button
            onClick={() => setViewTab("validator")}
            className={`flex items-center gap-1 rounded-lg px-3 py-1 font-bold ${
              viewTab === "validator"
                ? "bg-[#FFF600] text-black shadow-[0_0_10px_rgba(255,246,0,0.5)]"
                : "bg-[#242424] text-slate-400 hover:bg-[#2e2e2e]"
            }`}
          >
            <CheckCircle2 className="h-3.5 w-3.5" />
            <span>Linter [{validation.length}]</span>
          </button>
          <button
            onClick={() => setViewTab("json")}
            className={`flex items-center gap-1 rounded-lg px-3 py-1 font-bold ${
              viewTab === "json"
                ? "bg-[#00E5FF] text-black shadow-[0_0_10px_rgba(0,229,255,0.5)]"
                : "bg-[#242424] text-slate-400 hover:bg-[#2e2e2e]"
            }`}
          >
            <Eye className="h-3.5 w-3.5" />
            <span>JSON</span>
          </button>
        </div>
      </div>

      {/* ── ZAWARTOŚĆ ───────────────────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden">
        {viewTab === "grid2d" && (
          <div className="flex flex-1 flex-col overflow-hidden">
            {/* ── Pasek szybkiego skoku do wysokości Y ── */}
            <div className="flex flex-wrap items-center justify-between border-b border-cyan-500/20 bg-[#111] px-4 py-1.5 text-xs">
              <div className="flex items-center gap-2">
                <span className="text-slate-300">Wszystkie piętra 0–48:</span>
                <span className="text-slate-500 mr-1">Skocz do:</span>
                {[
                  { y: 48, label: "👑 48 Szczyt" },
                  { y: 36, label: "36" },
                  { y: 24, label: "24" },
                  { y: 12, label: "12" },
                  { y: 0, label: "0 Start" },
                ].map((btn) => (
                  <button
                    key={btn.y}
                    onClick={() => scrollToHeight(btn.y)}
                    className="rounded-lg bg-[#242424] px-2.5 py-0.5 font-bold text-cyan-300 hover:bg-[#2e2e2e] hover:text-cyan-200"
                  >
                    {btn.label}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-3">
                <label className="flex cursor-pointer items-center gap-1.5 text-slate-300">
                  <input
                    type="checkbox"
                    checked={showJumpArcs}
                    onChange={(e) => setShowJumpArcs(e.target.checked)}
                    className="accent-[#39FF14]"
                  />
                  <span>Zasięg skoku dx≤2 dy≤2</span>
                </label>
                <button
                  onClick={() => onLevelChange(createBlankLevel(41))}
                  className="flex items-center gap-1 rounded-lg bg-[#2a0505] px-2 py-0.5 text-red-300 hover:bg-[#3a0808] border border-red-500/30"
                >
                  <RotateCcw className="h-3 w-3" />
                  <span>Wyczyść</span>
                </button>
              </div>
            </div>

            {/* ── Cała wieża 0..48 w jednej przewijanej siatce ── */}
            <div className="flex-1 overflow-auto p-3">
              <div className="inline-block min-w-full rounded-2xl border border-cyan-500/20 bg-[#0a0a0a] p-2">
                {/* Przyklejony nagłówek kolumn X */}
                <div className="sticky top-0 z-20 grid grid-cols-[70px_repeat(24,minmax(38px,1fr))] gap-0.5 pb-1 text-center text-[11px] font-bold text-slate-400 bg-[#0a0a0a]/95 backdrop-blur-sm border-b border-cyan-500/20">
                  <div>Y \ X</div>
                  {Array.from({ length: 24 }, (_, i) => (
                    <div
                      key={i}
                      className={`rounded ${
                        i % 4 === 0 ? "bg-[#1a2a2a] text-[#00E5FF]" : "bg-[#141414] text-slate-500"
                      }`}
                    >
                      {i}
                    </div>
                  ))}
                </div>

                {yRows.map((cy) => {
                  const isIntegerY = Number.isInteger(cy);
                  return (
                    <div
                      key={cy}
                      id={`editor-row-${cy}`}
                      className={`grid grid-cols-[70px_repeat(24,minmax(38px,1fr))] items-center gap-[2px] py-[1px] ${
                        isIntegerY
                          ? "border-t-2 border-[#00E5FF]/25"
                          : "border-t border-[#00E5FF]/8"
                      }`}
                    >
                      <div
                        className={`sticky left-0 z-10 bg-[#0a0a0a] pr-2 text-right font-mono text-xs font-bold ${
                          cy === 48
                            ? "text-[#FFF600] drop-shadow-[0_0_4px_rgba(255,246,0,0.6)]"
                            : isIntegerY
                              ? "text-slate-300"
                              : "text-slate-600"
                        }`}
                      >
                        {cy === 48 ? "👑 48" : cy.toFixed(1)}
                      </div>

                      {Array.from({ length: 24 }, (_, cx) => {
                        const cell = getCellContent(cx, cy);
                        const isStartCell = cx === Math.floor(level.start.x) && cy === level.start.y;
                        const stairLen = cell.stair ? (cell.stair.count ?? 1) : 0;
                        const isPatrolEnemy = cell.enemy?.behavior === "patrol";
                        const isBounceEnemy = cell.enemy && !isPatrolEnemy;
                        const isPreviewCell = isPlacementPreview(cx, cy);

                        // Zasięg skoku ludzika od kursora: dx ≤ 2, dy ≤ 2
                        const isJumpReachable =
                          showJumpArcs &&
                          hoveredCell &&
                          Math.abs(cy - hoveredCell.y) <= 2.05 &&
                          Math.min(
                            Math.abs(cx - hoveredCell.x),
                            24 - Math.abs(cx - hoveredCell.x)
                          ) <= 2.0;

                        let cellTitle = `X=${cx}, Y=${cy}`;
                        if (stairLen) cellTitle += ` · Schodek count=${stairLen}`;
                        if (cell.doorBase) cellTitle += ` · Próg drzwi ${cell.doorBase.pairId}`;
                        if (cell.doorBody) cellTitle += ` · Portal drzwi ${cell.doorBody.pairId}`;
                        if (isPatrolEnemy) cellTitle += ` · Wróg Patrol X=±${cell.enemy?.amplitude ?? 1.5} speed=${cell.enemy?.speed ?? 1.4}`;
                        if (isBounceEnemy) cellTitle += ` · Wróg Bounce wys=${cell.enemy?.amplitude ?? 1.5} skokX=${cell.enemy?.moveSteps ?? 0} speed=${cell.enemy?.speed ?? 1.2}`;
                        if (cell.elev) cellTitle += ` · Winda Y=${cell.elev.yMin}..${cell.elev.yMax} speed=${cell.elev.speed}`;

                        return (
                          <button
                            key={cx}
                            onMouseEnter={() => setHoveredCell({ x: cx, y: cy })}
                            onMouseLeave={() => setHoveredCell(null)}
                            onClick={() => handleCellClick(cx, cy)}
                            onContextMenu={(e) => {
                              e.preventDefault();
                              handleCellRightClick(cx, cy, cell);
                            }}
                            className={`relative flex h-7 items-center justify-center rounded text-[10px] font-bold transition-colors ${
                              isPreviewCell
                                ? "z-10 bg-[#39FF14]/25 text-[#39FF14] ring-2 ring-[#39FF14]/60 shadow-[0_0_10px_rgba(57,255,20,0.4)]"
                                : isStartCell
                                  ? "bg-[#FFF600]/20 ring-2 ring-[#FFF600]/70 text-[#FFF600]"
                                  : cell.doorBase
                                    ? "bg-[#00E5FF] text-black ring-2 ring-[#00E5FF]/70 font-black shadow-[0_0_8px_rgba(0,229,255,0.5)]"
                                    : cell.doorBody
                                      ? "bg-[#00E5FF]/25 border border-[#00E5FF]/60 text-[#00E5FF]"
                                      : isPatrolEnemy
                                        ? "bg-[#FF6EC7] text-black shadow-[0_0_8px_rgba(255,110,199,0.5)] border border-[#FF6EC7]/70"
                                        : isBounceEnemy
                                          ? "bg-[#FF3131] text-white shadow-[0_0_8px_rgba(255,49,49,0.5)] border border-[#FF3131]/70"
                                          : cell.gem
                                            ? "bg-[#39FF14] text-black shadow-[0_0_6px_rgba(57,255,20,0.4)]"
                                            : cell.spring
                                              ? "bg-[#FFF600] text-black shadow-[0_0_6px_rgba(255,246,0,0.4)]"
                                              : cell.cp
                                                ? "bg-[#00FFA3] text-black shadow-[0_0_6px_rgba(0,255,163,0.4)] ring-1 ring-[#00FFA3]/70"
                                                : cell.ts
                                                  ? "border border-[#7F5AF6]/70 bg-[#7F5AF6]/80 text-white shadow-[0_0_6px_rgba(127,90,246,0.4)]"
                                                  : cell.lev
                                                    ? "bg-[#2a1a3a] text-[#7F5AF6] border border-[#7F5AF6]/50 shadow-[0_0_4px_rgba(127,90,246,0.3)]"
                                                    : cell.coll
                                                      ? "border border-[#FF3131]/70 bg-[#2a0808] text-[#FF3131] shadow-[0_0_6px_rgba(255,49,49,0.3)]"
                                                      : cell.elev
                                                        ? "border border-[#00E5FF]/60 bg-[#00E5FF]/15 text-[#00E5FF]"
                                                        : cell.stair
                                                          ? "border border-[#FF8C00]/60 bg-[#FF8C00]/30 text-[#FF8C00]"
                                                          : isJumpReachable
                                                            ? "bg-[#39FF14]/15 ring-1 ring-[#39FF14]/50 shadow-[inset_0_0_6px_rgba(57,255,20,0.15)]"
                                                            : cx % 4 === 0
                                                              ? "bg-[#1e1e1e] border border-[#00E5FF]/15 hover:bg-[#242424]"
                                                              : "bg-[#181818] border border-[#00E5FF]/10 hover:bg-[#222222]"
                            }`}
                            title={cellTitle}
                          >
                            {isStartCell && "🚀"}
                            {cell.doorBase && "🚪▬"}
                            {cell.doorBody && !cell.doorBase && "🚪"}
                            {isPatrolEnemy && "🦅"}
                            {isBounceEnemy && "⚽"}
                            {cell.gem && !cell.enemy && "💎"}
                            {cell.spring && "🟡"}
                            {cell.cp && "🚩"}
                            {cell.ts && "🔒"}
                            {cell.lev && "🕹️"}
                            {cell.coll && "🟥"}
                            {cell.elev && !cell.doorBase && !cell.doorBody && "🟦"}
                            {!cell.doorBase &&
                              !cell.doorBody &&
                              !cell.enemy &&
                              !cell.gem &&
                              !cell.spring &&
                              !cell.cp &&
                              !cell.ts &&
                              !cell.lev &&
                              !cell.coll &&
                              !cell.elev &&
                              cell.stair &&
                              (stairLen > 1 ? (
                                <span className="rounded bg-black/60 px-1 text-[9px] text-[#FF8C00]">
                                  ×{stairLen}
                                </span>
                              ) : (
                                "▬"
                              ))}
                            {isPreviewCell &&
                              !cell.doorBase &&
                              !cell.doorBody &&
                              !cell.enemy &&
                              !cell.gem &&
                              !cell.spring &&
                              !cell.cp &&
                              !cell.ts &&
                              !cell.lev &&
                              !cell.coll &&
                              !cell.elev &&
                              !cell.stair &&
                              "·"}
                          </button>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-cyan-500/20 bg-[#161616] px-4 py-1.5 text-xs">
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-slate-400">
                  🟫 Schody: <strong className="text-[#FF8C00]">{level.stairs.length}</strong>
                </span>
                <span className="text-slate-400">
                  🚪 Drzwi: <strong className="text-[#00E5FF]">{level.doors.length / 2} par</strong>
                </span>
                <span className="text-slate-400">
                  🟦 Windy: <strong className="text-[#00E5FF]">{level.elevators.length}</strong>
                </span>
                <span className="text-slate-400">
                  💎 Klejnoty: <strong className="text-[#39FF14]">{level.gems.length}</strong>
                </span>
                <span className="text-slate-400">
                  🟡 Sprężyny: <strong className="text-[#FFF600]">{level.springs.length}</strong>
                </span>
                <span className="text-slate-400">
                  🦅 Patrole:{" "}
                  <strong className="text-[#FF6EC7]">{level.enemies.filter((e) => e.behavior === "patrol").length}</strong>
                </span>
                <span className="text-slate-400">
                  ⚽ Bounce:{" "}
                  <strong className="text-[#FF3131]">{level.enemies.filter((e) => e.behavior !== "patrol").length}</strong>
                </span>
                <span className="text-slate-400">
                  🕹️ Dźwignie: <strong className="text-[#7F5AF6]">{level.levers.length}</strong>
                </span>
                <span className="text-slate-400">
                  🚩 CP: <strong className="text-[#00FFA3]">{level.checkpoints.length}</strong>
                </span>
              </div>
              <div className="text-slate-500">
                Prawy klik na kafelku aktualizuje parametry elementu
              </div>
            </div>
          </div>
        )}

        {viewTab === "validator" && (
          <div className="mx-auto max-w-4xl flex-1 overflow-y-auto p-6">
            <h3 className="mb-4 text-2xl text-[#39FF14] drop-shadow-[0_0_8px_rgba(57,255,20,0.5)]">
              Raport Walidacji i Osiągalności BFS
            </h3>
            <div className="space-y-3">
              {validation.map((item, idx) => (
                <div
                  key={idx}
                  className={`flex items-start gap-3 rounded-2xl border p-4 ${
                    item.type === "error"
                      ? "border-[#FF3131]/60 bg-[#1a0505]/80 text-[#FF3131] shadow-[0_0_8px_rgba(255,49,49,0.2)]"
                      : item.type === "warning"
                        ? "border-[#FFF600]/60 bg-[#1a1600]/80 text-[#FFF600] shadow-[0_0_8px_rgba(255,246,0,0.2)]"
                        : "border-[#39FF14]/60 bg-[#001a08]/80 text-[#39FF14] shadow-[0_0_8px_rgba(57,255,20,0.2)]"
                  }`}
                >
                  {item.type === "error" && (
                    <AlertTriangle className="h-6 w-6 shrink-0 text-[#FF3131]" />
                  )}
                  {item.type === "warning" && (
                    <AlertTriangle className="h-6 w-6 shrink-0 text-[#FFF600]" />
                  )}
                  {item.type === "ok" && (
                    <CheckCircle2 className="h-6 w-6 shrink-0 text-[#39FF14]" />
                  )}
                  <span className="text-sm leading-relaxed">{item.message}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {viewTab === "json" && (
          <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col overflow-hidden p-6">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm text-slate-400">
                Gotowy schemat TowerLevelDefinition JSON v1:
              </span>
              <button
                onClick={handleCopyJson}
                className="flex items-center gap-1.5 rounded-xl bg-[#39FF14] px-3 py-1.5 text-xs font-bold text-black shadow-[0_0_10px_rgba(57,255,20,0.5)]"
              >
                <Copy className="h-4 w-4" /> Skopiuj JSON
              </button>
            </div>
            <textarea
              readOnly
              value={formatLevelJson(level)}
              className="w-full flex-1 resize-none overflow-auto rounded-2xl border border-[#00E5FF]/30 bg-[#0a0a0a] p-4 font-mono text-xs text-[#00E5FF]"
            />
          </div>
        )}
      </div>
    </div>
  );
};
