// ============================================================================
//  USE RUN TIMER — stoper pojedynczego przejścia poziomu
// ============================================================================
//  OPTYMALIZACJA WYDAJNOŚCIOWA:
//  • Dokładny czas końcowy (ms) jest zamrażany przez stop() z `performance.now()`.
//  • Wyświetlany czas (displayTime) odświeża stan Reacta maksymalnie co 100 ms
//    (10 Hz) zamiast w każdej klatce rAF (co przy monitorach 144Hz/240Hz/360Hz
//    powodowało setki niepotrzebnych re-renderów całego komponentu App!).
// ============================================================================

import { useRef, useState } from "react";

interface RunTimerState {
  startedAt: number;
  finalTime: number;
  running: boolean;
}

export const useRunTimer = () => {
  const [displaySeconds, setDisplaySeconds] = useState(0);
  const timerRef = useRef<RunTimerState>({
    startedAt: 0,
    finalTime: 0,
    running: false,
  });
  const lastUpdateRef = useRef(0);

  const start = () => {
    timerRef.current.startedAt = performance.now();
    timerRef.current.running = true;
    timerRef.current.finalTime = 0;
    setDisplaySeconds(0);
    lastUpdateRef.current = performance.now();
  };

  /**
   * Wywoływany w pętli gry. Aktualizuje stan Reacta tylko co ~100 ms,
   * bo HUD formatuje czas jako `m:ss` (sekundy).
   */
  const tick = () => {
    if (!timerRef.current.running) return;
    const now = performance.now();
    if (now - lastUpdateRef.current < 100) return;
    lastUpdateRef.current = now;
    const seconds = (now - timerRef.current.startedAt) / 1000;
    // Zegar w HUD jest formatowany jako m:ss (całe sekundy — patrz formatTime),
    // więc aktualizacja stanu co 100 ms nie zmienia ANI JEDNEGO piksela, a
    // powoduje pełny re-render drzewa Reacta 10x na sekundę. Zwrócenie tej samej
    // wartości daje bail-out Reacta, a alokowane wtedy obiekty (fibery, tablice
    // hooków) są grafem cyklicznym — to one nakręcają cycle collector i major GC
    // (profil: reason CC_FINISHED, mark 23 ms przy 38 MB churnu).
    setDisplaySeconds((prev) => (Math.floor(prev) === Math.floor(seconds) ? prev : seconds));
  };

  /** Zatrzymuje stoper i zwraca dokładny czas (dokładność ms, bez zaokrąglenia). */
  const stop = (): number => {
    if (timerRef.current.running) {
      const final = (performance.now() - timerRef.current.startedAt) / 1000;
      timerRef.current.finalTime = final;
      timerRef.current.running = false;
      setDisplaySeconds(final);
      return final;
    }
    return timerRef.current.finalTime;
  };

  const reset = () => {
    timerRef.current = { startedAt: 0, finalTime: 0, running: false };
    setDisplaySeconds(0);
  };

  const displayTime = timerRef.current.running ? displaySeconds : timerRef.current.finalTime;

  return {
    displayTime,
    isRunning: () => timerRef.current.running,
    hasFinalTime: () => timerRef.current.finalTime !== 0,
    finalTime: () => timerRef.current.finalTime,
    start,
    tick,
    stop,
    reset,
  };
};
