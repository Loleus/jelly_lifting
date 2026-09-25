/**
 * Cross-browser fullscreen helpers with iOS PWA detection.
 *
 * iOS Safari blocks the Fullscreen API in browser tabs — the only way to run
 * fullscreen is installing the page as a home-screen PWA. This module surfaces
 * that state so the caller can show the "add to home screen" guide.
 *
 * --------------------------------------------------------------------------
 * PORTALE (CrazyGames / Yandex / itch.io / GameMonetize / CoolMathGames /
 * ArmorGames / Kongregate WebGL / Newgrounds):
 * Każdy z tych serwisów ma WŁASNY przycisk pełnego ekranu i zabrania grze
 * wywoływania Fullscreen API. Dlatego w bundlu portalowym:
 *   • PORTAL_BUILD === true   → toggleFullscreen() jest no-op (wycinane
 *     przez dead-code-elimination, bo import.meta.env.PROD jest stałą),
 *   • przycisk pełnego ekranu jest ukrywany (zob. components/TopIconBar.tsx).
 * Wersja developerska (npm run dev) oraz osobny BUNDEL PWA (npm run build:pwa)
 * działają jak upstream — pełny ekran i przewodnik iOS działają normalnie.
 * --------------------------------------------------------------------------
 */

/**
 * `true` wyłącznie w bundlu portalowym (`vite build`).
 * W dev i w bundlu PWA wynosi `false`, więc fullscreen działa.
 */
export const PORTAL_BUILD: boolean = import.meta.env.PROD && !import.meta.env.VITE_PWA;

type FsDoc = Document & {
  webkitFullscreenElement?: Element | null;
  webkitExitFullscreen?: () => Promise<void> | void;
  mozCancelFullScreen?: () => Promise<void> | void;
};
type FsElem = HTMLElement & {
  webkitRequestFullscreen?: (opts?: unknown) => Promise<void> | void;
  mozRequestFullScreen?: () => Promise<void> | void;
  msRequestFullscreen?: () => Promise<void> | void;
};

export const isIPhone = (): boolean => /iPhone|iPod/i.test(navigator.userAgent);

/** True when the app is already running in standalone PWA / fullscreen mode. */
export const isStandalone = (): boolean =>
  ("standalone" in navigator && (navigator as unknown as { standalone: boolean }).standalone === true) ||
  window.matchMedia("(display-mode: standalone)").matches ||
  window.matchMedia("(display-mode: fullscreen)").matches;

/**
 * Toggle document fullscreen. Returns:
 * - "ok" → request/exit succeeded
 * - "already-pwa" → iPhone already running as installed PWA (no-op)
 * - "ios-blocked" → iOS Safari cannot enter fullscreen; show help guide
 */
export const toggleFullscreen = async (): Promise<"ok" | "already-pwa" | "ios-blocked"> => {
  // Portale: własny fullscreen gry jest zabroniony.
  if (PORTAL_BUILD) return "ok";

  const doc = document as FsDoc;
  const elem = document.documentElement as FsElem;
  const iPhone = isIPhone();
  if (iPhone && isStandalone()) return "already-pwa";

  const fsEl = document.fullscreenElement ?? doc.webkitFullscreenElement;
  try {
    if (fsEl) {
      if (document.exitFullscreen) await document.exitFullscreen();
      else if (doc.webkitExitFullscreen) await doc.webkitExitFullscreen.call(document);
      else if (doc.mozCancelFullScreen) await doc.mozCancelFullScreen.call(document);
      return "ok";
    }
    if (elem.requestFullscreen) {
      await elem.requestFullscreen({ navigationUI: "hide" });
      return "ok";
    }
    if (elem.webkitRequestFullscreen) {
      await elem.webkitRequestFullscreen.call(elem);
      return "ok";
    }
    if (elem.mozRequestFullScreen) {
      await elem.mozRequestFullScreen.call(elem);
      return "ok";
    }
    if (elem.msRequestFullscreen) {
      await elem.msRequestFullscreen.call(elem);
      return "ok";
    }
    return iPhone ? "ios-blocked" : "ok";
  } catch {
    // Safari/Firefox on iPhone silently reject — surface guide state
    return iPhone ? "ios-blocked" : "ok";
  }
};
