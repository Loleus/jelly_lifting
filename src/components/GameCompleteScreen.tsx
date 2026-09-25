import React from "react";
import { Home, RotateCcw, Sparkles, Trophy } from "lucide-react";
import type { Translation } from "../i18n";
import { formatTime } from "../utils/formatTime";
import { fireCompletionConfetti } from "../utils/confettiEffects";
import { Modal } from "../ui/Modal";
import { StatsGrid } from "../ui/StatsGrid";
import { BTN_PRIMARY, BTN_SECONDARY_FULL, MODAL_PANEL_LG } from "../ui/styles";

interface GameCompleteScreenProps {
  t: Translation;
  score: number;
  gems: number;
  totalGems: number;
  jumps: number;
  totalTime: number;
  levelsCompleted: number;
  onRestart: () => void;
  onBackToMenu: () => void;
}

export const GameCompleteScreen: React.FC<GameCompleteScreenProps> = ({
  t,
  score,
  gems,
  totalGems,
  jumps,
  totalTime,
  levelsCompleted,
  onRestart,
  onBackToMenu,
}) => {
  React.useEffect(() => fireCompletionConfetti(), []);

  return (
    <Modal panelClassName={MODAL_PANEL_LG}>
      <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-amber-400 text-[#052e1a] shadow-lg">
        <Trophy className="h-11 w-11 animate-bounce" />
      </div>
      <div className="mt-2 inline-flex items-center gap-2 rounded-full bg-amber-400/20 px-3 py-1 text-sm tracking-wide text-amber-200">
        <Sparkles className="h-3 w-3" /> {t.completedBadge}
      </div>
      <h2 className="mt-3 text-3xl tracking-wide text-amber-200">{t.congrats}</h2>
      <p className="mt-2 text-base tracking-wide text-sky-200">
        {t.congratsDesc(levelsCompleted)}
      </p>

      <StatsGrid className="my-5">
        <StatsGrid.Item
          label={t.scoreLabel}
          value={
            <span className="text-amber-200">
              {score.toLocaleString()} {t.ptsSuffix}
            </span>
          }
        />
        <StatsGrid.Item
          label={t.gemsLabel}
          value={
            <span className="text-emerald-300">
              {gems} / {totalGems}
            </span>
          }
        />
        <StatsGrid.Item label={t.jumpsLabel} value={jumps} size="base" />
        <StatsGrid.Item label={t.timeLabel} value={formatTime(totalTime)} size="base" />
      </StatsGrid>

      <button onClick={onRestart} className={BTN_PRIMARY}>
        <RotateCcw className="h-5 w-5" /> {t.restartGame}
      </button>
      <button onClick={onBackToMenu} className={BTN_SECONDARY_FULL}>
        <Home className="h-4 w-4" /> {t.backToMenuCaps}
      </button>
    </Modal>
  );
};
