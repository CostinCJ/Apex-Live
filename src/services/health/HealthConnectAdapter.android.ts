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

// react-native-health-connect is imported dynamically
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
let HealthConnect: typeof import('react-native-health-connect') | null = null;

try {
  HealthConnect = require('react-native-health-connect');
} catch {
  // Not available
}

const METRIC_TO_RECORD: Record<string, string> = {
  heart_rate: 'HeartRate',
  calories: 'ActiveCaloriesBurned',
  active_energy: 'ActiveCaloriesBurned',
  steps: 'Steps',
  distance: 'Distance',
};

export class HealthConnectAdapter implements IHealthService {
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
    if (!HealthConnect) return false;
    try {
      const status = await HealthConnect.getSdkStatus();
      return status === HealthConnect.SdkAvailabilityStatus.SDK_AVAILABLE;
    } catch {
      return false;
    }
  }

  async requestPermissions(metrics: MetricType[]): Promise<HealthPermissionResult> {
    if (!HealthConnect) {
      return { granted: false, deniedTypes: metrics };
    }

    try {
      await HealthConnect.initialize();

      const recordTypes = metrics
        .map((m) => METRIC_TO_RECORD[m])
        .filter(Boolean) as string[];

      const permissions = recordTypes.map((recordType) => ({
        accessType: 'read' as const,
        recordType,
      }));

      const granted = await HealthConnect.requestPermission(permissions);

      if (granted.length > 0) {
        return { granted: true, deniedTypes: [] };
      }
      return { granted: false, deniedTypes: metrics };
    } catch {
      return { granted: false, deniedTypes: metrics };
    }
  }

  async startObserving(metrics: MetricType[]): Promise<void> {
    if (!HealthConnect) return;

    this.pollTimer = setInterval(() => {
      if (metrics.includes('heart_rate')) {
        void this.fetchHeartRate();
      }
      if (metrics.includes('calories') || metrics.includes('active_energy')) {
        void this.fetchCalories();
      }
      if (metrics.includes('steps')) {
        void this.fetchSteps();
      }
      if (metrics.includes('distance')) {
        void this.fetchDistance();
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
      hasHrv: false, // Health Connect HRV support is limited
      hasBloodOxygen: false,
      hasDistance: available,
      hasRealTimeHeartRate: available,
    };
  }

  private async fetchHeartRate(): Promise<void> {
    if (!HealthConnect) return;

    try {
      const now = new Date();
      const oneMinuteAgo = new Date(now.getTime() - 60_000);

      const result = await HealthConnect.readRecords('HeartRate', {
        timeRangeFilter: {
          operator: 'between',
          startTime: oneMinuteAgo.toISOString(),
          endTime: now.toISOString(),
        },
      });

      const records = result.records ?? result;
      if (!Array.isArray(records) || records.length === 0) return;

      const latest = records[records.length - 1];
      const samples = latest?.samples ?? [];
      const lastSample = samples[samples.length - 1];
      if (!lastSample) return;

      const bpm = lastSample.beatsPerMinute;
      const zone: HeartRateZone = getHeartRateZone(bpm);

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
        source: 'google_fit',
      });
    } catch (err) {
      console.warn('HealthConnect heart rate fetch error:', err);
    }
  }

  private async fetchCalories(): Promise<void> {
    if (!HealthConnect) return;

    try {
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);

      const result = await HealthConnect.readRecords('ActiveCaloriesBurned', {
        timeRangeFilter: {
          operator: 'between',
          startTime: startOfDay.toISOString(),
          endTime: new Date().toISOString(),
        },
      });

      const records = result.records ?? result;
      if (!Array.isArray(records)) return;

      const total = records.reduce(
        (sum: number, r: { energy?: { inKilocalories?: number } }) =>
          sum + (r.energy?.inKilocalories ?? 0),
        0,
      );

      this.snapshot = { ...this.snapshot, caloriesBurned: total, timestamp: Date.now() };
      this.emit({ type: 'calories', value: total, unit: 'kcal', timestamp: Date.now(), source: 'google_fit' });
    } catch (err) {
      console.warn('HealthConnect calories fetch error:', err);
    }
  }

  private async fetchSteps(): Promise<void> {
    if (!HealthConnect) return;

    try {
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);

      const result = await HealthConnect.readRecords('Steps', {
        timeRangeFilter: {
          operator: 'between',
          startTime: startOfDay.toISOString(),
          endTime: new Date().toISOString(),
        },
      });

      const records = result.records ?? result;
      if (!Array.isArray(records)) return;

      const total = records.reduce(
        (sum: number, r: { count?: number }) => sum + (r.count ?? 0),
        0,
      );

      this.snapshot = { ...this.snapshot, steps: total, timestamp: Date.now() };
      this.emit({ type: 'steps', value: total, unit: 'count', timestamp: Date.now(), source: 'google_fit' });
    } catch (err) {
      console.warn('HealthConnect steps fetch error:', err);
    }
  }

  private async fetchDistance(): Promise<void> {
    if (!HealthConnect) return;

    try {
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);

      const result = await HealthConnect.readRecords('Distance', {
        timeRangeFilter: {
          operator: 'between',
          startTime: startOfDay.toISOString(),
          endTime: new Date().toISOString(),
        },
      });

      const records = result.records ?? result;
      if (!Array.isArray(records)) return;

      const total = records.reduce(
        (sum: number, r: { distance?: { inMeters?: number } }) =>
          sum + (r.distance?.inMeters ?? 0),
        0,
      );

      this.snapshot = { ...this.snapshot, distance: total, timestamp: Date.now() };
      this.emit({ type: 'distance', value: total, unit: 'm', timestamp: Date.now(), source: 'google_fit' });
    } catch (err) {
      console.warn('HealthConnect distance fetch error:', err);
    }
  }

  private emit(metric: HealthMetric): void {
    this.callbacks.forEach((cb) => cb(metric));
  }
}
