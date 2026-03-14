import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import { prisma } from '../config/database.js';
import { requireAuth, getUserId } from '../middleware/auth.js';
import { param } from '../middleware/params.js';

export const workoutsRouter = Router();
workoutsRouter.use(requireAuth);

const createWorkoutSchema = z.object({
  workoutType: z.enum([
    'push', 'pull', 'legs', 'upper', 'lower', 'full_body',
    'hiit', 'cardio_run', 'cardio_cycle', 'cardio_row',
    'yoga', 'mobility', 'custom',
  ]),
  title: z.string().optional(),
  plan: z.record(z.string(), z.unknown()).optional(),
  exercises: z.array(z.record(z.string(), z.unknown())).optional(),
});

const updateWorkoutSchema = z.object({
  status: z.enum(['active', 'paused', 'completed', 'abandoned']).optional(),
  title: z.string().optional(),
  completedAt: z.string().datetime().optional(),
  durationSeconds: z.number().int().optional(),
  exercises: z.array(z.record(z.string(), z.unknown())).optional(),
  metricsSummary: z.record(z.string(), z.unknown()).optional(),
  notes: z.string().optional(),
});

// ─── List workouts (paginated) ──────────────────────────────────────

workoutsRouter.get('/', async (req: Request, res: Response) => {
  const userId = getUserId(req);
  const status = req.query.status as string | undefined;
  const offset = Number(req.query.offset) || 0;
  const limit = Math.min(Number(req.query.limit) || 20, 100);

  const where: Record<string, unknown> = { userId };
  if (status) where.status = status;

  const data = await prisma.workout.findMany({
    where,
    orderBy: { startedAt: 'desc' },
    skip: offset,
    take: limit,
  });

  res.json({ data });
});

// ─── Get single workout ─────────────────────────────────────────────

workoutsRouter.get('/:id', async (req: Request, res: Response) => {
  const workout = await prisma.workout.findFirst({
    where: { id: param(req, 'id'), userId: getUserId(req) },
  });

  if (!workout) {
    res.status(404).json({ error: 'Workout not found' });
    return;
  }

  res.json({ data: workout });
});

// ─── Create workout ─────────────────────────────────────────────────

workoutsRouter.post('/', async (req: Request, res: Response) => {
  const parsed = createWorkoutSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten().fieldErrors });
    return;
  }

  const workout = await prisma.workout.create({
    data: {
      userId: getUserId(req),
      workoutType: parsed.data.workoutType,
      title: parsed.data.title,
      plan: parsed.data.plan ?? undefined,
      exercises: parsed.data.exercises ?? [],
    },
  });

  res.status(201).json({ data: workout });
});

// ─── Update workout ─────────────────────────────────────────────────

workoutsRouter.patch('/:id', async (req: Request, res: Response) => {
  const parsed = updateWorkoutSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten().fieldErrors });
    return;
  }

  const userId = getUserId(req);

  // Verify ownership
  const existing = await prisma.workout.findFirst({
    where: { id: param(req, 'id'), userId },
  });
  if (!existing) {
    res.status(404).json({ error: 'Workout not found' });
    return;
  }

  const workout = await prisma.workout.update({
    where: { id: param(req, 'id') },
    data: {
      status: parsed.data.status,
      title: parsed.data.title,
      completedAt: parsed.data.completedAt,
      durationSeconds: parsed.data.durationSeconds,
      exercises: parsed.data.exercises,
      metricsSummary: parsed.data.metricsSummary,
      notes: parsed.data.notes,
    },
  });

  res.json({ data: workout });
});

// ─── Delete workout ─────────────────────────────────────────────────

workoutsRouter.delete('/:id', async (req: Request, res: Response) => {
  const userId = getUserId(req);

  const existing = await prisma.workout.findFirst({
    where: { id: param(req, 'id'), userId },
  });
  if (!existing) {
    res.status(404).json({ error: 'Workout not found' });
    return;
  }

  await prisma.workout.delete({ where: { id: param(req, 'id') } });
  res.json({ success: true });
});

// ─── Upsert workout (for SyncQueue) ────────────────────────────────

const upsertWorkoutSchema = z.object({
  workoutType: z.enum([
    'push', 'pull', 'legs', 'upper', 'lower', 'full_body',
    'hiit', 'cardio_run', 'cardio_cycle', 'cardio_row',
    'yoga', 'mobility', 'custom',
  ]).optional(),
  title: z.string().optional(),
  status: z.enum(['active', 'paused', 'completed', 'abandoned']).optional(),
  completedAt: z.string().datetime().optional(),
  durationSeconds: z.number().int().optional(),
  plan: z.record(z.string(), z.unknown()).optional(),
  exercises: z.array(z.record(z.string(), z.unknown())).optional(),
  metricsSummary: z.record(z.string(), z.unknown()).optional(),
  notes: z.string().optional(),
});

workoutsRouter.put('/:id', async (req: Request, res: Response) => {
  const userId = getUserId(req);
  const workoutId = param(req, 'id');

  const parsed = upsertWorkoutSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten().fieldErrors });
    return;
  }

  const data = parsed.data;

  const workout = await prisma.workout.upsert({
    where: { id: workoutId },
    create: {
      id: workoutId,
      userId,
      workoutType: data.workoutType ?? 'custom',
      title: data.title,
      status: data.status,
      plan: data.plan ?? undefined,
      exercises: data.exercises ?? [],
      notes: data.notes,
    },
    update: {
      userId, // ensure ownership
      status: data.status,
      title: data.title,
      completedAt: data.completedAt,
      durationSeconds: data.durationSeconds,
      exercises: data.exercises,
      metricsSummary: data.metricsSummary,
      notes: data.notes,
    },
  });

  res.json({ data: workout });
});
