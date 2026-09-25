# Build portalowy (CrazyGames, Yandex, itch.io, GameMonetize, CoolMathGames, ArmorGames, Kongregate WebGL, Newgrounds)

Ten dokument opisuje, jak bundler i startup gry zostały przerobione, żeby build
korzystał z profilu portalowego. Zarówno dev (`npm run dev`), jak i build
(`npm run build`) korzystają **wyłącznie z lokalnych plików projektu**.
Dotychczasowy profil produkcyjny wyłącza własny fullscreen, SW i narzędzia developerskie.

## Co jest w bundlu, a czego nie ma

| Element | Dev (`npm run dev`) | Bundle portalowy (`npm run build`) |
|---|---|---|
| Własny fullscreen gry (przycisk + Fullscreen API) | działa jak w upstreamie | **wycięty** (portale mają własny przycisk fullscreen) |
| Service Worker (`sw.js`) + rejestracja | działa (PWA, offline) | **wycięty** — brak rejestracji i brak pliku w `dist/` |
| Ścieżki zasobów | lokalne | **względne** (`./`), obsługa podścieżki/iframu |
| Binarki (tekstury, fonty, ikony) | wyłącznie lokalne | pakowane z lokalnych plików, bez pobierania i zamienników |
| Reszta (fizyka, poziomy, dźwięk, UI) | lokalne źródła | te same lokalne źródła |

## Gdzie to jest zrobione (w źródle, z komentarzami)

- `src/utils/fullscreen.ts` — flaga `PORTAL_BUILD = import.meta.env.PROD`;
  `toggleFullscreen()` jest no-op w bundlu (Vite statycznie podmienia stałą,
  a minifier wycina martwy kod).
- `src/components/TopIconBar.tsx` — przycisk pełnego ekranu jest renderowany
  tylko gdy `!PORTAL_BUILD` (w bundlu znika w całości).
- `src/App.tsx` — `handleFullscreen()` wraca natychmiast w bundlu.
- `src/main.tsx` — rejestracja SW tylko gdy `!import.meta.env.PROD` (dev).
  Oryginalny kod jest tam zakomentowany.
- `vite.config.ts` — `base: "./"` (względne ścieżki) oraz plugin `portal-strip-sw`
  usuwający `dist/sw.js` po buildzie.
- `scripts/local-build-checks.mjs`: lokalne testy regresji i kontrola brakujących
  assetów. Nie pobiera, nie generuje ani nie nadpisuje plików gry.
- `scripts/restore-upstream.mjs`: zachowana wyłącznie nazwa importu dla istniejącej
  konfiguracji Vite. Moduł przekazuje wywołanie do lokalnych kontroli;
  mechanizm przywracania został usunięty. `JELLY_FORCE_RESTORE` nie działa.
- Usunięto generator `ensure-assets.mjs` i obsługę `.upstream-sha`.
  Brakujące assety trzeba dodać lokalnie; build zgłosi listę zamiast je zastępować.

## Wymagania poszczególnych serwisów — jak są spełnione

| Serwis | Wymóg | Rozwiązanie |
|---|---|---|
| CrazyGames | brak własnego fullscreena, brak SW, brak zewnętrznych żądań, zasoby w zipie | fullscreen wycięty, SW usunięty, binarki wbudowane |
| Yandex Games | SDK + własny fullscreen, brak SW | j.w. |
| itch.io | osadzenie w iframe, względne ścieżki | `base: "./"` |
| GameMonetize | brak SW, względne ścieżki | j.w. |
| CoolMathGames | brak SW, brak własnego fullscreena | j.w. |
| ArmorGames | brak SW, iframe-friendly | j.w. |
| Kongregate WebGL | brak SW, brak własnego fullscreena | j.w. |
| Newgrounds | brak SW, iframe-friendly | j.w. |

## Narzędzia developerskie (edytor poziomów) — nie ma ich w buildzie

Katalog `src/dev/` zawiera lokalny, edytowalny `LevelEditorScreen.tsx`.
Narzędzia są dostępne tylko w `npm run dev`:

| Element | Dev (`npm run dev`) | Bundle portalowy (`npm run build`) |
|---|---|---|
| Okienko „EDYTOR POZIOMÓW” pod PLAY w menu | jest | **nie ma** (`import.meta.env.DEV`) |
| Ekran edytora (siatka 2D, pędzle, eksport JSON) | ładowany leniwie po kliknięciu | **nie ma** — brak chunku |
| Ikona wyjścia z symulacji 3D do edytora (pasek ikon HUD) | jest podczas testu z edytora | **nie ma** |
| Klasy CSS edytora | są | **nie ma** (`@source not "./dev"`) |

Gwarancje w bundlerze (`vite.config.ts` → plugin `dev-only-guard`):
1. import z `src/dev/**` w buildzie → pusty stub (nawet gdyby tree-shaking zawiódł),
2. `src/dev/**` wyłączone ze skanu Tailwinda,
3. po zbudowaniu bundla marker edytora jest sprawdzany — wyciek **przerywa build**.

Szczegóły: `src/dev/README.md`.

## Build i publikacja

```bash
npm install
npm run build   # → dist/ — kompletny, portalowy bundle (bez SW, bez fullscreena)
npm run preview # lokalny podgląd buildu
```

Zawartość `dist/` pakujesz jako zip/ładujesz bezpośrednio do serwisu.
Wszystkie zasoby (JS, CSS, tekstury, fonty, ikony, poziomy) są relatywne,
bez żadnych odwołań do zewnętrznych domen.
