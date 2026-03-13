import { supabase } from '@/services/supabase/client';
import { METRICS_BATCH_SIZE, METRICS_FLUSH_INTERVAL } from '@/utils/constants';

interface PendingMetric {
  workout_id: string;
  user_id: string;
  metric_type: string;
  value: number;
  unit: string | null;
  recorded_at: string;
}

export class MetricsSyncService {
  private buffer: PendingMetric[] = [];
  private flushTimer: ReturnType<typeof setInterval> | null = null;

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
    this.buffer.push(metric);

    if (this.buffer.length >= METRICS_BATCH_SIZE) {
      void this.flush();
    }
  }

  async flush(): Promise<void> {
    if (this.buffer.length === 0) return;

    const batch = this.buffer.splice(0, METRICS_BATCH_SIZE);

    try {
      const { error } = await supabase
        .from('workout_metrics')
        .insert(
          batch.map((m) => ({
            workout_id: m.workout_id,
            user_id: m.user_id,
            metric_type: m.metric_type as 'heart_rate',
            value: m.value,
            unit: m.unit,
            recorded_at: m.recorded_at,
          })),
        );

      if (error) {
        console.error('Metrics flush error:', error);
        // Put failed metrics back at start of buffer for retry
        this.buffer.unshift(...batch);
      }
    } catch (error) {
      console.error('Metrics sync error:', error);
      this.buffer.unshift(...batch);
    }
  }

  async finalFlush(): Promise<void> {
    this.stop();
    // Flush all remaining in batches
    while (this.buffer.length > 0) {
      await this.flush();
    }
  }

  getPendingCount(): number {
    return this.buffer.length;
  }
}
