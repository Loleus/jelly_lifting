import React from "react";
import { Home, Lock } from "lucide-react";
import type { Translation } from "../i18n";
import { LEVELS, TOTAL_LEVELS } from "../levels";
import { isUnlocked, type SavedProgress } from "../levels/progress";
import { formatTime } from "../utils/formatTime";

interface LevelSelectScreenProps {
  t: Translation;
  progress: SavedProgress;
  onBackToMenu: () => void;
  onSelectLevel: (levelNum: number) => void;
}

interface LevelTileProps {
  t: Translation;
  levelNum: number;
  progress: SavedProgress;
  onSelect: (n: number) => void;
}

const LevelTile: React.FC<LevelTileProps> = ({ t, levelNum, progress, onSelect }) => {
  const unlocked = isUnlocked(levelNum, progress);
  const completed = progress.completedLevels.includes(levelNum);
  const isNext = levelNum === progress.unlockedLevel;
  const best = progress.bestScores?.[levelNum];

  const tone = !unlocked
    ? "bg-[#0e4a6e]/50 text-white/30 cursor-not-allowed"
    : completed
      ? "bg-gradient-to-b from-[#86efac] to-[#56af7c] text-[#0e4a6e] hover:scale-110"
      : isNext
        ? "bg-gradient-to-b from-[#7fd496] to-amber-400 text-[#0e4a4e] animate-pulse hover:scale-110"
        : "bg-gradient-to-b from-[#0e4a6e]/80 to-[#4ade80]/60 text-[#86efac] hover:scale-110";

  return (
    <button
      disabled={!unlocked}
      onClick={() => onSelect(levelNum)}
      className={`group relative aspect-square flex flex-col items-center justify-center rounded-xl font-freckle tracking-wide transition-all shadow-[0_6px_20px_rgba(0,0,0,0.6)] ${tone}`}
    >
      <span className="text-base sm:text-4xl leading-none">{levelNum}</span>
      {completed && best ? (
        <div className="text-xl sm:text-xl leading-snug opacity-90">
          <div>
            {best.jumps} {t.bestJumps}
          </div>
          <div>{formatTime(best.timeSec)}</div>
        </div>
      ) : !unlocked ? (
        <div className="mt-1 text-base flex justify-center">
          <Lock className="h-7 w-7" />
        </div>
      ) : (
        <div className="mt-1 text-2xl text-[#0e4a4e] uppercase tracking-wider">
          {isNext ? t.levelNew : t.levelPlay}
        </div>
      )}
    </button>
  );
};

export const LevelSelectScreen: React.FC<LevelSelectScreenProps> = ({
  t,
  progress,
  onBackToMenu,
  onSelectLevel,
}) => (
  <>
    <div className="pointer-events-none fixed inset-0 z-30" />
    <div className="fixed inset-0 z-40 flex flex-col items-center justify-center p-4 sm:p-8 animate-in fade-in duration-300 overflow-y-auto [@media(max-height:500px)]:p-2">
      <div className="relative my-auto max-h-[calc(100dvh-2rem)] w-full max-w-2xl overflow-y-auto rounded-4xl bg-gradient-to-b from-[#4eaa9e] to-[#153e2a] p-6 sm:p-8 shadow-[0_20px_60px_rgba(0,0,0,0.8)] backdrop-blur-md [@media(max-height:500px)]:max-h-[calc(100dvh-1rem)] [@media(max-height:500px)]:p-3">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-freckle text-3xl text-[#86efac] drop-shadow-[0_3px_10px_rgba(0,0,0,0.7)] tracking-wide">
            {t.selectLevel}
          </h2>
          <button
            onClick={onBackToMenu}
            className="flex h-12 w-12 items-center justify-center rounded-full bg-[#0e4a6e]/85 text-white shadow-[0_4px_16px_rgba(0,0,0,0.6)] hover:scale-110 active:scale-95 transition-transform backdrop-blur-sm"
            aria-label={t.backToMenu}
            title={t.backToMenu}
          >
            <Home className="h-6 w-6 text-[#a8c8ea]" />
          </button>
        </div>
        <p className="font-freckle text-xl text-[#b8d8fa] mb-5 tracking-wide drop-shadow-[0_2px_8px_rgba(0,0,0,0.7)]">
          {t.selectHint}
        </p>
        <div className="grid grid-cols-5 gap-3 sm:gap-4">
          {LEVELS.map((_, idx) => (
            <LevelTile
              key={idx + 1}
              t={t}
              levelNum={idx + 1}
              progress={progress}
              onSelect={onSelectLevel}
            />
          ))}
        </div>
        <div className="mt-6 flex items-center justify-between font-freckle text-lg text-[#a8c8ea] tracking-wide drop-shadow-[0_2px_8px_rgba(0,0,0,0.7)]">
          <span>
            {t.completed} {progress.completedLevels.length}/{TOTAL_LEVELS}
          </span>
          <span>
            {t.upTo} {Math.min(progress.unlockedLevel, TOTAL_LEVELS)}
          </span>
        </div>
      </div>
    </div>
  </>
);
