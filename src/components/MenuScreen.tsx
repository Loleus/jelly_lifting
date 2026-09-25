import React from "react";
import { Play } from "lucide-react";
import type { Translation, Lang } from "../i18n";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { TopIconBar } from "./TopIconBar";

interface MenuScreenProps {
  t: Translation;
  lang: Lang;
  onLangChange: (l: Lang) => void;
  soundMuted: boolean;
  onToggleSound: () => void;
  onOpenSettings: () => void;
  onOpenHelp: () => void;
  onFullscreen: () => void;
  onPlay: () => void;
  /**
   * DEV TOOL slot — okienko pod przyciskiem PLAY (np. uruchamianie edytora
   * poziomów, src/dev/DevTools.tsx). Przekazywane wyłącznie w `npm run dev`;
   * w buildzie portalowym zawsze puste — menu wygląda jak w upstreamie.
   */
  devSlot?: React.ReactNode;
}

export const MenuScreen: React.FC<MenuScreenProps> = ({
  t,
  lang,
  onLangChange,
  soundMuted,
  onToggleSound,
  onOpenSettings,
  onOpenHelp,
  onFullscreen,
  onPlay,
  devSlot,
}) => (
  <>
    <div className="pointer-events-none fixed inset-0 z-30 bg-gradient-to-b from-[#050b14]/30 via-[#0b1520]/22 to-[#050b14]/35" />
    <div className="pointer-events-none fixed inset-0 z-40 animate-in fade-in duration-500">
      {/* Language switcher top-left */}
      <div className="pointer-events-auto absolute left-1.5 top-1.5 z-10 flex items-center gap-1.5 sm:left-2 sm:top-2 sm:gap-2 [@media(max-height:500px)]:gap-1.5">
        <LanguageSwitcher lang={lang} onChange={onLangChange} />
      </div>

      <TopIconBar
        t={t}
        soundMuted={soundMuted}
        onToggleSound={onToggleSound}
        onOpenSettings={onOpenSettings}
        onOpenHelp={onOpenHelp}
        onFullscreen={onFullscreen}
      />

      {/* Title */}
      <div className="menu-title pointer-events-none absolute inset-x-4 top-[7%] text-center [@media(max-height:500px)]:top-[1.6rem]">
        <h1 className="font-freckle leading-[0.85] tracking-wide">
          <span className="block drop-shadow-[0px_0px_8px_rgba(86,250,200,0.9)] text-transparent text-[6rem] bg-clip-text bg-gradient-to-b from-[#a8c8ea] via-[#7fe6b1] to-[#4ade80] sm:text-[11rem] [@media(max-height:500px)]:text-[6rem] [@media(max-width:500px)]:mt-0">
            {t.appName}
          </span>
          <span className="block mt-2 drop-shadow-[0px_0px_4px_rgba(86,250,200,0.9)] whitespace-nowrap text-6xl text-transparent bg-clip-text bg-gradient-to-b from-[#86efac] via-[#4ade80] to-[#0e6e23] sm:text-6xl [@media(max-height:500px)]:text-4xl [@media(max-height:500px)]:mt-1">
            {t.appSubtitle}
          </span>
        </h1>
      </div>

      {/* Play button */}
      <div className="pointer-events-auto absolute left-1/2 top-[67%] flex -translate-x-1/2 -translate-y-1/2 flex-col items-center [@media(max-height:500px)]:top-[67%]">
        <button
          onClick={onPlay}
          className="group relative shadow-[0_0_20px_#FBBF24] flex h-20 w-20 items-center justify-center rounded-full bg-amber-400 text-[#a27c18] transition-transform duration-300 hover:scale-110 active:scale-95 sm:h-24 sm:w-24 [@media(max-height:500px)]:h-16 [@media(max-height:500px)]:w-16"
          aria-label={t.menuPlayAria}
        >
          <Play className="ml-1 h-12 w-12 fill-current transition-transform duration-200 group-hover:scale-110 sm:h-12 sm:w-12 [@media(max-height:500px)]:ml-0.5 [@media(max-height:500px)]:h-8 [@media(max-height:500px)]:w-8" />
        </button>
        <span className="mt-3 font-freckle text-2xl text-shadow-[0_0_20px_#FBBF24] tracking-[0.3em] text-amber-400 drop-shadow-[0_3px_12px_rgba(0,0,0,0.9)] [@media(max-height:500px)]:mt-2 [@media(max-height:500px)]:text-base">
          {t.menuPlay}
        </span>

        {/* DEV TOOL slot: okienko uruchamiania edytora poziomów (tylko npm run dev) */}
        {devSlot}
      </div>
      <span className="menu-logo pointer-events-auto absolute bottom-5 left-1/2 -translate-x-1/2 text-center z-index:1000 text-shadow-[0_0_20px_#9aa] text-[#9aa] drop-shadow-[0_3px_12px_rgba(0,0,0,0.9)] [@media(max-height:500px)]:bottom-1 [@media(max-height:500px)]:text-xs">
        <a href="https://www.facebook.com/profile.php?id=1795933173" target="_blank" rel="noopener noreferrer" className="display:block hover:cursor-pointer z-index:1000">
          {t.menuCredits}
        </a>
      </span>
    </div>
  </>
);
