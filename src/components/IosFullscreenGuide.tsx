import { Share2, Smartphone, X } from "lucide-react";
import type { Translation } from "../i18n";

interface IosFullscreenGuideProps {
  t: Translation;
  onClose: () => void;
}

export const IosFullscreenGuide: React.FC<IosFullscreenGuideProps> = ({ t, onClose }) => {
  return (
    <div className="fixed inset-x-0 bottom-0 z-[70] flex justify-center bg-black/80 backdrop-blur-md sm:inset-0 sm:items-center">
      <div className="relative w-full max-w-md rounded-t-3xl bg-gradient-to-b from-[#0e4a6e] to-[#052e1a] p-5 pb-10 font-freckle text-sky-100 shadow-2xl sm:rounded-3xl sm:pb-6">
        <div className="pointer-events-none absolute -bottom-1 left-1/2 -translate-x-1/2 flex flex-col items-center gap-0.5 text-[#86efac] animate-bounce sm:hidden">
          <div className="h-7 w-0.5 rounded-full bg-[#86efac]/70" />
          <svg width="20" height="11" viewBox="0 0 20 11" fill="currentColor" aria-hidden="true">
            <path d="M10 11 L0 0 L20 0 Z" />
          </svg>
        </div>

        <button onClick={onClose} className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-black/30 text-sky-100" aria-label={t.close}>
          <X className="h-5 w-5" />
        </button>

        <div className="flex items-center gap-3 pr-10">
          <Smartphone className="h-7 w-7 text-[#86efac]" />
          <h2 className="text-2xl text-[#86efac]">{t.iosTitle}</h2>
        </div>

        <p className="mt-3 text-sm leading-relaxed text-sky-100/80">
          {t.iosDesc}
        </p>

        <div className="mt-4 space-y-2">
          <div className="flex items-center gap-3 rounded-xl bg-sky-950/50 px-3 py-2.5">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#86efac] text-sm font-bold text-[#052e1a]">1</span>
            <span className="text-sm leading-snug">
              {t.iosStep1a}{" "}
              <span className="inline-flex items-center gap-0.5 rounded-md bg-sky-900/60 px-1.5 py-0.5 text-[#86efac]">
                <Share2 className="h-3.5 w-3.5" /> {t.iosShare}
              </span>{" "}
              {t.iosStep1b}
            </span>
          </div>
          <div className="flex items-center gap-3 rounded-xl bg-sky-950/50 px-3 py-2.5">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#86efac] text-sm font-bold text-[#052e1a]">2</span>
            <span className="text-sm leading-snug">
              {t.iosStep2a}{" "}
              <span className="rounded-md bg-sky-900/60 px-1.5 py-0.5 text-amber-200">{t.iosAddToHome}</span>.
            </span>
          </div>
          <div className="flex items-center gap-3 rounded-xl bg-sky-950/50 px-3 py-2.5">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#86efac] text-sm font-bold text-[#052e1a]">3</span>
            <span className="text-sm leading-snug">
              {t.iosStep3a}{" "}
              <span className="rounded-md bg-sky-900/60 px-1.5 py-0.5 text-[#86efac]">{t.appName}</span>{" "}
              {t.iosStep3b}
            </span>
          </div>
        </div>

        <p className="mt-2 text-xs text-[#a8c8ea]/60">{t.iosFirefox}</p>

        <button onClick={onClose} className="mt-4 flex w-full items-center justify-center rounded-full bg-[#86efac] py-3 text-lg text-[#052e1a] shadow-lg active:scale-95">
          OK
        </button>
      </div>
    </div>
  );
};
