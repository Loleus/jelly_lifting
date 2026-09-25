// ============================================================================
//  DEV TOOLS — UI narzędzi developerskich (TYLKO `npm run dev`)
// ============================================================================
//  All developer tools are local files; startup never replaces them.
//  Leży w src/dev/, więc w buildzie portalowym nie istnieje w ogóle
//  (vite.config.ts → dev-only-guard): ani jego JSX, ani klasy Tailwinda.
//
//  App.tsx ładuje ten moduł leniwie (`import()`) wyłącznie w dev i wstawia:
//    • DevMenuLauncher        → okienko pod przyciskiem PLAY (MenuScreen.devSlot)
//    • EditorExitIconButton   → ikona wyjścia z symulacji 3D w pasku ikon HUD
//                               (GameHUD.devButtons)
//    • EditorExitPill         → wyjście do edytora nad modalami wygranej/porażki
//    • LevelEditorScreen / loadEditorLevel → sam edytor (← Loleus/jelly-editor)
// ============================================================================

import React from "react";
import { PencilRuler } from "lucide-react";
import { ICON_BTN } from "../ui/styles";

export { LevelEditorScreen, loadEditorLevel } from "./LevelEditorScreen";

/** Okienko uruchamiania edytora — pierwsza strona, pod przyciskiem PLAY. */
export const DevMenuLauncher: React.FC<{ onOpenEditor: () => void }> = ({ onOpenEditor }) => (
  <div className="mt-5 flex flex-col items-center gap-1.5 rounded-2xl border border-dashed border-sky-300/40 bg-[#05101c]/85 px-4 py-2.5 shadow-[0_8px_24px_rgba(0,0,0,0.55)] backdrop-blur-sm [@media(max-height:500px)]:mt-2 [@media(max-height:500px)]:gap-1 [@media(max-height:500px)]:px-3 [@media(max-height:500px)]:py-1.5">
    <span className="rounded-full bg-amber-400/20 px-2 py-0.5 text-[10px] tracking-[0.25em] text-amber-300">
      DEV TOOL
    </span>
    <button
      onClick={onOpenEditor}
      className="flex items-center gap-2 rounded-full border border-sky-400/40 bg-[#0a1e34]/90 px-4 py-1.5 font-freckle text-sm tracking-wider text-sky-200 shadow-lg transition-all hover:border-emerald-400 hover:text-emerald-300 active:scale-95 [@media(max-height:500px)]:px-3 [@media(max-height:500px)]:py-1 [@media(max-height:500px)]:text-xs"
      title="Otwórz edytor poziomów (siatka 2D → test w 3D)"
    >
      <PencilRuler className="h-4 w-4" />
      EDYTOR POZIOMÓW
    </button>
    <span className="text-[10px] tracking-wide text-sky-300/60 [@media(max-height:500px)]:hidden">
      tylko wersja developerska · nie trafia do buildu
    </span>
  </div>
);

/** Ikona w pasku ikon HUD: wyjście z symulacji 3D z powrotem do edytora. */
export const EditorExitIconButton: React.FC<{ onClick: () => void }> = ({ onClick }) => (
  <button
    onClick={onClick}
    className={`${ICON_BTN} ring-2 ring-emerald-400/70`}
    title="Wyjdź z symulacji 3D do edytora poziomów"
    aria-label="Wyjdź z symulacji 3D do edytora poziomów"
  >
    <PencilRuler className="h-4 w-4 text-emerald-400 sm:h-5 sm:w-5" />
  </button>
);

/**
 * Modale wygranej/porażki (z-50) zasłaniają pasek ikon HUD (z-30) — podczas
 * testu z edytora dokładamy nad nimi wyraźne wyjście do edytora.
 */
export const EditorExitPill: React.FC<{ onClick: () => void }> = ({ onClick }) => (
  <button
    onClick={onClick}
    className="fixed right-3 top-14 z-[55] flex items-center gap-2 rounded-full border border-emerald-400/60 bg-[#052e1a]/95 px-4 py-2 font-freckle text-sm tracking-wider text-emerald-300 shadow-xl backdrop-blur-sm transition-all hover:bg-emerald-500/20 active:scale-95 sm:top-16"
    title="Wyjdź z symulacji 3D do edytora poziomów"
  >
    <PencilRuler className="h-4 w-4" />
    WRÓĆ DO EDYTORA
  </button>
);
