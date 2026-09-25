import { useEffect, useRef, useState } from "react";

interface UseLoadingOverlayReturn {
  /** > 0 when overlay should be mounted. Bumped by trigger(). */
  loadingKey: number;
  /** True while overlay is visible (before fade-out). */
  loadingVisible: boolean;
  /** How many gems the loading screen should announce. */
  loadingGemsCount: number;
  /** Show the overlay and record the start time (call synchronously via flushSync). */
  trigger: (gemsCount: number) => void;
}

/**
 * Manages the loading overlay lifecycle: display for min 1s, then fade out in 300ms.
 * The consumer must wrap trigger() in flushSync so the browser paints the overlay
 * before any heavy engine construction blocks the main thread.
 */
export const useLoadingOverlay = (): UseLoadingOverlayReturn => {
  const [loadingKey, setLoadingKey] = useState(0);
  const [loadingVisible, setLoadingVisible] = useState(false);
  const [loadingGemsCount, setLoadingGemsCount] = useState(0);
  const loadingStartRef = useRef(0);
  const loadingTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    if (loadingKey === 0) return;
    if (loadingTimerRef.current) {
      clearTimeout(loadingTimerRef.current);
      loadingTimerRef.current = undefined;
    }
    const elapsed = performance.now() - loadingStartRef.current;
    const remaining = Math.max(0, 1000 - elapsed);
    loadingTimerRef.current = setTimeout(() => {
      setLoadingVisible(false);
      loadingTimerRef.current = setTimeout(() => setLoadingKey(0), 300);
    }, remaining);
    return () => {
      if (loadingTimerRef.current) {
        clearTimeout(loadingTimerRef.current);
        loadingTimerRef.current = undefined;
      }
    };
  }, [loadingKey]);

  const trigger = (gemsCount: number) => {
    setLoadingGemsCount(gemsCount);
    loadingStartRef.current = performance.now();
    setLoadingKey((k) => k + 1);
    setLoadingVisible(true);
  };

  return { loadingKey, loadingVisible, loadingGemsCount, trigger };
};
