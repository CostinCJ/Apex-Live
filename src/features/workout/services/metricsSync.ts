import { api } from '@/services/api/client';
import { METRICS_BATCH_SIZE, METRICS_FLUSH_INTERVAL } from '@/utils/constants';

export interface PendingMetric {
  workout_id: string;
  metric_type: string;
  value: number;
  unit: string | null;
  recorded_at: string;
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const MAX_BUFFER_SIZE = 1000;
const MAX_FINAL_FLUSH_ITERATIONS = 10;

export class MetricsSyncService {
  private buffer: PendingMetric[] = [];
  private flushTimer: ReturnType<typeof setInterval> | null = null;
  private flushing = false;

  start(): void {
    this.flushTimer = setInterval(() => {
      void this.flush();
    }, METRICS_FLUSH_INTERVAL);
  }

  stop(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
  }

  addMetric(metric: PendingMetric): void {
    if (!UUID_REGEX.test(metric.workout_id)) {
      console.warn('MetricsSyncService: skipping metric with non-UUID workout_id');
      return;
    }
    // Cap buffer size to prevent unbounded memory growth
    if (this.buffer.length >= MAX_BUFFER_SIZE) {
      this.buffer.splice(0, this.buffer.length - MAX_BUFFER_SIZE + 1);
    }
    this.buffer.push(metric);

    if (this.buffer.length >= METRICS_BATCH_SIZE) {
      void this.flush();
    }
  }

  async flush(): Promise<void> {
    if (this.buffer.length === 0 || this.flushing) return;

    this.flushing = true;
    const batch = this.buffer.splice(0, METRICS_BATCH_SIZE);

    try {
      const { error } = await api.post('/api/metrics/batch', {
        metrics: batch.map((m) => ({
          workoutId: m.workout_id,
          metricType: m.metric_type,
          value: m.value,
          unit: m.unit,
          recordedAt: m.recorded_at,
        })),
      });

      if (error) {
        console.error('Metrics flush error:', error);
        // Put failed metrics back at start of buffer for retry
        this.buffer = [...batch, ...this.buffer];
      }
    } catch (error: unknown) {
      console.error('Metrics sync error:', error);
      this.buffer = [...batch, ...this.buffer];
    } finally {
      this.flushing = false;
    }
  }

  async finalFlush(): Promise<void> {
    this.stop();
    // Flush all remaining in batches, with a max iteration guard
    let iterations = 0;
    while (this.buffer.length > 0 && iterations < MAX_FINAL_FLUSH_ITERATIONS) {
      if (this.flushing) {
        // Wait for in-progress flush to complete before retrying
        await new Promise((resolve) => setTimeout(resolve, 100));
        iterations++;
        continue;
      }
      await this.flush();
      iterations++;
    }
  }

  getPendingCount(): number {
    return this.buffer.length;
  }
}
