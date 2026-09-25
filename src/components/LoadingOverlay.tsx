import { Diamond } from "lucide-react";
import type { Translation } from "../i18n";

interface LoadingOverlayProps {
  t: Translation;
  visible: boolean;
  levelNumber: number;
  gemsCount: number;
}

export const LoadingOverlay: React.FC<LoadingOverlayProps> = ({ t, visible, levelNumber, gemsCount }) => {
  return (
    <div className={`font-freckle fixed inset-0 z-[60] flex items-center justify-center bg-gradient-to-b from-[#0e4a6e] to-[#052e1a] transition-opacity duration-300 ${visible ? "opacity-100" : "opacity-0 pointer-events-none"}`}>
      <div className="text-center animate-in zoom-in-95 duration-300">
        <h3 className="text-xl tracking-[0.2em] text-[#7fd4e6] mb-6 drop-shadow-[0_2px_8px_rgba(0,0,0,0.7)]">{t.loadingTower(levelNumber)}</h3>
        <Diamond className="mx-auto h-16 w-16 text-[#d9f99d] animate-spin mb-4 drop-shadow-[0_0_20px_rgba(217,249,157,0.5)] [animation-duration:2.5s] [animation-timing-function:ease-in-out]" />
        <h2 className="text-4xl tracking-wide text-[#d9f99d] drop-shadow-[0_3px_12px_rgba(0,0,0,0.9)]">
          {t.loadingGems(gemsCount)}
        </h2>
        <p className="mt-3 text-sm tracking-[0.15em] text-[#a8c8ea]/60">{t.loadingText}</p>
      </div>
    </div>
  );
};
