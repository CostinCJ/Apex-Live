import type {
  MetricType,
  HealthMetric,
  HealthPermissionResult,
  HealthCapabilities,
  BiometricSnapshot,
  HeartRateZone,
} from '@/types/health';
import { getHeartRateZone } from '@/types/health';
import type { IHealthService, MetricCallback, Unsubscribe } from './IHealthService';
import { HEALTH_POLL_INTERVAL_ACTIVE } from '@/utils/constants';

// react-native-health is imported dynamically to prevent crashes on Android
let AppleHealthKit: typeof import('react-native-health').default | null = null;

try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  AppleHealthKit = require('react-native-health').default;
} catch {
  // Not available
}

export class HealthKitAdapter implements IHealthService {
  private callbacks = new Set<MetricCallback>();
  private pollTimer: ReturnType<typeof setInterval> | null = null;
  private snapshot: BiometricSnapshot = {
    heartRate: null,
    heartRateZone: null,
    caloriesBurned: null,
    steps: null,
    activeMinutes: null,
    distance: null,
    hrv: null,
    bloodOxygen: null,
    timestamp: Date.now(),
  };

  async isAvailable(): Promise<boolean> {
    if (!AppleHealthKit) return false;
    return new Promise((resolve) => {
      AppleHealthKit!.isAvailable((err: unknown, available: boolean) => {
        resolve(!err && available);
      });
    });
  }

  async requestPermissions(metrics: MetricType[]): Promise<HealthPermissionResult> {
    if (!AppleHealthKit) {
      return { granted: false, deniedTypes: metrics };
    }

    const permissions = {
      permissions: {
        read: this.mapToHealthKitTypes(metrics),
        write: [] as string[],
      },
    };

    return new Promise((resolve) => {
      AppleHealthKit!.initHealthKit(permissions, (err: unknown) => {
        if (err) {
          resolve({ granted: false, deniedTypes: metrics });
        } else {
          resolve({ granted: true, deniedTypes: [] });
        }
      });
    });
  }

  async startObserving(metrics: MetricType[]): Promise<void> {
    if (!AppleHealthKit) return;

    // Poll for metrics at active interval
    this.pollTimer = setInterval(() => {
      if (metrics.includes('heart_rate')) {
        this.fetchHeartRate();
      }
      if (metrics.includes('calories') || metrics.includes('active_energy')) {
        this.fetchCalories();
      }
      if (metrics.includes('steps')) {
        this.fetchSteps();
      }
    }, HEALTH_POLL_INTERVAL_ACTIVE);
  }

  async stopObserving(): Promise<void> {
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
  }

  onMetricUpdate(callback: MetricCallback): Unsubscribe {
    this.callbacks.add(callback);
    return () => this.callbacks.delete(callback);
  }

  getLatestSnapshot(): BiometricSnapshot {
    return this.snapshot;
  }

  async getCapabilities(): Promise<HealthCapabilities> {
    const available = await this.isAvailable();
    return {
      hasHeartRate: available,
      hasCalories: available,
      hasSteps: available,
      hasHrv: available,
      hasBloodOxygen: available,
      hasDistance: available,
      hasRealTimeHeartRate: available,
    };
  }

  private fetchHeartRate(): void {
    if (!AppleHealthKit) return;

    const options = {
      startDate: new Date(Date.now() - 60000).toISOString(),
      ascending: false,
      limit: 1,
    };

    AppleHealthKit.getHeartRateSamples(
      options,
      (err: unknown, results: Array<{ value: number; startDate: string }>) => {
        if (err || !results?.[0]) return;

        const bpm = results[0].value;
        const zone = getHeartRateZone(bpm);

        this.snapshot = {
          ...this.snapshot,
          heartRate: bpm,
          heartRateZone: zone,
          timestamp: Date.now(),
        };

        this.emit({
          type: 'heart_rate',
          value: bpm,
          unit: 'bpm',
          timestamp: Date.now(),
          source: 'apple_health',
        });
      },
    );
  }

  private fetchCalories(): void {
    if (!AppleHealthKit) return;

    const options = {
      startDate: new Date(new Date().setHours(0, 0, 0, 0)).toISOString(),
    };

    AppleHealthKit.getActiveEnergyBurned(
      options,
      (err: unknown, results: Array<{ value: number }>) => {
        if (err || !results) return;

        const total = results.reduce((sum, r) => sum + r.value, 0);
        this.snapshot = {
          ...this.snapshot,
          caloriesBurned: total,
          timestamp: Date.now(),
        };

        this.emit({
          type: 'calories',
          value: total,
          unit: 'kcal',
          timestamp: Date.now(),
          source: 'apple_health',
        });
      },
    );
  }

  private fetchSteps(): void {
    if (!AppleHealthKit) return;

    const options = {
      date: new Date().toISOString(),
    };

    AppleHealthKit.getStepCount(
      options,
      (err: unknown, results: { value: number }) => {
        if (err || !results) return;

        this.snapshot = {
          ...this.snapshot,
          steps: results.value,
          timestamp: Date.now(),
        };

        this.emit({
          type: 'steps',
          value: results.value,
          unit: 'count',
          timestamp: Date.now(),
          source: 'apple_health',
        });
      },
    );
  }

  private emit(metric: HealthMetric): void {
    this.callbacks.forEach((cb) => cb(metric));
  }

  private mapToHealthKitTypes(metrics: MetricType[]): string[] {
    const map: Record<string, string> = {
      heart_rate: 'HeartRate',
      calories: 'ActiveEnergyBurned',
      active_energy: 'ActiveEnergyBurned',
      steps: 'StepCount',
      distance: 'DistanceWalkingRunning',
      hrv: 'HeartRateVariabilitySDNN',
      blood_oxygen: 'OxygenSaturation',
    };
    return metrics.map((m) => map[m]).filter(Boolean) as string[];
  }
}
