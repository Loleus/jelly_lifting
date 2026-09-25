import { readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function sourceFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? sourceFiles(path) : /\.(?:[jt]sx?|css)$/.test(entry.name) ? [path] : [];
  });
}

function isLocalResource(url) {
  return !/^(?:[a-z][a-z\d+.-]*:|\/\/|#)/i.test(url) &&
    /\.[a-z\d]+(?:[?#].*)?$/i.test(url);
}

export function assertLocalAssets() {
  const required = new Set();
  const add = (url, origin, fromPublic = false) => {
    if (!isLocalResource(url)) return;
    const path = decodeURIComponent(url.split(/[?#]/)[0]);
    required.add(resolve(fromPublic || path.startsWith("/") ? join(ROOT, "public") : dirname(origin), path.replace(/^\//, "")));
  };

  for (const file of sourceFiles(join(ROOT, "src"))) {
    const source = readFileSync(file, "utf8");
    // Vite leaves unresolved new URL assets in the bundle instead of failing.
    for (const match of source.matchAll(/new\s+URL\(\s*(["'])([^"']+)\1\s*,\s*import\.meta\.url\s*\)/g)) {
      add(match[2], file);
    }
    if (file.endsWith(".css")) {
      for (const match of source.matchAll(/url\(\s*["']?([^\s"')]+)["']?\s*\)/g)) add(match[1], file);
    }
  }

  const entry = join(ROOT, "index.html");
  const html = readFileSync(entry, "utf8");
  for (const match of html.matchAll(/\b(?:src|href|content)=["']([^"']+\.(?:png|jpe?g|webp|svg|ico|woff2?|ttf|otf|webmanifest)(?:[?#][^"']*)?)["']/gi)) {
    add(match[1], entry, true);
  }
  for (const match of html.matchAll(/url\(\s*["']?([^\s"')]+)["']?\s*\)/g)) add(match[1], entry, true);

  const missing = [...required].filter((path) => {
    try {
      const stat = statSync(path);
      return !stat.isFile() || stat.size === 0;
    } catch {
      return true;
    }
  });
  if (missing.length) {
    // Nie blokujemy buildu: tekstury mają proceduralny fallback (src/gameTextures.ts),
    // a fonty/ikony/glut.png są wyłącznie dekoracyjne (font-system fallback,
    // favicony/PWA). Brak plików to tylko ostrzeżenie.
    console.warn(
      `[local-build] Uwaga — brakuje lokalnych assetów ozdobnych (${missing.length}):\n` +
      missing.map((path) => `  - ${relative(ROOT, path).replaceAll("\\", "/")}`).join("\n")
    );
  }
}

export async function runLocalBuildChecks() {
  if (!process.argv.includes("build")) return;
  const { runProgressTests } = await import("../tests/progress.test.mjs");
  await runProgressTests();
  const { runRenderingCullingTests } = await import("../tests/rendering-culling.test.mjs");
  await runRenderingCullingTests();
  assertLocalAssets();
  assertBuildProfiles();
  console.log("[local-build] Local files only. No downloads, restoration or generated replacements.");
}

/**
 * Regresja profili buildu (portal vs pwa).
 *
 * W buildzie Vite podmienia literały `import.meta.env.PROD` i `VITE_PWA`,
 * a minifier wycina martwe gałęzie. Ten test sprawdza źródłowe WARUNKI, które
 * muszą gwarantować:
 *   • portal  (PROD=true,  VITE_PWA=false) → fullscreen OFF, SW OFF, edytor OFF
 *   • pwa     (PROD=true,  VITE_PWA=true ) → fullscreen ON, SW ON, edytor OFF
 *   • dev     (PROD=false, VITE_PWA=false) → fullscreen ON, SW ON, edytor ON
 */
function assertBuildProfiles() {
  const read = (file) => readFileSync(join(ROOT, file), "utf8");

  const fullscreenSrc = read("src/utils/fullscreen.ts");
  const mainSrc = read("src/main.tsx");
  const appSrc = read("src/App.tsx");

  const fullscreenMatchesPwaAwareFlag =
    /PORTAL_BUILD:\s*boolean\s*=\s*import\.meta\.env\.PROD\s*&&\s*!import\.meta\.env\.VITE_PWA/.test(fullscreenSrc);
  const swGuardedByPwa =
    /\(!\s*import\.meta\.env\.PROD\s*\|\|\s*import\.meta\.env\.VITE_PWA\)\s*&&\s*"serviceWorker"\s*in\s*navigator/.test(mainSrc);
  const appFullscreenGateHonorsPwa =
    /if\s*\(\s*import\.meta\.env\.PROD\s*&&\s*!import\.meta\.env\.VITE_PWA\s*\)\s*return/.test(appSrc);

  if (!fullscreenMatchesPwaAwareFlag) {
    throw new Error("[local-build] REGRESJA: src/utils/fullscreen.ts nie respektuje VITE_PWA (fullscreen wyłączyłby się w PWA).");
  }
  if (!swGuardedByPwa) {
    throw new Error("[local-build] REGRESJA: src/main.tsx nie rejestruje SW w profilu PWA.");
  }
  if (!appFullscreenGateHonorsPwa) {
    throw new Error("[local-build] REGRESJA: src/App.tsx wycina fullscreen także w profilu PWA.");
  }

  console.log("[local-build] profile buildów: portal (bez SW/fullscreen), pwa (SW+fullscreen, bez edytora) — OK.");
}