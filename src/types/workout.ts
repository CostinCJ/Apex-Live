export type WorkoutType =
  | 'push'
  | 'pull'
  | 'legs'
  | 'upper'
  | 'lower'
  | 'full_body'
  | 'hiit'
  | 'cardio_run'
  | 'cardio_cycle'
  | 'cardio_row'
  | 'boxing'
  | 'mobility'
  | 'custom';

export type WorkoutStatus = 'idle' | 'active' | 'paused' | 'completed' | 'abandoned';

export interface WorkoutPlan {
  readonly id: string;
  readonly name: string;
  readonly type: WorkoutType;
  readonly exercises: readonly PlannedExercise[];
  readonly estimatedDurationMinutes: number;
}

export interface PlannedExercise {
  readonly id: string;
  readonly name: string;
  readonly targetSets: number;
  readonly targetReps?: number;
  readonly targetDurationSeconds?: number;
  readonly targetWeight?: number;
  readonly restSeconds: number;
}

export interface SetRecord {
  readonly setNumber: number;
  readonly reps?: number;
  readonly weight?: number;
  readonly durationSeconds?: number;
  readonly rpe?: number;
  readonly completedAt: number;
}

export interface ExerciseRecord {
  readonly exerciseId: string;
  readonly exerciseName: string;
  readonly sets: readonly SetRecord[];
  readonly startedAt: number;
  readonly completedAt?: number;
}

export interface WorkoutSession {
  readonly id: string;
  readonly userId: string;
  readonly planId?: string;
  readonly type: WorkoutType;
  readonly status: WorkoutStatus;
  readonly startedAt: number;
  readonly completedAt?: number;
  readonly exercises: readonly ExerciseRecord[];
  readonly durationSeconds: number;
  readonly notes?: string;
}

export interface WorkoutSummary {
  readonly id: string;
  readonly type: WorkoutType;
  readonly startedAt: number;
  readonly completedAt: number;
  readonly durationSeconds: number;
  readonly totalSets: number;
  readonly totalReps: number;
  readonly totalVolume: number;
  readonly caloriesBurned?: number;
  readonly avgHeartRate?: number;
  readonly maxHeartRate?: number;
  readonly personalRecords: readonly PersonalRecord[];
}

export interface PersonalRecord {
  readonly exerciseName: string;
  readonly recordType: 'max_weight' | 'max_reps' | 'max_volume' | 'fastest_time';
  readonly value: number;
  readonly unit: string;
  readonly previousValue?: number;
  readonly achievedAt: number;
}
