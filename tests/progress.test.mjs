import assert from "node:assert/strict";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createServer } from "vite";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
// Klucz zapisu bierzemy z modułu, którego testy dotyczą (PROGRESS_STORAGE_KEY),
// więc podniesienie numeru wersji w src/levels/progress.ts nie rozjeżdża testów.
// Literał jest tylko awaryjnym zapasem, gdyby eksportu nie było.
let STORAGE_KEY = "glower-tower-progress-v5";

class MemoryStorage {
  values = new Map();

  getItem(key) { return this.values.get(key) ?? null; }
  setItem(key, value) { this.values.set(key, String(value)); }
  removeItem(key) { this.values.delete(key); }
}

export async function runProgressTests() {
  const storage = new MemoryStorage();
  Object.defineProperty(globalThis, "localStorage", { configurable: true, value: storage });
  const server = await createServer({
    configFile: false,
    root: ROOT,
    appType: "custom",
    logLevel: "error",
    server: { middlewareMode: true, hmr: false, watch: null },
    optimizeDeps: { noDiscovery: true, include: [] },
  });
  let passed = 0;
  const test = (name, fn) => {
    storage.removeItem(STORAGE_KEY);
    fn();
    passed++;
    console.log(`[progress-test] PASS ${name}`);
  };

  try {
    const progress = await server.ssrLoadModule("/src/levels/progress.ts");
    STORAGE_KEY = progress.PROGRESS_STORAGE_KEY ?? STORAGE_KEY;

    test("reaching the top without all gems keeps the next level locked", () => {
      const result = progress.markLevelCompleted(1, false, 8, 22, 7);
      assert.deepEqual(result.completedLevels, []);
      assert.equal(result.unlockedLevel, 1);
      assert.equal(progress.isUnlocked(1, result), true);
      assert.equal(progress.isUnlocked(2, result), false);
      assert.equal(result.bestScores["1"].gotAllGems, false);
    });

    test("only a complete gem collection unlocks the immediate next level", () => {
      const result = progress.markLevelCompleted(1, true, 8, 22, 7);
      assert.deepEqual(result.completedLevels, [1]);
      assert.equal(result.unlockedLevel, 2);
      assert.equal(progress.isUnlocked(1, result), true);
      assert.equal(progress.isUnlocked(2, result), true);
      assert.equal(progress.isUnlocked(3, result), false);
    });

    test("an incomplete replay cannot remove a legitimate full clear", () => {
      progress.markLevelCompleted(1, true, 8, 22, 7);
      const result = progress.markLevelCompleted(1, false, 1, 5, 7);
      assert.deepEqual(result.completedLevels, [1]);
      assert.equal(result.unlockedLevel, 2);
      assert.equal(progress.isUnlocked(2, result), true);
    });

    test("legacy false clear is migrated and re-locked", () => {
      storage.setItem(STORAGE_KEY, JSON.stringify({
        completedLevels: [1],
        unlockedLevel: 2,
        bestScores: { "1": { jumps: 3, timeSec: 9, gotAllGems: false } },
      }));
      const result = progress.loadProgress();
      assert.deepEqual(result.completedLevels, []);
      assert.equal(result.unlockedLevel, 1);
      assert.equal(progress.isUnlocked(2, result), false);
      assert.deepEqual(JSON.parse(storage.getItem(STORAGE_KEY)), result);
    });

    test("progress stays sequential even with malformed skipped-level storage", () => {
      storage.setItem(STORAGE_KEY, JSON.stringify({
        completedLevels: [1, 3],
        unlockedLevel: 4,
        bestScores: {
          "1": { jumps: 3, timeSec: 9, gotAllGems: true },
          "3": { jumps: 3, timeSec: 9, gotAllGems: true },
        },
      }));
      const result = progress.loadProgress();
      assert.deepEqual(result.completedLevels, [1]);
      assert.equal(result.unlockedLevel, 2);
      assert.equal(progress.isUnlocked(3, result), false);
    });

    console.log(`[progress-test] ${passed} regression tests passed.`);
  } finally {
    await server.close();
  }
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  await runProgressTests();
}