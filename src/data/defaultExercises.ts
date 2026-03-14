import type { WorkoutType, WorkoutPlan, PlannedExercise } from '@/types/workout';

function exercise(
  id: string,
  name: string,
  targetSets: number,
  opts: Partial<Pick<PlannedExercise, 'targetReps' | 'targetDurationSeconds' | 'targetWeight' | 'restSeconds'>> = {},
): PlannedExercise {
  return {
    id,
    name,
    targetSets,
    targetReps: opts.targetReps,
    targetDurationSeconds: opts.targetDurationSeconds,
    targetWeight: opts.targetWeight,
    restSeconds: opts.restSeconds ?? 90,
  };
}

function plan(
  type: WorkoutType,
  name: string,
  exercises: PlannedExercise[],
  estimatedDurationMinutes: number,
): WorkoutPlan {
  return {
    id: `default_${type}`,
    name,
    type,
    exercises,
    estimatedDurationMinutes,
  };
}

const DEFAULT_PLANS: Record<WorkoutType, WorkoutPlan> = {
  push: plan('push', 'Push Day', [
    exercise('push_1', 'Bench Press', 4, { targetReps: 8, restSeconds: 90 }),
    exercise('push_2', 'Overhead Press', 3, { targetReps: 10, restSeconds: 90 }),
    exercise('push_3', 'Incline DB Press', 3, { targetReps: 10, restSeconds: 75 }),
    exercise('push_4', 'Tricep Pushdown', 3, { targetReps: 12, restSeconds: 60 }),
    exercise('push_5', 'Lateral Raises', 3, { targetReps: 15, restSeconds: 60 }),
  ], 50),

  pull: plan('pull', 'Pull Day', [
    exercise('pull_1', 'Barbell Row', 4, { targetReps: 8, restSeconds: 90 }),
    exercise('pull_2', 'Pull-ups', 3, { targetReps: 8, restSeconds: 90 }),
    exercise('pull_3', 'Face Pulls', 3, { targetReps: 15, restSeconds: 60 }),
    exercise('pull_4', 'Bicep Curls', 3, { targetReps: 12, restSeconds: 60 }),
    exercise('pull_5', 'Lat Pulldown', 3, { targetReps: 10, restSeconds: 75 }),
  ], 50),

  legs: plan('legs', 'Leg Day', [
    exercise('legs_1', 'Squats', 4, { targetReps: 8, restSeconds: 120 }),
    exercise('legs_2', 'Romanian Deadlift', 3, { targetReps: 10, restSeconds: 90 }),
    exercise('legs_3', 'Leg Press', 3, { targetReps: 12, restSeconds: 90 }),
    exercise('legs_4', 'Walking Lunges', 3, { targetReps: 12, restSeconds: 75 }),
    exercise('legs_5', 'Calf Raises', 3, { targetReps: 15, restSeconds: 60 }),
  ], 55),

  upper: plan('upper', 'Upper Body', [
    exercise('upper_1', 'Bench Press', 3, { targetReps: 10, restSeconds: 90 }),
    exercise('upper_2', 'Barbell Row', 3, { targetReps: 10, restSeconds: 90 }),
    exercise('upper_3', 'Overhead Press', 3, { targetReps: 10, restSeconds: 90 }),
    exercise('upper_4', 'Pull-ups', 3, { targetReps: 8, restSeconds: 90 }),
    exercise('upper_5', 'Lateral Raises', 3, { targetReps: 12, restSeconds: 60 }),
  ], 45),

  lower: plan('lower', 'Lower Body', [
    exercise('lower_1', 'Squats', 3, { targetReps: 10, restSeconds: 120 }),
    exercise('lower_2', 'Romanian Deadlift', 3, { targetReps: 10, restSeconds: 90 }),
    exercise('lower_3', 'Leg Press', 3, { targetReps: 12, restSeconds: 90 }),
    exercise('lower_4', 'Lunges', 3, { targetReps: 12, restSeconds: 75 }),
    exercise('lower_5', 'Leg Curls', 3, { targetReps: 12, restSeconds: 60 }),
  ], 50),

  full_body: plan('full_body', 'Full Body', [
    exercise('fb_1', 'Squats', 3, { targetReps: 8, restSeconds: 120 }),
    exercise('fb_2', 'Bench Press', 3, { targetReps: 8, restSeconds: 90 }),
    exercise('fb_3', 'Barbell Row', 3, { targetReps: 8, restSeconds: 90 }),
    exercise('fb_4', 'Overhead Press', 3, { targetReps: 8, restSeconds: 90 }),
    exercise('fb_5', 'Deadlift', 3, { targetReps: 5, restSeconds: 120 }),
  ], 55),

  hiit: plan('hiit', 'HIIT Circuit', [
    exercise('hiit_1', 'Burpees', 4, { targetDurationSeconds: 30, restSeconds: 30 }),
    exercise('hiit_2', 'Mountain Climbers', 4, { targetDurationSeconds: 30, restSeconds: 30 }),
    exercise('hiit_3', 'Jump Squats', 4, { targetDurationSeconds: 30, restSeconds: 30 }),
    exercise('hiit_4', 'High Knees', 4, { targetDurationSeconds: 30, restSeconds: 30 }),
  ], 25),

  cardio_run: plan('cardio_run', 'Running', [
    exercise('run_1', 'Running', 1, { targetDurationSeconds: 1800, restSeconds: 0 }),
  ], 30),

  cardio_cycle: plan('cardio_cycle', 'Cycling', [
    exercise('cycle_1', 'Cycling', 1, { targetDurationSeconds: 1800, restSeconds: 0 }),
  ], 30),

  cardio_row: plan('cardio_row', 'Rowing', [
    exercise('row_1', 'Rowing', 1, { targetDurationSeconds: 1200, restSeconds: 0 }),
  ], 20),

  boxing: plan('boxing', 'Boxing Session', [
    exercise('box_1', 'Jab-Cross Combo', 4, { targetDurationSeconds: 60, restSeconds: 30 }),
    exercise('box_2', 'Hook Combo', 3, { targetDurationSeconds: 60, restSeconds: 30 }),
    exercise('box_3', 'Uppercut Combo', 3, { targetDurationSeconds: 60, restSeconds: 30 }),
    exercise('box_4', 'Speed Bag', 3, { targetDurationSeconds: 90, restSeconds: 30 }),
    exercise('box_5', 'Heavy Bag Rounds', 4, { targetDurationSeconds: 180, restSeconds: 60 }),
    exercise('box_6', 'Slip & Counter', 3, { targetDurationSeconds: 60, restSeconds: 30 }),
    exercise('box_7', 'Body Shots', 3, { targetDurationSeconds: 60, restSeconds: 30 }),
    exercise('box_8', 'Burnout Round', 1, { targetDurationSeconds: 120, restSeconds: 0 }),
  ], 40),

  mobility: plan('mobility', 'Mobility Work', [
    exercise('mob_1', 'Foam Rolling', 1, { targetDurationSeconds: 300, restSeconds: 0 }),
    exercise('mob_2', 'Hip Openers', 3, { targetDurationSeconds: 60, restSeconds: 15 }),
    exercise('mob_3', 'Shoulder Mobility', 3, { targetDurationSeconds: 60, restSeconds: 15 }),
    exercise('mob_4', 'Spine Mobility', 3, { targetDurationSeconds: 60, restSeconds: 15 }),
  ], 25),

  custom: plan('custom', 'Custom Workout', [
    exercise('custom_1', 'Exercise 1', 3, { targetReps: 10, restSeconds: 60 }),
  ], 30),
};

export function getQuickStartPlan(type: WorkoutType): WorkoutPlan {
  return DEFAULT_PLANS[type];
}
