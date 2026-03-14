import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type {
  WorkoutType,
  WorkoutStatus,
  ExerciseRecord,
  SetRecord,
  WorkoutPlan,
} from '@/types/workout';

// Try MMKV for fast persistence, fall back to AsyncStorage (works in Expo Go)
let mmkvStorage: {
  getItem: (name: string) => string | null;
  setItem: (name: string, value: string) => void;
  removeItem: (name: string) => void;
};

try {
  const { createMMKV } = require('react-native-mmkv');
  const mmkv = createMMKV({ id: 'workout-store' });
  mmkvStorage = {
    getItem: (name: string) => mmkv.getString(name) ?? null,
    setItem: (name: string, value: string) => mmkv.set(name, value),
    removeItem: (name: string) => mmkv.remove(name),
  };
} catch {
  // Fallback for Expo Go (MMKV requires native module)
  // Zustand's createJSONStorage handles async getItem via duck-typing
  mmkvStorage = {
    getItem: (name: string) => {
      return AsyncStorage.getItem(name) as unknown as string | null;
    },
    setItem: (name: string, value: string) => { void AsyncStorage.setItem(name, value); },
    removeItem: (name: string) => { void AsyncStorage.removeItem(name); },
  };
}

interface WorkoutState {
  status: WorkoutStatus;
  workoutId: string | null;
  workoutType: WorkoutType | null;
  planId: string | null;
  exercises: ExerciseRecord[];
  currentExerciseIndex: number;
  startedAt: number | null;
  pausedAt: number | null;
  totalPausedMs: number;
  notes: string;
}

interface WorkoutActions {
  startWorkout: (plan: WorkoutPlan, serverWorkoutId?: string) => void;
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
  getElapsedMs: () => number;

  // Recovery
  hasRecoverableWorkout: () => boolean;
}

const initialState: WorkoutState = {
  status: 'idle',
  workoutId: null,
  workoutType: null,
  planId: null,
  exercises: [],
  currentExerciseIndex: 0,
  startedAt: null,
  pausedAt: null,
  totalPausedMs: 0,
  notes: '',
};

export { initialState as workoutInitialState };

export const useWorkoutStore = create<WorkoutState & WorkoutActions>()(
  persist(
    immer((set, get) => ({
      ...initialState,

      startWorkout: (plan, serverWorkoutId) =>
        set((state) => {
          state.status = 'active';
          state.workoutId = serverWorkoutId ?? `workout_${Date.now()}`;
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
          if (state.status !== 'active') return;
          state.status = 'paused';
          state.pausedAt = Date.now();
        }),

      resumeWorkout: () =>
        set((state) => {
          if (state.status !== 'paused') return;
          if (state.pausedAt) {
            state.totalPausedMs += Date.now() - state.pausedAt;
          }
          state.pausedAt = null;
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

      reset: () =>
        set((state) => {
          Object.assign(state, initialState);
        }),

      getCurrentExercise: () => {
        const state = get();
        return state.exercises[state.currentExerciseIndex] ?? null;
      },

      getElapsedMs: () => {
        const state = get();
        if (!state.startedAt) return 0;
        const now = state.pausedAt ?? Date.now();
        return now - state.startedAt - state.totalPausedMs;
      },

      hasRecoverableWorkout: () => {
        const state = get();
        return state.status === 'active' || state.status === 'paused';
      },
    })),
    {
      name: 'workout-state',
      storage: createJSONStorage(() => mmkvStorage),
      // Only persist workout-relevant fields, not transient UI state
      partialize: (state) => ({
        status: state.status,
        workoutId: state.workoutId,
        workoutType: state.workoutType,
        planId: state.planId,
        exercises: state.exercises,
        currentExerciseIndex: state.currentExerciseIndex,
        startedAt: state.startedAt,
        pausedAt: state.pausedAt,
        totalPausedMs: state.totalPausedMs,
        notes: state.notes,
      }),
    },
  ),
);
