import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'expo-router';
import { useWorkoutStore } from '@/stores/workoutStore';
import type { WorkoutType } from '@/types/workout';

interface RecoveryInfo {
  workoutId: string;
  workoutType: WorkoutType | null;
  startedAt: number;
  exerciseCount: number;
  elapsedMinutes: number;
}

/**
 * Checks for a recoverable workout on mount.
 * If found, exposes the recovery info and resume/discard actions.
 * Does NOT show a blocking modal — the caller renders a non-blocking banner.
 */
export function useCrashRecovery() {
  const [recoveryInfo, setRecoveryInfo] = useState<RecoveryInfo | null>(null);

  const hasRecoverableWorkout = useWorkoutStore((s) => s.hasRecoverableWorkout);
  const router = useRouter();

  useEffect(() => {
    // Check on mount — Zustand persist rehydrates from MMKV synchronously (or async for fallback)
    // Use a small delay to let rehydration complete
    const timer = setTimeout(() => {
      const state = useWorkoutStore.getState();
      if (state.hasRecoverableWorkout()) {
        setRecoveryInfo({
          workoutId: state.workoutId ?? '',
          workoutType: state.workoutType,
          startedAt: state.startedAt ?? 0,
          exerciseCount: state.exercises.length,
          elapsedMinutes: state.startedAt
            ? Math.floor((Date.now() - state.startedAt) / 60_000)
            : 0,
        });
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [hasRecoverableWorkout]);

  const resumeWorkout = useCallback(() => {
    if (!recoveryInfo) return;
    setRecoveryInfo(null);
    router.push(`/workout/${recoveryInfo.workoutId}`);
  }, [recoveryInfo, router]);

  const discardWorkout = useCallback(() => {
    useWorkoutStore.getState().reset();
    setRecoveryInfo(null);
  }, []);

  return {
    hasRecovery: recoveryInfo !== null,
    recoveryInfo,
    resumeWorkout,
    discardWorkout,
  };
}
