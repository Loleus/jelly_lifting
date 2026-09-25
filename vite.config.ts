// ============================================================================
//  vite.config.ts — bundler Glut Żelek: Wieże
// ============================================================================
//  UWAGA: w repo upstream plik vite.config.ts jest celowo w .gitignore
//  (konfiguracja lokalna). Ten plik to „przerobiony bundler” pod budowę
//  portalową — patrz PORTALS.md.
//
//  Co zostało zmienione względem domyślnej konfiguracji:
//   1. base: "./" — WZGLĘDNE ścieżki zasobów. WYMAGANE przez portale
//      (CrazyGames, Yandex, itch.io, GameMonetize, CoolMathGames, ArmorGames,
//      Kongregate WebGL, Newgrounds) — gra jest serwowana z podścieżki
//      lub z iframu, bezwzględne "/assets/..." wskazywałoby na domenę portalu.
//   2. restoreUpstream() — synchronizacja binarek i wielkich źródeł z upstream
//      (scripts/restore-upstream.mjs). Binarki są „przechowywane jako upstream”
//      i trafiają do bundlu lokalnie — zero zewnętrznych żądań w portalu.
//   3. portal-strip-sw — w bundlu produkcyjnym usuwa dist/sw.js. Portale
//      zabraniają service workerów; sama rejestracja jest już wycięta
//      z src/main.tsx (import.meta.env.PROD), a tu sprzątamy plik.
//   4. Własny fullscreen gry jest wycinany z bundla produkcyjnego
//      (src/utils/fullscreen.ts + src/components/TopIconBar.tsx + src/App.tsx,
//      guardy import.meta.env.PROD) — portale mają własny przycisk fullscreen.
//      W dev (npm run dev) wszystko działa jak w upstreamie.
//   5. dev-only-guard — NARZĘDZIA DEVELOPERSKIE (src/dev/**, m.in. edytor
//      poziomów) istnieją tylko w `npm run dev`. W buildzie plugin:
//        a) każdy import z src/dev/** przekierowuje na pusty stub (nawet gdyby
//           tree-shaking zawiódł, do dist/ nie trafi ani bajt edytora),
//        b) wyklucza src/dev/** ze skanu Tailwinda (brak klas CSS edytora),
//        c) po wygenerowaniu bundla sprawdza, czy kod edytora nie wyciekł —
//           jeśli tak, PRZERYWA build.
//   6. build.target: "es2020" + ręczne chunki (three, react) — szeroka
//      kompatybilność z przeglądarkami graczy i stabilne cache'owanie.
// ============================================================================

import { defineConfig, loadEnv, normalizePath, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { rmSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { restoreUpstream } from "./scripts/restore-upstream.mjs";

// ── dev-only-guard ─────────────────────────────────────────────────────────
const DEV_STUB_ID = "\0dev-only-stub";
/** Klucz localStorage edytora — występuje WYŁĄCZNIE w kodzie edytora. */
const EDITOR_JS_MARKER = "glower-editor-level-v3";
/** Neonowy pomarańcz palety edytora — nie występuje w UI gry. */
const EDITOR_CSS_MARKER = /ff8c00/i;

const DEV_STUB = `// [dev-only-guard] Narzędzia developerskie (src/dev/**) nie istnieją w buildzie portalowym.
const unavailable = () => {
  throw new Error("Narzędzia developerskie (edytor poziomów) są dostępne tylko w wersji developerskiej (npm run dev).");
};
export const LevelEditorScreen = unavailable;
export const loadEditorLevel = unavailable;
export const saveEditorLevel = unavailable;
export const createBlankLevel = unavailable;
export const formatLevelJson = unavailable;
export default unavailable;
`;

function devOnlyGuard(): Plugin {
  let devDir = "";
  return {
    name: "dev-only-guard",
    apply: "build",
    enforce: "pre",
    configResolved(config) {
      devDir = normalizePath(resolve(config.root, "src/dev")) + "/";
    },
    // a) Każdy relatywny import wskazujący do src/dev/** → wirtualny stub.
    resolveId(source, importer) {
      if (!importer || !source.startsWith(".")) return null;
      const abs = normalizePath(resolve(dirname(importer), source));
      return abs.startsWith(devDir) ? DEV_STUB_ID : null;
    },
    load(id) {
      return id === DEV_STUB_ID ? DEV_STUB : null;
    },
    // b) Tailwind v4 skanuje automatycznie cały projekt — w buildzie wyłączamy
    //    katalog narzędzi developerskich (`@source not`), żeby klasy edytora
    //    nie trafiły do CSS portalowego. W dev index.css zostaje nietknięty.
    transform(code, id) {
      const clean = id.split("?")[0];
      if (!/[\\/]src[\\/]index\.css$/.test(clean)) return null;
      if (!/@import\s+["']tailwindcss["']/.test(code)) return null;
      return {
        code: code.replace(/@import\s+["']tailwindcss["'];?/, (m) => `${m}\n@source not "./dev";`),
        map: null,
      };
    },
    // c) Asercja końcowa: żaden chunk nie może zawierać kodu edytora.
    generateBundle(_options, bundle) {
      for (const [fileName, output] of Object.entries(bundle)) {
        if (output.type === "chunk") {
          if (output.code.includes(EDITOR_JS_MARKER)) {
            throw new Error(
              `[dev-only-guard] Kod edytora poziomów wyciekł do ${fileName} — build portalowy przerwany.`
            );
          }
          if (output.moduleIds.includes(DEV_STUB_ID)) {
            this.warn(`[dev-only-guard] pusty stub src/dev w ${fileName} (bez kodu edytora — tree-shaking nie usunął gałęzi)`);
          }
        } else if (fileName.endsWith(".css")) {
          const css = typeof output.source === "string" ? output.source : Buffer.from(output.source).toString("utf8");
          if (EDITOR_CSS_MARKER.test(css)) {
            this.warn(`[dev-only-guard] w ${fileName} są klasy palety edytora — sprawdź dyrektywę @source not "./dev"`);
          }
        }
      }
      console.log("[dev-only-guard] OK — narzędzia developerskie (src/dev/**) nie są częścią bundla");
    },
  };
}

export default defineConfig(async ({ command, mode }) => {
  // Blokuje start Vite do momentu zsynchronizowania plików z upstream.
  await restoreUpstream();

  const env = loadEnv(mode, process.cwd(), "");
  // `pwa` — osobny bundle standalone z pełnym SW, fullscreenem, bez edytora.
  // Każdy inny tryb (dev / `build` portalowy) działa bez tej flagi.
  const isPwa = mode === "pwa" || env.VITE_PWA === "true" || env.VITE_PWA === "1";
  const outDir = isPwa ? "dist-pwa" : "dist";

  /** Usuwa service worker wyłącznie w bundlu portalowym (portale go zabraniają). */
  const portalStripSw: Plugin = {
    name: "portal-strip-sw",
    apply: "build",
    closeBundle() {
      if (isPwa) {
        console.log("[pwa] zachowano sw.js — pełne PWA standalone (offline)");
        return;
      }
      const swBundle = resolve(process.cwd(), outDir, "sw.js");
      try {
        rmSync(swBundle);
        console.log("[portal] usunięto dist/sw.js — portale zabraniają service workerów");
      } catch {
        // brak pliku = OK
      }
    },
  };

  return {
    // WZGLĘDNE ścieżki — wymóg serwowania z podścieżki (portale, itch.io).
    base: "./",
    // W profilu PWA dajemy main.tsx znać, że SW ma być rejestrowany;
    // w dev i portalu wartość jest nieustawiona.
    define: {
      "import.meta.env.VITE_PWA": isPwa ? "true" : "false",
    },
    // Kolejność ma znaczenie: dev-only-guard (enforce: "pre") musi zadziałać
    // PRZED pluginem Tailwinda, żeby wstrzyknąć `@source not "./dev"`.
    plugins: [devOnlyGuard(), react(), tailwindcss(), portalStripSw],
    build: {
      // Cel ES2020 — szeroka kompatybilność (przeglądarki graczy, starsze
      // mobilne WebView w aplikacjach portalowych).
      target: "es2020",
      outDir,
      emptyOutDir: true,
      chunkSizeWarningLimit: 1600,
      rollupOptions: {
        output: {
          // Stabilne chunki vendorowe: three.js ~1,2 MB, react ~140 KB.
          manualChunks: {
            three: ["three"],
            react: ["react", "react-dom"],
          },
        },
      },
    },
    // Podgląd builda portalowego lokalnie (npm run preview) też z relatywnym
    // base i bez SW.
    preview: {
      port: 4173,
      strictPort: false,
    },
    server: {
      https: false,
    },
  };
});
