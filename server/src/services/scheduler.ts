import { prisma } from '../config/database.js';

/** Cleanup expired refresh tokens - runs every hour */
async function cleanupExpiredTokens(): Promise<void> {
  try {
    const result = await prisma.refreshToken.deleteMany({
      where: { expiresAt: { lt: new Date() } },
    });
    if (result.count > 0) {
      console.error(`[scheduler] Cleaned up ${result.count} expired refresh tokens`);
    }
  } catch (err) {
    console.error('[scheduler] Failed to clean up refresh tokens:', err);
  }
}

/** Cleanup expired email verification tokens */
async function cleanupExpiredVerifyTokens(): Promise<void> {
  try {
    const result = await prisma.emailVerifyToken.deleteMany({
      where: { expiresAt: { lt: new Date() } },
    });
    if (result.count > 0) {
      console.error(`[scheduler] Cleaned up ${result.count} expired email verify tokens`);
    }
  } catch (err) {
    console.error('[scheduler] Failed to clean up verify tokens:', err);
  }
}

/** Cleanup used/expired password reset tokens */
async function cleanupExpiredResetTokens(): Promise<void> {
  try {
    const result = await prisma.passwordResetToken.deleteMany({
      where: {
        OR: [
          { expiresAt: { lt: new Date() } },
          { usedAt: { not: null } },
        ],
      },
    });
    if (result.count > 0) {
      console.error(`[scheduler] Cleaned up ${result.count} expired/used password reset tokens`);
    }
  } catch (err) {
    console.error('[scheduler] Failed to clean up reset tokens:', err);
  }
}

/** Downsample old workout metrics into 1-minute buckets.
 *  Uses a batch approach: processes up to BATCH_SIZE rows per run to avoid full table scans. */
async function downsampleOldMetrics(): Promise<void> {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 7); // Downsample metrics older than 7 days
  const BATCH_SIZE = 50000;

  try {
    // Wrap INSERT + DELETE in a transaction for atomicity
    await prisma.$transaction(async (tx) => {
      // Only process a bounded batch of IDs to avoid full table scans
      await tx.$executeRaw`
        WITH batch AS (
          SELECT id, workout_id, user_id, metric_type, value, recorded_at
          FROM workout_metrics
          WHERE recorded_at < ${cutoff}
          LIMIT ${BATCH_SIZE}
        )
        INSERT INTO workout_metrics_downsampled (
          workout_id, user_id, metric_type, bucket_start, bucket_seconds,
          avg_value, min_value, max_value, sample_count
        )
        SELECT
          b.workout_id, b.user_id, b.metric_type,
          date_trunc('minute', b.recorded_at) AS bucket_start,
          60,
          ROUND(AVG(b.value), 2),
          ROUND(MIN(b.value), 2),
          ROUND(MAX(b.value), 2),
          COUNT(*)::INTEGER
        FROM batch b
        GROUP BY b.workout_id, b.user_id, b.metric_type, date_trunc('minute', b.recorded_at)
        ON CONFLICT (workout_id, metric_type, bucket_start)
        DO UPDATE SET
          avg_value = EXCLUDED.avg_value,
          min_value = EXCLUDED.min_value,
          max_value = EXCLUDED.max_value,
          sample_count = EXCLUDED.sample_count
      `;

      // Delete only the rows that were just aggregated
      await tx.$executeRaw`
        DELETE FROM workout_metrics
        WHERE id IN (
          SELECT id FROM workout_metrics
          WHERE recorded_at < ${cutoff}
          LIMIT ${BATCH_SIZE}
        )
        AND EXISTS (
          SELECT 1 FROM workout_metrics_downsampled d
          WHERE d.workout_id = workout_metrics.workout_id
          AND d.metric_type = workout_metrics.metric_type
          AND d.bucket_start = date_trunc('minute', workout_metrics.recorded_at)
        )
      `;
    });

    console.error('[scheduler] Downsampled old metrics batch');
  } catch (err) {
    console.error('[scheduler] Downsampling failed:', err);
  }
}

const HOUR = 60 * 60 * 1000;

const intervals: ReturnType<typeof setInterval>[] = [];

/** Start all scheduled jobs using setInterval */
export function startScheduler(): void {
  console.error('[scheduler] Starting scheduled jobs');

  // Token cleanup every hour
  intervals.push(setInterval(() => {
    void cleanupExpiredTokens();
    void cleanupExpiredVerifyTokens();
    void cleanupExpiredResetTokens();
  }, HOUR));

  // Metrics downsampling every 6 hours
  intervals.push(setInterval(() => {
    void downsampleOldMetrics();
  }, 6 * HOUR));

  // Run cleanup once at startup
  void cleanupExpiredTokens();
  void cleanupExpiredVerifyTokens();
  void cleanupExpiredResetTokens();
}

/** Stop all scheduled jobs (for graceful shutdown) */
export function stopScheduler(): void {
  for (const id of intervals) {
    clearInterval(id);
  }
  intervals.length = 0;
}
