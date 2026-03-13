import { Platform } from 'react-native';
import type { IHealthService } from './IHealthService';
import type {
  MetricType,
  HealthMetric,
  HealthPermissionResult,
  HealthCapabilities,
  BiometricSnapshot,
} from '@/types/health';
import type { MetricCallback, Unsubscribe } from './IHealthService';

// Stub adapter for platforms where health data is not available
class StubHealthAdapter implements IHealthService {
  async isAvailable(): Promise<boolean> {
    return false;
  }

  async requestPermissions(metrics: MetricType[]): Promise<HealthPermissionResult> {
    return { granted: false, deniedTypes: metrics };
  }

  async startObserving(): Promise<void> {
    // No-op
  }

  async stopObserving(): Promise<void> {
    // No-op
  }

  onMetricUpdate(_callback: MetricCallback): Unsubscribe {
    return () => {};
  }

  getLatestSnapshot(): BiometricSnapshot {
    return {
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
  }

  async getCapabilities(): Promise<HealthCapabilities> {
    return {
      hasHeartRate: false,
      hasCalories: false,
      hasSteps: false,
      hasHrv: false,
      hasBloodOxygen: false,
      hasDistance: false,
      hasRealTimeHeartRate: false,
    };
  }
}

export function createHealthAdapter(): IHealthService {
  if (Platform.OS === 'ios') {
    try {
      // Dynamic import of the iOS-specific adapter
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { HealthKitAdapter } = require('./HealthKitAdapter.ios');
      return new HealthKitAdapter();
    } catch {
      return new StubHealthAdapter();
    }
  }

  // Android and other platforms get the stub for now
  return new StubHealthAdapter();
}
