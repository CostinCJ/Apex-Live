import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import { prisma } from '../config/database.js';
import { requireAuth, getUserId } from '../middleware/auth.js';
import { param } from '../middleware/params.js';

export const metricsRouter = Router();
metricsRouter.use(requireAuth);

const metricSchema = z.object({
  workoutId: z.string().uuid(),
  metricType: z.enum([
    'heart_rate', 'calories', 'distance', 'pace', 'speed',
    'cadence', 'power', 'elevation', 'rep_count', 'weight', 'rpe',
  ]),
  value: z.number(),
  unit: z.string().optional(),
  recordedAt: z.string().datetime().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

const batchSchema = z.object({
  metrics: z.array(metricSchema).min(1).max(500),
});

// ─── Batch insert metrics ───────────────────────────────────────────

metricsRouter.post('/batch', async (req: Request, res: Response) => {
  const parsed = batchSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten().fieldErrors });
    return;
  }

  const userId = getUserId(req);

  // Verify user owns all referenced workouts
  const workoutIds = [...new Set(parsed.data.metrics.map((m) => m.workoutId))];
  const owned = await prisma.workout.findMany({
    where: { id: { in: workoutIds }, userId },
    select: { id: true },
  });

  const ownedIds = new Set(owned.map((w) => w.id));
  const unauthorized = workoutIds.filter((id) => !ownedIds.has(id));

  if (unauthorized.length > 0) {
    res.status(403).json({ error: 'Unauthorized workout IDs', ids: unauthorized });
    return;
  }

  const rows = parsed.data.metrics.map((m) => ({
    workoutId: m.workoutId,
    userId,
    metricType: m.metricType as import('@prisma/client').MetricType,
    value: m.value,
    unit: m.unit ?? null,
    recordedAt: m.recordedAt ? new Date(m.recordedAt) : new Date(),
    metadata: m.metadata ?? undefined,
  }));

  const result = await prisma.workoutMetric.createMany({ data: rows });

  res.json({ success: true, inserted: result.count });
});

// ─── Get metrics for a workout ──────────────────────────────────────

metricsRouter.get('/workout/:workoutId', async (req: Request, res: Response) => {
  const userId = getUserId(req);
  const metricType = req.query.type as string | undefined;

  const where: Record<string, unknown> = {
    workoutId: param(req, 'workoutId'),
    userId,
  };
  if (metricType) where.metricType = metricType;

  const data = await prisma.workoutMetric.findMany({
    where,
    orderBy: { recordedAt: 'asc' },
  });

  res.json({ data });
});

// ─── Single metric insert (for metricsSync flush) ───────────────────

metricsRouter.post('/', async (req: Request, res: Response) => {
  const parsed = metricSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten().fieldErrors });
    return;
  }

  const userId = getUserId(req);

  // Verify ownership
  const workout = await prisma.workout.findFirst({
    where: { id: parsed.data.workoutId, userId },
  });
  if (!workout) {
    res.status(404).json({ error: 'Workout not found' });
    return;
  }

  const metric = await prisma.workoutMetric.create({
    data: {
      workoutId: parsed.data.workoutId,
      userId,
      metricType: parsed.data.metricType as import('@prisma/client').MetricType,
      value: parsed.data.value,
      unit: parsed.data.unit ?? null,
      recordedAt: parsed.data.recordedAt ? new Date(parsed.data.recordedAt) : new Date(),
      metadata: parsed.data.metadata ?? undefined,
    },
  });

  res.status(201).json({ data: metric });
});
