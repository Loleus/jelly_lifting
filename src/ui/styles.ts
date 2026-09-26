/**
 * Shared Tailwind class strings reused across screens/modals.
 * Kept as constants (not components) to allow composition with additional classes.
 */

/** Top-right / top-left icon button in menu + HUD. */
export const ICON_BTN =
  "flex h-8 w-8 items-center shadow-lg justify-center rounded-lg bg-gray-700 shadow-lg transition-transform hover:scale-105 active:scale-95 sm:h-10 sm:w-10 [@media(max-height:500px)]:h-7 [@media(max-height:500px)]:w-7";

/** Full-screen modal backdrop (dark blur). */
export const MODAL_BACKDROP =
  "font-freckle fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/75 p-4 backdrop-blur-sm [@media(max-height:500px)]:p-2";

/** Modal backdrop with lighter overlay (help). */
export const MODAL_BACKDROP_LIGHT =
  "fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/70 p-4 backdrop-blur-sm animate-in fade-in duration-200 [@media(max-height:500px)]:p-2";

/** Panel inside a modal — teal → dark green gradient. */
export const MODAL_PANEL =
  "relative my-auto max-h-[calc(100dvh-2rem)] w-full max-w-md overflow-y-auto rounded-3xl bg-gradient-to-b from-[#4eaa9e] to-[#153e2a] to-[#052e1a] p-6 text-center text-white shadow-2xl [@media(max-height:500px)]:max-h-[calc(100dvh-1rem)] [@media(max-height:500px)]:p-3";

/** Panel used by GameCompleteScreen (slightly larger padding). */
export const MODAL_PANEL_LG =
  "relative my-auto max-h-[calc(100dvh-2rem)] w-full max-w-md overflow-y-auto rounded-3xl bg-gradient-to-b from-[#4eaa9e] to-[#153e2a] to-[#052e1a] p-7 text-center text-white shadow-2xl [@media(max-height:500px)]:max-h-[calc(100dvh-1rem)] [@media(max-height:500px)]:p-3";

/** Panel with a red-ish gradient — game over. */
export const MODAL_PANEL_DANGER =
  "relative my-auto max-h-[calc(100dvh-2rem)] w-full max-w-sm overflow-y-auto rounded-3xl bg-gradient-to-b from-[#4eaa9e] to-[#153e2a] p-6 text-center text-white shadow-2xl [@media(max-height:500px)]:max-h-[calc(100dvh-1rem)] [@media(max-height:500px)]:p-3";

/** Panel used by help modal (no text-center). */
export const MODAL_PANEL_HELP =
  "font-arial relative my-auto max-h-[calc(100dvh-2rem)] w-full max-w-xl overflow-y-auto rounded-3xl bg-gradient-to-b from-[#4eaa9e] to-[#153e2a] p-6 text-sky-100 shadow-2xl [@media(max-height:500px)]:max-h-[calc(100dvh-1rem)] [@media(max-height:500px)]:p-3";

/** Panel used by settings modal (wider). */
export const MODAL_PANEL_SETTINGS =
  "font-arial relative my-auto max-h-[calc(100dvh-2rem)] w-full max-w-lg overflow-y-auto rounded-3xl bg-gradient-to-b from-[#4eaa9e] to-[#153e2a] p-6 text-sky-100 shadow-2xl [@media(max-height:500px)]:max-h-[calc(100dvh-1rem)] [@media(max-height:500px)]:p-3";

/** Secondary action button (sky-blue muted). */
export const BTN_SECONDARY =
  "flex items-center justify-center gap-1.5 rounded-xl bg-amber-600 py-2.5 text-2sm tracking-wide text-sky-100 hover:bg-amber-500";

/** Primary action button (emerald). */
export const BTN_PRIMARY =
  "flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-400 py-3 text-base tracking-wide text-[#052e1a] shadow-lg hover:bg-emerald-300";

/** Full-width secondary button (sky-blue muted). */
export const BTN_SECONDARY_FULL =
  "mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-amber-600 py-2.5 text-2sm tracking-wide text-sky-100 hover:bg-amber-500";
