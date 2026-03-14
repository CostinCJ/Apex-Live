import { useWorkoutStore, workoutInitialState } from '../workoutStore';
import type { WorkoutPlan, SetRecord } from '@/types/workout';

const mockPlan: WorkoutPlan = {
  id: 'plan_1',
  name: 'Upper Body',
  type: 'push',
  estimatedDurationMinutes: 45,
  exercises: [
    { id: 'ex_1', name: 'Bench Press', targetSets: 4, targetReps: 8, targetWeight: 135, restSeconds: 90 },
    { id: 'ex_2', name: 'Overhead Press', targetSets: 3, targetReps: 10, restSeconds: 60 },
    { id: 'ex_3', name: 'Barbell Row', targetSets: 4, targetReps: 8, targetWeight: 115, restSeconds: 90 },
  ],
};

const makeSet = (overrides: Partial<SetRecord> = {}): SetRecord => ({
  setNumber: 1,
  reps: 8,
  weight: 135,
  completedAt: Date.now(),
  ...overrides,
});

function resetStore() {
  useWorkoutStore.setState(workoutInitialState);
}

describe('workoutStore', () => {
  beforeEach(resetStore);

  describe('startWorkout', () => {
    it('sets status to active and populates exercises from plan', () => {
      useWorkoutStore.getState().startWorkout(mockPlan);
      const s = useWorkoutStore.getState();
      expect(s.status).toBe('active');
      expect(s.workoutType).toBe('push');
      expect(s.exercises).toHaveLength(3);
      expect(s.currentExerciseIndex).toBe(0);
      expect(s.startedAt).toBeGreaterThan(0);
    });

    it('generates a workout id', () => {
      useWorkoutStore.getState().startWorkout(mockPlan);
      expect(useWorkoutStore.getState().workoutId).toMatch(/^workout_\d+$/);
    });
  });

  describe('pauseWorkout / resumeWorkout', () => {
    beforeEach(() => useWorkoutStore.getState().startWorkout(mockPlan));

    it('toggles between active and paused', () => {
      useWorkoutStore.getState().pauseWorkout();
      expect(useWorkoutStore.getState().status).toBe('paused');
      useWorkoutStore.getState().resumeWorkout();
      expect(useWorkoutStore.getState().status).toBe('active');
    });
  });

  describe('completeSet', () => {
    beforeEach(() => useWorkoutStore.getState().startWorkout(mockPlan));

    it('adds a set to the current exercise', () => {
      useWorkoutStore.getState().completeSet(makeSet());
      const ex = useWorkoutStore.getState().exercises[0];
      expect(ex?.sets).toHaveLength(1);
    });

    it('accumulates multiple sets', () => {
      useWorkoutStore.getState().completeSet(makeSet({ setNumber: 1 }));
      useWorkoutStore.getState().completeSet(makeSet({ setNumber: 2 }));
      expect(useWorkoutStore.getState().exercises[0]?.sets).toHaveLength(2);
    });

    it('is a no-op when no exercises', () => {
      resetStore();
      useWorkoutStore.getState().completeSet(makeSet());
      expect(useWorkoutStore.getState().exercises).toHaveLength(0);
    });
  });

  describe('nextExercise / previousExercise', () => {
    beforeEach(() => useWorkoutStore.getState().startWorkout(mockPlan));

    it('advances index and sets completedAt', () => {
      useWorkoutStore.getState().nextExercise();
      expect(useWorkoutStore.getState().currentExerciseIndex).toBe(1);
      expect(useWorkoutStore.getState().exercises[0]?.completedAt).toBeGreaterThan(0);
    });

    it('clamps at last exercise', () => {
      useWorkoutStore.getState().nextExercise();
      useWorkoutStore.getState().nextExercise();
      useWorkoutStore.getState().nextExercise();
      expect(useWorkoutStore.getState().currentExerciseIndex).toBe(2);
    });

    it('goes back and clamps at 0', () => {
      useWorkoutStore.getState().nextExercise();
      useWorkoutStore.getState().previousExercise();
      expect(useWorkoutStore.getState().currentExerciseIndex).toBe(0);
      useWorkoutStore.getState().previousExercise();
      expect(useWorkoutStore.getState().currentExerciseIndex).toBe(0);
    });
  });

  describe('completeWorkout', () => {
    it('sets status to completed', () => {
      useWorkoutStore.getState().startWorkout(mockPlan);
      useWorkoutStore.getState().completeWorkout();
      expect(useWorkoutStore.getState().status).toBe('completed');
    });
  });

  describe('abandonWorkout', () => {
    it('sets status to abandoned', () => {
      useWorkoutStore.getState().startWorkout(mockPlan);
      useWorkoutStore.getState().abandonWorkout();
      expect(useWorkoutStore.getState().status).toBe('abandoned');
    });
  });

  describe('reset', () => {
    it('restores to initial state', () => {
      useWorkoutStore.getState().startWorkout(mockPlan);
      useWorkoutStore.getState().reset();
      const s = useWorkoutStore.getState();
      expect(s.status).toBe('idle');
      expect(s.workoutId).toBeNull();
      expect(s.exercises).toEqual([]);
    });
  });

  describe('getCurrentExercise', () => {
    it('returns null when idle', () => {
      expect(useWorkoutStore.getState().getCurrentExercise()).toBeNull();
    });

    it('returns current exercise', () => {
      useWorkoutStore.getState().startWorkout(mockPlan);
      expect(useWorkoutStore.getState().getCurrentExercise()?.exerciseName).toBe('Bench Press');
      useWorkoutStore.getState().nextExercise();
      expect(useWorkoutStore.getState().getCurrentExercise()?.exerciseName).toBe('Overhead Press');
    });
  });

  describe('hasRecoverableWorkout', () => {
    it('false for idle', () => expect(useWorkoutStore.getState().hasRecoverableWorkout()).toBe(false));

    it('true for active', () => {
      useWorkoutStore.getState().startWorkout(mockPlan);
      expect(useWorkoutStore.getState().hasRecoverableWorkout()).toBe(true);
    });

    it('true for paused', () => {
      useWorkoutStore.getState().startWorkout(mockPlan);
      useWorkoutStore.getState().pauseWorkout();
      expect(useWorkoutStore.getState().hasRecoverableWorkout()).toBe(true);
    });

    it('false for completed', () => {
      useWorkoutStore.getState().startWorkout(mockPlan);
      useWorkoutStore.getState().completeWorkout();
      expect(useWorkoutStore.getState().hasRecoverableWorkout()).toBe(false);
    });
  });

  describe('pause duration tracking', () => {
    beforeEach(() => useWorkoutStore.getState().startWorkout(mockPlan));

    it('tracks pausedAt when pausing', () => {
      useWorkoutStore.getState().pauseWorkout();
      expect(useWorkoutStore.getState().pausedAt).toBeGreaterThan(0);
    });

    it('accumulates totalPausedMs on resume', () => {
      const beforePause = Date.now();
      useWorkoutStore.getState().pauseWorkout();
      // Simulate a short pause
      const state = useWorkoutStore.getState();
      expect(state.pausedAt).toBeGreaterThanOrEqual(beforePause);
      useWorkoutStore.getState().resumeWorkout();
      expect(useWorkoutStore.getState().pausedAt).toBeNull();
      expect(useWorkoutStore.getState().totalPausedMs).toBeGreaterThanOrEqual(0);
    });

    it('ignores pause when not active', () => {
      useWorkoutStore.getState().pauseWorkout();
      const pausedAt = useWorkoutStore.getState().pausedAt;
      useWorkoutStore.getState().pauseWorkout(); // double pause
      expect(useWorkoutStore.getState().pausedAt).toBe(pausedAt); // unchanged
    });

    it('ignores resume when not paused', () => {
      useWorkoutStore.getState().resumeWorkout(); // already active
      expect(useWorkoutStore.getState().status).toBe('active');
      expect(useWorkoutStore.getState().totalPausedMs).toBe(0);
    });
  });

  describe('getElapsedMs', () => {
    it('returns 0 when idle', () => {
      expect(useWorkoutStore.getState().getElapsedMs()).toBe(0);
    });

    it('returns elapsed time during active workout', () => {
      useWorkoutStore.getState().startWorkout(mockPlan);
      const elapsed = useWorkoutStore.getState().getElapsedMs();
      expect(elapsed).toBeGreaterThanOrEqual(0);
    });
  });

  describe('setNotes', () => {
    it('updates notes', () => {
      useWorkoutStore.getState().setNotes('Great session');
      expect(useWorkoutStore.getState().notes).toBe('Great session');
    });
  });
});
