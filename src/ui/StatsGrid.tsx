import React from "react";

interface StatItemProps {
  label: string;
  /** Colored value (e.g. amber for score, emerald for gems). */
  value: React.ReactNode;
  /** Size of the value line. Defaults to "lg". */
  size?: "lg" | "base";
}

const StatItem: React.FC<StatItemProps> = ({ label, value, size = "lg" }) => (
  <div className="p-1">
    <span className="text-sm tracking-wide text-sky-200/70">{label}</span>
    <div className={size === "lg" ? "text-xl" : "text-base text-sky-200"}>
      {value}
    </div>
  </div>
);

interface StatsGridProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * 2-column grid of stats — reused by Victory/GameComplete modals.
 * Use StatsGrid.Item for individual cells.
 */
export const StatsGrid: React.FC<StatsGridProps> & {
  Item: React.FC<StatItemProps>;
} = ({ children, className = "" }) => (
  <div
    className={`grid grid-cols-2 gap-2 rounded-2xl bg-sky-900/40 p-3 text-left text-sm ${className}`}
  >
    {children}
  </div>
);

StatsGrid.Item = StatItem;
