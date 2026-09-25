import React from "react";
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp } from "lucide-react";
import type { Translation } from "../i18n";

interface TouchControlsProps {
  t: Translation;
  onMoveLeft: (pressed: boolean) => void;
  onMoveRight: (pressed: boolean) => void;
  onJump: (pressed: boolean) => void;
  onDoor: () => void;
}

/** A hold-to-press button (fires callback on press / release). */
const HoldButton: React.FC<{
  onChange: (pressed: boolean) => void;
  className: string;
  ariaLabel: string;
  children: React.ReactNode;
}> = ({ onChange, className, ariaLabel, children }) => (
  <button
    onTouchStart={(e) => {
      e.preventDefault();
      onChange(true);
    }}
    onTouchEnd={(e) => {
      e.preventDefault();
      onChange(false);
    }}
    onMouseDown={() => onChange(true)}
    onMouseUp={() => onChange(false)}
    className={className}
    aria-label={ariaLabel}
  >
    {children}
  </button>
);

/** A tap-to-fire button (single click / touch). */
const TapButton: React.FC<{
  onTap: () => void;
  className: string;
  ariaLabel: string;
  children: React.ReactNode;
}> = ({ onTap, className, ariaLabel, children }) => (
  <button
    onTouchStart={(e) => {
      e.preventDefault();
      onTap();
    }}
    onClick={onTap}
    className={className}
    aria-label={ariaLabel}
  >
    {children}
  </button>
);

const DPAD_BTN =
  "flex h-14 w-14 items-center justify-center rounded-2xl border-2 border-white/20 bg-slate-900/80 text-white shadow-xl backdrop-blur-md active:scale-95 active:bg-cyan-600/80";
const DOOR_BTN =
  "flex h-14 w-14 items-center justify-center rounded-2xl border-2 border-cyan-400/40 bg-cyan-700/80 text-white shadow-xl backdrop-blur-md active:scale-95 active:bg-cyan-500";
const JUMP_BTN =
  "flex h-16 w-16 items-center justify-center rounded-full border-2 border-emerald-400/40 bg-emerald-600/80 text-white shadow-2xl backdrop-blur-md active:scale-95 active:bg-emerald-500";

export const TouchControls: React.FC<TouchControlsProps> = ({
  t,
  onMoveLeft,
  onMoveRight,
  onJump,
  onDoor,
}) => {
  return (
    <div className="touch-controls pointer-events-none fixed inset-x-0 bottom-6 z-30 flex items-center justify-between px-6 select-none [@media(pointer:fine)]:hidden">
      {/* Left / Right D-Pad */}
      <div className="pointer-events-auto flex items-center gap-3">
        <HoldButton onChange={onMoveLeft} className={DPAD_BTN} ariaLabel={t.touchLeft}>
          <ArrowLeft className="h-7 w-7" />
        </HoldButton>
        <HoldButton onChange={onMoveRight} className={DPAD_BTN} ariaLabel={t.touchRight}>
          <ArrowRight className="h-7 w-7" />
        </HoldButton>
      </div>

      {/* Door + Jump */}
      <div className="pointer-events-auto flex items-center gap-3">
        <TapButton onTap={onDoor} className={DOOR_BTN} ariaLabel={t.touchDoor}>
          <ArrowDown className="h-7 w-7" />
        </TapButton>
        <HoldButton onChange={onJump} className={JUMP_BTN} ariaLabel={t.touchJump}>
          <ArrowUp className="h-8 w-8" />
        </HoldButton>
      </div>
    </div>
  );
};
