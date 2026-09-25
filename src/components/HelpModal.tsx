import { Zap } from "lucide-react";
import type { Translation } from "../i18n";
import { Modal } from "../ui/Modal";
import { MODAL_PANEL_HELP } from "../ui/styles";

interface HelpModalProps {
  t: Translation;
  towerHeight: number;
  totalLevels: number;
  onClose: () => void;
}

export const HelpModal: React.FC<HelpModalProps> = ({ t, towerHeight, totalLevels, onClose }) => {
  const elements = [
    t.elElevators,
    t.elSprings,
    t.elGems,
    t.elCheckpoints,
    t.elDoors,
    t.elTimer,
    t.elCollapsing,
    t.elLevers,
    t.elBalls,
  ];
  const controls = [t.ctrlMove, t.ctrlJump, t.ctrlInteract, t.ctrlRestart];

  return (
    <Modal panelClassName={MODAL_PANEL_HELP} animation="fade" light>
      <div className="flex items-center gap-2 text-amber-200 pb-2">
        <Zap className="drop-shadow-lg/50 h-6 w-6" />
        <h3 className="text-2xl text-shadow-lg/30 tracking-wide">{t.helpTitle}</h3>
      </div>
      <div className="space-y-2 tracking-wide text-green-100">
        <p className="text-2sm leading-relaxed">{t.helpIntro(towerHeight, totalLevels)}</p>
        <div className="rounded-2xl bg-sky-900/40 p-4 space-y-2">
          <div className="font-bold text-amber-200 tracking-wide">{t.elementsTitle}</div>
          <div className="grid grid-cols-2 gap-x-3 gap-y-2 text-sm">
            {elements.map((el, i) => (
              <div key={i}>
                <strong>{el}</strong>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-2xl bg-sky-900/40 p-4">
          <div className="font-bold text-amber-200 tracking-wide mb-1">{t.controlsTitle}</div>
          <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-sm text-sky-100/90">
            {controls.map((c, i) => (
              <div key={i}>{c}</div>
            ))}
          </div>
        </div>
      </div>
      <button
        onClick={onClose}
        className="font-case mt-5 w-full rounded-xl bg-emerald-300 py-2.5 text-2sm tracking-wide text-green-900 shadow-lg hover:bg-emerald-400 active:scale-95"
      >
        {t.understand}
      </button>
    </Modal>
  );
};
