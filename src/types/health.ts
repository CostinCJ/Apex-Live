export type MetricType =
  | 'heart_rate'
  | 'calories'
  | 'steps'
  | 'active_energy'
  | 'hrv'
  | 'blood_oxygen'
  | 'distance';

export type HeartRateZone = 'rest' | 'warmup' | 'fat_burn' | 'cardio' | 'peak';

export interface HealthMetric {
  readonly type: MetricType;
  readonly value: number;
  readonly unit: string;
  readonly timestamp: number;
  readonly source: 'apple_health' | 'google_fit' | 'manual';
}

export interface BiometricSnapshot {
  readonly heartRate: number | null;
  readonly heartRateZone: HeartRateZone | null;
  readonly caloriesBurned: number | null;
  readonly steps: number | null;
  readonly activeMinutes: number | null;
  readonly distance: number | null;
  readonly hrv: number | null;
  readonly bloodOxygen: number | null;
  readonly timestamp: number;
}

export interface HealthPermissionResult {
  readonly granted: boolean;
  readonly deniedTypes: readonly MetricType[];
}

export interface HealthCapabilities {
  readonly hasHeartRate: boolean;
  readonly hasCalories: boolean;
  readonly hasSteps: boolean;
  readonly hasHrv: boolean;
  readonly hasBloodOxygen: boolean;
  readonly hasDistance: boolean;
  readonly hasRealTimeHeartRate: boolean;
}

export function getHeartRateZone(
  bpm: number,
  maxHR: number = 220,
): HeartRateZone {
  const percent = bpm / maxHR;
  if (percent < 0.5) return 'rest';
  if (percent < 0.6) return 'warmup';
  if (percent < 0.7) return 'fat_burn';
  if (percent < 0.85) return 'cardio';
  return 'peak';
}
