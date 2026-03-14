import { api } from '@/services/api/client';
import { useWorkoutStore } from '@/stores/workoutStore';
import { MetricsSyncService } from './metricsSync';
import type { WorkoutPlan } from '@/types/workout';

let metricsSyncService: MetricsSyncService | null = null;

export function getMetricsSyncService(): MetricsSyncService | null {
  return metricsSyncService;
}

/**
 * Creates a server-side workout record, starts the local store, and
 * initializes metrics sync. Returns the server UUID.
 */
export async function createAndStartWorkout(plan: WorkoutPlan): Promise<string> {
  const { data, error } = await api.post<{ data: { id: string } }>('/api/workouts', {
    workoutType: plan.type,
    title: plan.name,
  });

  if (error || !data?.data?.id) {
    throw new Error(error?.message ?? 'Failed to create workout');
  }

  const serverId = data.data.id;

  useWorkoutStore.getState().startWorkout(plan, serverId);

  // Start metrics sync
  metricsSyncService = new MetricsSyncService();
  metricsSyncService.start();

  return serverId;
}

/**
 * Snapshots workout state, marks it complete on the server, then resets.
 * Safe against the data race where reset wipes state before PATCH reads it.
 */
export async function endWorkout(): Promise<void> {
  const state = useWorkoutStore.getState();
  const snapshot = {
    workoutId: state.workoutId,
    exercises: state.exercises,
    elapsedMs: state.getElapsedMs(),
    notes: state.notes,
  };

  state.completeWorkout();

  // Flush metrics before resetting
  if (metricsSyncService) {
    await metricsSyncService.finalFlush();
    metricsSyncService = null;
  }

  // Build metrics summary for progressive overload tracking
  const totalSets = snapshot.exercises.reduce((sum, ex) => sum + ex.sets.length, 0);
  const totalReps = snapshot.exercises.reduce(
    (sum, ex) => sum + ex.sets.reduce((s, set) => s + (set.reps ?? 0), 0), 0,
  );
  const totalVolume = snapshot.exercises.reduce(
    (sum, ex) => sum + ex.sets.reduce((s, set) => s + (set.reps ?? 0) * (set.weight ?? 0), 0), 0,
  );
  const metricsSummary = {
    total_sets: totalSets,
    total_reps: totalReps,
    total_volume: totalVolume,
    exercises: snapshot.exercises.map((ex) => ({
      name: ex.exerciseName,
      sets: ex.sets.map((s) => ({ weight: s.weight, reps: s.reps, rpe: s.rpe })),
    })),
  };

  // Save to server using snapshotted data
  if (snapshot.workoutId) {
    await api.patch(`/api/workouts/${snapshot.workoutId}`, {
      status: 'completed',
      completedAt: new Date().toISOString(),
      durationSeconds: Math.floor(snapshot.elapsedMs / 1000),
      exercises: snapshot.exercises,
      metricsSummary,
      notes: snapshot.notes || undefined,
    }, { offlineQueue: true });
  }

  state.reset();
}

/**
 * Abandons a workout — marks it as abandoned on server and resets state.
 */
export async function abandonWorkout(): Promise<void> {
  const state = useWorkoutStore.getState();
  const workoutId = state.workoutId;

  state.abandonWorkout();

  if (metricsSyncService) {
    metricsSyncService.stop();
    metricsSyncService = null;
  }

  if (workoutId) {
    void api.patch(`/api/workouts/${workoutId}`, { status: 'abandoned' });
  }

  state.reset();
}
