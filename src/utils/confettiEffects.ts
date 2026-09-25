import confetti from "canvas-confetti";

/**
 * Fire a burst of confetti with side-shots after a short delay.
 * Returns a cleanup function to cancel scheduled bursts.
 */
export const fireVictoryConfetti = (): (() => void) => {
  confetti({ particleCount: 120, spread: 70, origin: { y: 0.6 } });
  const timer = setTimeout(() => {
    confetti({ particleCount: 80, angle: 60, spread: 55, origin: { x: 0 } });
    confetti({ particleCount: 80, angle: 120, spread: 55, origin: { x: 1 } });
  }, 400);
  return () => clearTimeout(timer);
};

/**
 * Bigger celebratory burst for game completion (final screen).
 * Returns a cleanup function to cancel scheduled bursts.
 */
export const fireCompletionConfetti = (): (() => void) => {
  confetti({ particleCount: 160, spread: 100, origin: { y: 0.6 } });
  const timers = [
    setTimeout(() => confetti({ particleCount: 100, angle: 60, spread: 60, origin: { x: 0 } }), 300),
    setTimeout(() => confetti({ particleCount: 100, angle: 120, spread: 60, origin: { x: 1 } }), 500),
  ];
  return () => timers.forEach(clearTimeout);
};
