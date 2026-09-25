# `src/dev/` — narzędzia developerskie (DEV ONLY)

Wszystko w tym katalogu istnieje **wyłącznie w wersji developerskiej** (`npm run dev`).
Bundle portalowy (`npm run build`) nie zawiera ani bajta z tego katalogu — patrz
plugin `dev-only-guard` w `vite.config.ts`:

1. każdy import z `src/dev/**` jest w buildzie przekierowywany na pusty stub,
2. katalog jest wyłączony ze skanu Tailwinda (brak klas CSS narzędzi),
3. po zbudowaniu bundla sprawdzany jest marker edytora — wyciek przerywa build.

## Pliki

| Plik | Źródło | Uwagi |
|---|---|---|
| `LevelEditorScreen.tsx` | Pierwotnie `Loleus/jelly-editor` | Lokalna kopia. Edytuj tutaj; dev i build nie pobierają ani nie nadpisują tego pliku. |

## Edytor poziomów — jak działa w grze

- **Wejście:** okienko „EDYTOR POZIOMÓW” pod przyciskiem PLAY na pierwszej stronie
  (`src/components/MenuScreen.tsx`, slot `devSlot`). Lokalne narzędzia są
  ładowane przez `import()` przy starcie wersji developerskiej.
- **Projekt planszy:** `loadEditorLevel()` — ostatni projekt z `localStorage`
  (`glower-editor-level-v3`) albo pusta wieża `createBlankLevel()`.
- **Test w 3D:** `onTestLevelIn3D(level)` → `App.handleTestLevelIn3D` buduje silnik
  `GlowerTowerGame` na projekcie z edytora i przełącza ekran na `playing`.
- **Wyjście z symulacji 3D:** ikona `PencilRuler` (zielona obwódka) na początku
  paska ikon HUD (`src/components/GameHUD.tsx`, slot `devButtons`) pozwala wrócić do
  edytora z zapamiętaną planszą. Na modalach wygranej/porażki (które zasłaniają
  pasek ikon) pojawia się dodatkowo przycisk „WRÓĆ DO EDYTORA”.
- **Bezpieczeństwo zapisu:** podczas testu z edytora (`fromEditor`) gra **nie zapisuje**
  postępu kampanii ani nie odblokowuje poziomów; modal wygranej nie ma
  „następnego poziomu”.
