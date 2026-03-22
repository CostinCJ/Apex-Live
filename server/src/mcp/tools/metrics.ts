import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { prisma } from '../../config/database.js';

const METRIC_TYPES = [
  'heart_rate', 'calories', 'distance', 'pace', 'speed',
  'cadence', 'power', 'elevation', 'rep_count', 'weight', 'rpe',
] as const;

export function registerMetricsTools(server: McpServer): void {

  // ── log_metrics ──────────────────────────────────────────────────
  server.tool(
    'log_metrics',
    'Record workout metrics (heart rate, calories, etc.) in batch. Used by the companion app to relay real-time wearable data.',
    {
      userId: z.string().uuid().describe('User ID'),
      workoutId: z.string().uuid().describe('Active workout ID'),
      metrics: z.array(z.object({
        metricType: z.enum(METRIC_TYPES),
        value: z.number(),
        unit: z.string().optional(),
        recordedAt: z.string().datetime().optional(),
        metadata: z.record(z.string(), z.unknown()).optional(),
      })).min(1).max(500).describe('Array of metric readings'),
    },
    async ({ userId, workoutId, metrics }) => {
      // Verify ownership
      const workout = await prisma.workout.findFirst({
        where: { id: workoutId, userId },
        select: { id: true },
      });
      if (!workout) {
        return { content: [{ type: 'text', text: 'Error: Workout not found' }], isError: true };
      }

      const rows = metrics.map((m) => ({
        workoutId,
        userId,
        metricType: m.metricType as import('@prisma/client').MetricType,
        value: m.value,
        unit: m.unit ?? null,
        recordedAt: m.recordedAt ? new Date(m.recordedAt) : new Date(),
        metadata: (m.metadata ?? undefined) as import('@prisma/client').Prisma.InputJsonValue | undefined,
      }));

      const result = await prisma.workoutMetric.createMany({ data: rows });

      return {
        content: [{ type: 'text', text: JSON.stringify({ inserted: result.count }) }],
      };
    },
  );

  // ── get_workout_metrics ──────────────────────────────────────────
  server.tool(
    'get_workout_metrics',
    'Get time-series metrics for a specific workout (heart rate, calories, etc.).',
    {
      userId: z.string().uuid().describe('User ID'),
      workoutId: z.string().uuid().describe('Workout ID'),
      metricType: z.enum(METRIC_TYPES).optional().describe('Filter by metric type'),
      limit: z.number().min(1).max(5000).default(1000),
    },
    async ({ userId, workoutId, metricType, limit }) => {
      const where: Record<string, unknown> = { workoutId, userId };
      if (metricType) where.metricType = metricType;

      const data = await prisma.workoutMetric.findMany({
        where,
        orderBy: { recordedAt: 'asc' },
        take: limit,
        select: {
          metricType: true, value: true, unit: true,
          recordedAt: true, metadata: true,
        },
      });

      return {
        content: [{ type: 'text', text: JSON.stringify({ metrics: data, count: data.length }) }],
      };
    },
  );

  // ── get_live_metrics ─────────────────────────────────────────────
  server.tool(
    'get_live_metrics',
    'Get the latest real-time metrics from an active workout (last N seconds of wearable data). Use this to check current heart rate, calories, etc. during coaching.',
    {
      userId: z.string().uuid().describe('User ID'),
      workoutId: z.string().uuid().describe('Active workout ID'),
      secondsBack: z.number().min(1).max(300).default(30).describe('How many seconds of recent data to return'),
    },
    async ({ userId, workoutId, secondsBack }) => {
      const since = new Date(Date.now() - secondsBack * 1000);

      const metrics = await prisma.workoutMetric.findMany({
        where: {
          workoutId,
          userId,
          recordedAt: { gte: since },
        },
        orderBy: { recordedAt: 'desc' },
        select: {
          metricType: true, value: true, unit: true, recordedAt: true,
        },
      });

      // Group by metric type and compute latest + average
      const grouped: Record<string, { latest: number; avg: number; min: number; max: number; count: number }> = {};
      for (const m of metrics) {
        const key = m.metricType;
        const val = Number(m.value);
        if (!grouped[key]) {
          grouped[key] = { latest: val, avg: val, min: val, max: val, count: 1 };
        } else {
          const g = grouped[key]!;
          g.avg = (g.avg * g.count + val) / (g.count + 1);
          g.min = Math.min(g.min, val);
          g.max = Math.max(g.max, val);
          g.count++;
        }
      }

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            window: `last ${secondsBack}s`,
            liveMetrics: grouped,
            totalReadings: metrics.length,
          }),
        }],
      };
    },
  );
}
