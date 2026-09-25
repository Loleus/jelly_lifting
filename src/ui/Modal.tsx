import React from "react";
import { MODAL_BACKDROP, MODAL_BACKDROP_LIGHT } from "./styles";

interface ModalProps {
  children: React.ReactNode;
  /** Extra classes applied to the panel (inner card). */
  panelClassName: string;
  /** Animation preset for the backdrop. Defaults to zoom-in. */
  animation?: "zoom" | "fade";
  /** Use a lighter backdrop (help modal). */
  light?: boolean;
}

/**
 * Full-screen dark backdrop with a centered card panel.
 * Used by Victory / GameOver / GameComplete / Help / Settings modals.
 */
export const Modal: React.FC<ModalProps> = ({
  children,
  panelClassName,
  animation = "zoom",
  light = false,
}) => {
  const backdrop = light ? MODAL_BACKDROP_LIGHT : MODAL_BACKDROP;
  const anim =
    animation === "zoom"
      ? "animate-in zoom-in-95 duration-200"
      : "animate-in fade-in duration-200";
  return (
    <div className={`${backdrop} ${anim}`}>
      <div className={panelClassName}>{children}</div>
    </div>
  );
};
