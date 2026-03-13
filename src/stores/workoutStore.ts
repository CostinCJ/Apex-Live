import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import type {
  WorkoutType,
  WorkoutStatus,
  ExerciseRecord,
  SetRecord,
  WorkoutPlan,
} from '@/types/workout';

interface WorkoutState {
  status: WorkoutStatus;
  workoutId: string | null;
  workoutType: WorkoutType | null;
  planId: string | null;
  exercises: ExerciseRecord[];
  currentExerciseIndex: number;
  startedAt: number | null;
  notes: string;
}

interface WorkoutActions {
  startWorkout: (plan: WorkoutPlan) => void;
  pauseWorkout: () => void;
  resumeWorkout: () => void;
  completeSet: (set: SetRecord) => void;
  nextExercise: () => void;
  previousExercise: () => void;
  completeWorkout: () => void;
  abandonWorkout: () => void;
  setNotes: (notes: string) => void;
  reset: () => void;

  // Selectors
  getCurrentExercise: () => ExerciseRecord | null;
}

const initialState: WorkoutState = {
  status: 'idle',
  workoutId: null,
  workoutType: null,
  planId: null,
  exercises: [],
  currentExerciseIndex: 0,
  startedAt: null,
  notes: '',
};

export { initialState as workoutInitialState };

export const useWorkoutStore = create<WorkoutState & WorkoutActions>()(
  immer((set, get) => ({
    ...initialState,

    startWorkout: (plan) =>
      set((state) => {
        state.status = 'active';
        state.workoutId = `workout_${Date.now()}`;
        state.workoutType = plan.type;
        state.planId = plan.id;
        state.currentExerciseIndex = 0;
        state.startedAt = Date.now();
        state.exercises = plan.exercises.map((e) => ({
          exerciseId: e.id,
          exerciseName: e.name,
          sets: [],
          startedAt: Date.now(),
        }));
      }),

    pauseWorkout: () =>
      set((state) => {
        state.status = 'paused';
      }),

    resumeWorkout: () =>
      set((state) => {
        state.status = 'active';
      }),

    completeSet: (setRecord) =>
      set((state) => {
        const exercise = state.exercises[state.currentExerciseIndex];
        if (exercise) {
          exercise.sets.push(setRecord);
        }
      }),

    nextExercise: () =>
      set((state) => {
        const current = state.exercises[state.currentExerciseIndex];
        if (current) {
          current.completedAt = Date.now();
        }
        if (state.currentExerciseIndex < state.exercises.length - 1) {
          state.currentExerciseIndex += 1;
          const next = state.exercises[state.currentExerciseIndex];
          if (next) {
            (next as { startedAt: number }).startedAt = Date.now();
          }
        }
      }),

    previousExercise: () =>
      set((state) => {
        if (state.currentExerciseIndex > 0) {
          state.currentExerciseIndex -= 1;
        }
      }),

    completeWorkout: () =>
      set((state) => {
        state.status = 'completed';
        const current = state.exercises[state.currentExerciseIndex];
        if (current && !current.completedAt) {
          current.completedAt = Date.now();
        }
      }),

    abandonWorkout: () =>
      set((state) => {
        state.status = 'abandoned';
      }),

    setNotes: (notes) =>
      set((state) => {
        state.notes = notes;
      }),

    reset: () => set(initialState),

    getCurrentExercise: () => {
      const state = get();
      return state.exercises[state.currentExerciseIndex] ?? null;
    },
  })),
);
