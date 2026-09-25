import React from "react";
import { ArrowRight, Diamond, Home, Lock, RotateCcw, ShieldAlert, Sparkles, Trophy } from "lucide-react";
import type { Translation } from "../i18n";
import { Modal } from "../ui/Modal";
import { StatsGrid } from "../ui/StatsGrid";
import { formatTime } from "../utils/formatTime";
import {
  BTN_PRIMARY,
  BTN_SECONDARY,
  BTN_SECONDARY_FULL,
  MODAL_PANEL,
  MODAL_PANEL_DANGER,
} from "../ui/styles";

interface VictoryModalProps {
  t: Translation;
  score: number;
  gems: number;
  totalGems: number;
  jumps: number;
  timeSec: number;
  towerHeight: number;
  levelNumber: number;
  totalLevels: number;
  onRestart: () => void;
  onBackToMenu?: () => void;
  onNextLevel?: () => void;
}

export const VictoryModal: React.FC<VictoryModalProps> = ({
  t,
  score,
  gems,
  totalGems,
  jumps,
  timeSec,
  towerHeight,
  levelNumber,
  totalLevels,
  onRestart,
  onBackToMenu,
  onNextLevel,
}) => {
  const allGemsCollected = gems >= totalGems;
  const canAdvance = allGemsCollected && levelNumber < totalLevels && !!onNextLevel;

  // Konfetti usuniete calkowicie: canvas-confetti dokladalo wlasny <canvas>
  // na cale okno i animowalo setki czastek na wlasnym rAF, co zamulalo ekran
  // gratulacyjny (i dokladalo kolejny kontekst do przemalowywania).

  return (
    <Modal panelClassName={MODAL_PANEL}>
      {/* Icon: trophy (cleared) or shield (not cleared) */}
      <div
        className={`mx-auto flex h-16 w-16 items-center justify-center rounded-full shadow-lg ${
          allGemsCollected ? "bg-amber-400 text-[#052e1a]" : "bg-orange-400 text-[#052e1a]"
        }`}
      >
        {allGemsCollected ? (
          <Trophy className="h-9 w-9 animate-bounce" />
        ) : (
          <ShieldAlert className="h-9 w-9" />
        )}
      </div>

      {allGemsCollected ? (
        <>
          <h2 className="mt-3 text-2xl tracking-wide text-amber-200">
            {t.clearedTitle(levelNumber)}
          </h2>
          <p className="mt-1 text-sm tracking-wide text-sky-200">{t.clearedDesc(towerHeight)}</p>
        </>
      ) : (
        <>
          <h2 className="mt-3 text-2xl tracking-wide text-orange-300">
            {t.doneTitle(levelNumber)}
          </h2>
          <p className="mt-1 text-base tracking-wide text-orange-200/90">{t.doneBut}</p>
          <div className="mt-2 flex items-center justify-center gap-2 text-lg tracking-wide text-amber-200">
            <Diamond className="h-5 w-5 fill-amber-300" />
            {t.gemsHint(gems, totalGems)}
          </div>
        </>
      )}

      <StatsGrid className="my-4">
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
            <span className={allGemsCollected ? "text-emerald-300" : "text-orange-300"}>
              {gems} / {totalGems}
            </span>
          }
        />
        <StatsGrid.Item label={t.jumpsLabel} value={jumps} size="base" />
        <StatsGrid.Item
          label={t.timeLabel}
          value={`${formatTime(timeSec)} ${t.secondsSuffix}`}
          size="base"
        />
      </StatsGrid>

      {levelNumber < totalLevels && onNextLevel ? (
        <>
          <button
            onClick={canAdvance ? onNextLevel : undefined}
            disabled={!canAdvance}
            className={`flex w-full items-center justify-center gap-2 rounded-xl py-3 text-2sm tracking-wide shadow-lg transition-all ${
              canAdvance
                ? "bg-emerald-400 text-[#000] hover:bg-emerald-300"
                : "bg-sky-900/30 text-white/30 cursor-not-allowed"
            }`}
          >
            {canAdvance ? <ArrowRight className="h-5 w-5" /> : <Lock className="h-5 w-5" />}
            {t.nextLevel(levelNumber + 1)}
          </button>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <button onClick={onRestart} className={BTN_SECONDARY}>
              <RotateCcw className="h-4 w-4" /> {t.restart}
            </button>
            {onBackToMenu && (
              <button onClick={onBackToMenu} className={BTN_SECONDARY}>
                <Home className="h-4 w-4" /> {t.menu}
              </button>
            )}
          </div>
        </>
      ) : (
        <button onClick={onRestart} className={BTN_PRIMARY}>
          <Sparkles className="h-5 w-5" /> {t.playAgain}
        </button>
      )}
    </Modal>
  );
};

interface GameOverModalProps {
  t: Translation;
  score: number;
  level: number;
  towerHeight: number;
  onRestart: () => void;
  onBackToMenu?: () => void;
}

export const GameOverModal: React.FC<GameOverModalProps> = ({
  t,
  score,
  level,
  towerHeight,
  onRestart,
  onBackToMenu,
}) => {
  return (
    <Modal panelClassName={MODAL_PANEL_DANGER} animation="fade">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-rose-700 text-white shadow-lg">
        <ShieldAlert className="h-8 w-8" />
      </div>
      <h2 className="mt-3 text-2xl tracking-wide text-rose-700">{t.gameOver}</h2>
      <p className="mt-1 text-2sm tracking-wide text-sky-200">{t.gameOverDesc}</p>
      <div className="my-4 rounded-2xl bg-sky-900/40 p-3 text-2sm space-y-1">
        <div className="flex justify-between">
          <span className="tracking-wide text-sky-200/70">{t.floorLabel}</span>
          <span className="tracking-wide text-sky-100">
            {level} / {towerHeight}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="tracking-wide text-sky-200/70">{t.pointsLabel}</span>
          <span className="tracking-wide text-amber-200">{score}</span>
        </div>
      </div>
      <button
        onClick={onRestart}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-green-500 py-3 text-base tracking-wide text-white shadow-lg hover:bg-green-400"
      >
        <RotateCcw className="h-5 w-5" /> {t.tryAgain}
      </button>
      {onBackToMenu && (
        <button onClick={onBackToMenu} className={BTN_SECONDARY_FULL}>
          {t.backToMenu}
        </button>
      )}
    </Modal>
  );
};
