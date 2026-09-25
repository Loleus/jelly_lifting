import React from "react";
import { Clock, Crown, Diamond, Home, RotateCcw } from "lucide-react";
import type { Translation } from "../i18n";
import { TOTAL_LEVELS } from "../levels";
import { formatTime } from "../utils/formatTime";
import { ICON_BTN } from "../ui/styles";
import { TopIconBar } from "./TopIconBar";

interface GameHUDProps {
  t: Translation;
  currentLevel: number;
  towerHeight: number;
  playerLevel: number;
  gemsCollected: number;
  totalGems: number;
  score: number;
  displayTime: number;
  soundMuted: boolean;
  onToggleSound: () => void;
  onRestart: () => void;
  onBackToMenu: () => void;
  onOpenSettings: () => void;
  onOpenHelp: () => void;
  onFullscreen: () => void;
  /**
   * DEV TOOL slot — przyciski narzędzi developerskich na początku paska ikon
   * (np. wyjście z symulacji 3D do edytora poziomów, src/dev/DevTools.tsx).
   * Przekazywane wyłącznie w `npm run dev`; w buildzie portalowym zawsze puste.
   */
  devButtons?: React.ReactNode;
}

/**
 * A single stat cell (icon + value) in the score row.
 */
const StatCell: React.FC<{
  icon: React.ReactNode;
  color: string;
  children: React.ReactNode;
}> = ({ icon, color, children }) => (
  <div
    className={`flex items-center gap-3 text-4xl tracking-wide ${color} [@media(max-height:500px)]:gap-1.5 [@media(max-height:500px)]:text-base sm:text-3xl`}
  >
    {icon}
    <span>{children}</span>
  </div>
);

const ICON_SIZE = "h-8 w-8 [@media(max-height:500px)]:h-4 [@media(max-height:500px)]:w-4 sm:h-6 sm:w-6";

export const GameHUD: React.FC<GameHUDProps> = ({
  t,
  currentLevel,
  towerHeight,
  playerLevel,
  gemsCollected,
  totalGems,
  score,
  displayTime,
  soundMuted,
  onToggleSound,
  onRestart,
  onBackToMenu,
  onOpenSettings,
  onOpenHelp,
  onFullscreen,
  devButtons,
}) => (
  <header className="hud-header pointer-events-none fixed inset-0 z-30">
    {/* Tower + floor (top-left) */}
    <div className="font-freckle absolute text-shadow-lg left-1.5 top-1.5 sm:left-2 sm:top-2">
      <div className="text-lg sm:text-4xl tracking-wider text-[#66df4c] [@media(max-height:500px)]:text-base">
        {t.hudTower} {currentLevel} <span className="text-[#66df4c]">/ {TOTAL_LEVELS}</span>
      </div>
      <div className="text-lg sm:text-4xl text-shadow-lg tracking-wider text-[#5fd4e6] [@media(max-height:500px)]:text-base">
        {t.hudFloor} {playerLevel} <span className="text-[#6fd4e6]">/ {towerHeight}</span>
      </div>
    </div>

    {/* Score row (center) */}
    <div className="hud-score pointer-events-auto flex flex-row flex-nowrap items-center gap-4 whitespace-nowrap font-freckle">
      <StatCell
        icon={<Diamond className={`${ICON_SIZE} fill-[#4ade80]`} />}
        color="text-[#86efac]"
      >
        {gemsCollected}
        <span className="text-[#66df4c]/90"> / {totalGems}</span>
      </StatCell>
      <StatCell icon={<Clock className={ICON_SIZE} />} color="text-[#7fd4e6]">
        {formatTime(displayTime)}
      </StatCell>
      <StatCell icon={<Crown className={ICON_SIZE} />} color="text-[#a8c8ea]">
        {score}
      </StatCell>
    </div>

    {/* Top-right buttons (dev slot + restart + back-to-menu + shared bar) */}
    <TopIconBar
      t={t}
      soundMuted={soundMuted}
      onToggleSound={onToggleSound}
      onOpenSettings={onOpenSettings}
      onOpenHelp={onOpenHelp}
      onFullscreen={onFullscreen}
      leadingButtons={
        <>
          {devButtons}
          <button onClick={onRestart} className={ICON_BTN} title={t.restartLevel}>
            <RotateCcw className="h-4 w-4 text-amber-400 sm:h-5 sm:w-5" />
          </button>
          <button onClick={onBackToMenu} className={ICON_BTN} title={t.backToMenu}>
            <Home className="h-4 w-4 text-cyan-400 sm:h-5 sm:w-5" />
          </button>
        </>
      }
    />
  </header>
);
