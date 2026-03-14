import { useEffect, useCallback } from 'react';
import {
  useSharedValue,
  useDerivedValue,
  useAnimatedReaction,
  runOnJS,
  cancelAnimation,
} from 'react-native-reanimated';
import { useRealtimeStore } from '@/stores/realtimeStore';
import { triggerHaptic } from '@/utils/haptics';

/**
 * High-precision workout timer using Reanimated shared values.
 * Runs on the UI thread at 60fps for smooth display, while syncing
 * the integer seconds back to the Zustand store at 1Hz for data persistence.
 */
export function useAnimatedTimer() {
  const elapsedSV = useSharedValue(0);
  const isRunning = useSharedValue(false);
  const startTimestamp = useSharedValue(0);

  const setElapsedSeconds = useRealtimeStore((s) => s.setElapsedSeconds);

  // Sync integer seconds back to store (runs on JS thread at 1Hz)
  const syncToStore = useCallback(
    (seconds: number) => {
      setElapsedSeconds(seconds);
      // Haptic milestone every 5 minutes
      if (seconds > 0 && seconds % 300 === 0) {
        void triggerHaptic('timer_milestone');
      }
    },
    [setElapsedSeconds],
  );

  useAnimatedReaction(
    () => Math.floor(elapsedSV.value),
    (currentSecond, previousSecond) => {
      if (currentSecond !== previousSecond) {
        runOnJS(syncToStore)(currentSecond);
      }
    },
    [syncToStore],
  );

  // Derived display values (run on UI thread)
  const minutes = useDerivedValue(() => Math.floor(elapsedSV.value / 60));
  const seconds = useDerivedValue(() => Math.floor(elapsedSV.value) % 60);

  const displayMinutes = useDerivedValue(() =>
    String(minutes.value).padStart(2, '0'),
  );
  const displaySeconds = useDerivedValue(() =>
    String(seconds.value).padStart(2, '0'),
  );

  const start = useCallback(() => {
    'worklet';
    isRunning.value = true;
    startTimestamp.value = Date.now() / 1000 - elapsedSV.value;
    // eslint-disable-next-line react-hooks/exhaustive-deps -- shared values are stable refs
  }, []);

  const stop = useCallback(() => {
    'worklet';
    isRunning.value = false;
    cancelAnimation(elapsedSV);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- shared values are stable refs
  }, []);

  const reset = useCallback(() => {
    'worklet';
    isRunning.value = false;
    cancelAnimation(elapsedSV);
    elapsedSV.value = 0;
    // eslint-disable-next-line react-hooks/exhaustive-deps -- shared values are stable refs
  }, []);

  // Tick loop — caller controls start/stop via returned callbacks
  useEffect(() => {
    let frameId: ReturnType<typeof requestAnimationFrame>;
    let lastTime = Date.now();
    const baseElapsed = useRealtimeStore.getState().elapsedSeconds;
    elapsedSV.value = baseElapsed;

    const tick = () => {
      if (!isRunning.value) return;
      const now = Date.now();
      const delta = (now - lastTime) / 1000;
      lastTime = now;
      elapsedSV.value += delta;
      frameId = requestAnimationFrame(tick);
    };

    // Subscribe to isRunning changes to start/stop the loop
    const interval = setInterval(() => {
      if (isRunning.value && !frameId) {
        lastTime = Date.now();
        tick();
      }
    }, 100);

    return () => {
      isRunning.value = false;
      clearInterval(interval);
      if (frameId) cancelAnimationFrame(frameId);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- shared values are stable refs, runs once on mount
  }, []);

  return {
    /** Shared value with fractional seconds (UI thread) */
    elapsed: elapsedSV,
    /** Display-ready "MM" string */
    displayMinutes,
    /** Display-ready "SS" string */
    displaySeconds,
    start,
    stop,
    reset,
  };
}
