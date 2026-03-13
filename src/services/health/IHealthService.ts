import type {
  MetricType,
  HealthMetric,
  HealthPermissionResult,
  HealthCapabilities,
  BiometricSnapshot,
} from '@/types/health';

export type MetricCallback = (metric: HealthMetric) => void;
export type Unsubscribe = () => void;

export interface IHealthService {
  /** Check if health data is available on this platform/device */
  isAvailable(): Promise<boolean>;

  /** Request permissions for the specified metric types */
  requestPermissions(metrics: MetricType[]): Promise<HealthPermissionResult>;

  /** Start observing health metrics in real-time */
  startObserving(metrics: MetricType[]): Promise<void>;

  /** Stop all health metric observations */
  stopObserving(): Promise<void>;

  /** Subscribe to individual metric updates */
  onMetricUpdate(callback: MetricCallback): Unsubscribe;

  /** Get the latest snapshot of all tracked metrics */
  getLatestSnapshot(): BiometricSnapshot;

  /** Query what capabilities are available on this device */
  getCapabilities(): Promise<HealthCapabilities>;
}
