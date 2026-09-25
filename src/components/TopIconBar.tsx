import React from "react";
import { HelpCircle, Maximize2, Settings, Volume2, VolumeX } from "lucide-react";
import type { Translation } from "../i18n";
import { ICON_BTN } from "../ui/styles";
import { PORTAL_BUILD } from "../utils/fullscreen";

interface TopIconBarProps {
  t: Translation;
  soundMuted: boolean;
  onToggleSound: () => void;
  onOpenSettings: () => void;
  onOpenHelp: () => void;
  onFullscreen: () => void;
  /** Extra buttons shown BEFORE the shared ones (e.g. restart/back in HUD). */
  leadingButtons?: React.ReactNode;
}

/**
 * Sound / Settings / Help / Fullscreen row shown in the menu and HUD.
 * Consumers may inject extra buttons (restart, back-to-menu) in front of the
 * shared four via `leadingButtons`.
 */
export const TopIconBar: React.FC<TopIconBarProps> = ({
  t,
  soundMuted,
  onToggleSound,
  onOpenSettings,
  onOpenHelp,
  onFullscreen,
  leadingButtons,
}) => (
  <div className="pointer-events-auto absolute right-1.5 top-1.5 z-10 flex items-center gap-1.5 sm:right-2 sm:top-2 sm:gap-2 [@media(max-height:500px)]:gap-1.5">
    {leadingButtons}
    <button
      onClick={onToggleSound}
      className={ICON_BTN}
      title={soundMuted ? t.unmute : t.mute}
      aria-label={soundMuted ? t.unmute : t.mute}
    >
      {soundMuted ? (
        <VolumeX className="h-4 w-4 text-rose-400 sm:h-5 sm:w-5" />
      ) : (
        <Volume2 className="h-4 w-4 text-emerald-400 sm:h-5 sm:w-5" />
      )}
    </button>
    <button onClick={onOpenSettings} className={ICON_BTN} title={t.settings} aria-label={t.settings}>
      <Settings className="h-4 w-4 text-cyan-300 sm:h-5 sm:w-5" />
    </button>
    <button onClick={onOpenHelp} className={ICON_BTN} title={t.help} aria-label={t.help}>
      <HelpCircle className="h-4 w-4 text-amber-300 sm:h-5 sm:w-5" />
    </button>
    {/* ====================================================================
        FULLSCREEN — własny przycisk gry. Portale (CrazyGames, Yandex Games,
        itch.io, GameMonetize, CoolMathGames, ArmorGames, Kongregate WebGL,
        Newgrounds) mają własny fullscreen i zabraniają gry wywoływania
        Fullscreen API. W bundlu portalowym (PORTAL_BUILD === true) ten
        przycisk jest W CAŁOŚCI wycinany (stała + dead-code-elimination).
        W dev (npm run dev) działa dokładnie jak w upstreamie.
        ==================================================================== */}
    {!PORTAL_BUILD && (
      <button onClick={onFullscreen} className={ICON_BTN} title={t.fullscreen} aria-label={t.fullscreen}>
        <Maximize2 className="h-4 w-4 text-sky-200 sm:h-5 sm:w-5" />
      </button>
    )}
  </div>
);
