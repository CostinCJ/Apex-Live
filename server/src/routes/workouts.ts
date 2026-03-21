import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import type { Prisma } from '@prisma/client';
import { prisma } from '../config/database.js';
import { requireAuth, getUserId } from '../middleware/auth.js';
import { uuidParam } from '../middleware/params.js';

type JsonValue = Prisma.InputJsonValue;

async function detectPersonalRecords(workoutId: string, userId: string): Promise<void> {
  const workout = await prisma.workout.findUnique({
    where: { id: workoutId },
    select: { exercises: true, workoutType: true },
  });
  if (!workout?.exercises || !Array.isArray(workout.exercises)) return;

  // Compute best values per exercise in memory
  const candidates: Array<{
    exerciseName: string;
    recordType: string;
    value: number;
    unit: string;
  }> = [];

  for (const exercise of workout.exercises as Array<Record<string, unknown>>) {
    const name = exercise.name as string | undefined;
    if (!name) continue;

    const sets = exercise.sets as Array<Record<string, unknown>> | undefined;
    if (!sets?.length) continue;

    let maxWeight = 0;
    let maxReps = 0;
    let maxVolume = 0;

    for (const set of sets) {
      const weight = Number(set.weight ?? 0);
      const reps = Number(set.reps ?? 0);
      if (weight > maxWeight) maxWeight = weight;
      if (reps > maxReps) maxReps = reps;
      const volume = weight * reps;
      if (volume > maxVolume) maxVolume = volume;
    }

    if (maxWeight > 0) candidates.push({ exerciseName: name, recordType: 'max_weight', value: maxWeight, unit: 'kg' });
    if (maxReps > 0) candidates.push({ exerciseName: name, recordType: 'max_reps', value: maxReps, unit: 'reps' });
    if (maxVolume > 0) candidates.push({ exerciseName: name, recordType: 'max_volume', value: maxVolume, unit: 'kg' });
  }

  if (candidates.length === 0) return;

  // Batch-fetch all existing PRs for this user's exercises in ONE query
  const exerciseNames = [...new Set(candidates.map((c) => c.exerciseName))];
  const existingRecords = await prisma.personalRecord.findMany({
    where: { userId, exerciseName: { in: exerciseNames } },
  });

  // Build lookup map: "exerciseName|recordType" -> existing record
  const existingMap = new Map(
    existingRecords.map((r) => [`${r.exerciseName}|${r.recordType}`, r]),
  );

  // Build upsert operations only for actual new records
  const upsertOps = candidates
    .filter((c) => {
      const existing = existingMap.get(`${c.exerciseName}|${c.recordType}`);
      return !existing || Number(existing.value) < c.value;
    })
    .map((c) => {
      const existing = existingMap.get(`${c.exerciseName}|${c.recordType}`);
      return prisma.personalRecord.upsert({
        where: { userId_exerciseName_recordType: { userId, exerciseName: c.exerciseName, recordType: c.recordType } },
        create: {
          userId,
          exerciseName: c.exerciseName,
          recordType: c.recordType,
          value: c.value,
          unit: c.unit,
          workoutId,
          previousValue: existing ? existing.value : null,
        },
        update: {
          value: c.value,
          previousValue: existing?.value ?? null,
          workoutId,
          achievedAt: new Date(),
        },
      });
    });

  // Execute all upserts in a single transaction (1 round-trip instead of N)
  if (upsertOps.length > 0) {
    await prisma.$transaction(upsertOps);
  }
}

export const workoutsRouter = Router();
workoutsRouter.use(requireAuth);

const createWorkoutSchema = z.object({
  workoutType: z.enum([
    'push', 'pull', 'legs', 'upper', 'lower', 'full_body',
    'hiit', 'cardio_run', 'cardio_cycle', 'cardio_row',
    'boxing', 'mobility', 'custom',
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

const VALID_STATUSES = ['active', 'paused', 'completed', 'abandoned'];

workoutsRouter.get('/', async (req: Request, res: Response) => {
  const userId = getUserId(req);
  const status = req.query.status as string | undefined;
  const offset = Number(req.query.offset) || 0;
  const limit = Math.min(Number(req.query.limit) || 20, 100);

  if (status && !VALID_STATUSES.includes(status)) {
    res.status(400).json({ error: `Invalid status. Allowed: ${VALID_STATUSES.join(', ')}` });
    return;
  }

  const where: Record<string, unknown> = { userId };
  if (status) where.status = status;

  const [data, total] = await Promise.all([
    prisma.workout.findMany({
      where,
      orderBy: { startedAt: 'desc' },
      skip: offset,
      take: limit,
    }),
    prisma.workout.count({ where }),
  ]);

  res.json({ data, total });
});

// ─── Get single workout ─────────────────────────────────────────────

workoutsRouter.get('/:id', async (req: Request, res: Response) => {
  const id = uuidParam(req, res, 'id');
  if (!id) return;

  const workout = await prisma.workout.findFirst({
    where: { id, userId: getUserId(req) },
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
      plan: (parsed.data.plan ?? undefined) as JsonValue | undefined,
      exercises: (parsed.data.exercises ?? []) as JsonValue,
    },
  });

  res.status(201).json({ data: workout });
});

// ─── Status transition rules ────────────────────────────────────────

const VALID_TRANSITIONS: Record<string, string[]> = {
  active: ['paused', 'completed', 'abandoned'],
  paused: ['active', 'completed', 'abandoned'],
};

// ─── Update workout ─────────────────────────────────────────────────

workoutsRouter.patch('/:id', async (req: Request, res: Response) => {
  const id = uuidParam(req, res, 'id');
  if (!id) return;

  const parsed = updateWorkoutSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten().fieldErrors });
    return;
  }

  const userId = getUserId(req);

  // Verify ownership
  const existing = await prisma.workout.findFirst({
    where: { id, userId },
  });
  if (!existing) {
    res.status(404).json({ error: 'Workout not found' });
    return;
  }

  // Validate status transition
  if (parsed.data.status && parsed.data.status !== existing.status) {
    const allowed = VALID_TRANSITIONS[existing.status] ?? [];
    if (!allowed.includes(parsed.data.status)) {
      res.status(400).json({
        error: `Cannot transition from '${existing.status}' to '${parsed.data.status}'`,
      });
      return;
    }
  }

  // Auto-set completedAt and durationSeconds on completion
  let completedAt = parsed.data.completedAt;
  let durationSeconds = parsed.data.durationSeconds;
  if (parsed.data.status === 'completed') {
    if (!completedAt) {
      completedAt = new Date().toISOString();
    }
    if (durationSeconds == null && existing.startedAt) {
      durationSeconds = Math.floor(
        (new Date(completedAt).getTime() - new Date(existing.startedAt).getTime()) / 1000,
      );
    }
  }

  const workout = await prisma.workout.update({
    where: { id: existing.id },
    data: {
      status: parsed.data.status,
      title: parsed.data.title,
      completedAt,
      durationSeconds,
      exercises: parsed.data.exercises as JsonValue | undefined,
      metricsSummary: parsed.data.metricsSummary as JsonValue | undefined,
      notes: parsed.data.notes,
    },
  });

  // Auto-detect personal records on completion
  if (parsed.data.status === 'completed') {
    void detectPersonalRecords(workout.id, userId).catch((err) => {
      console.error('[PR detection] Error:', err);
    });
  }

  res.json({ data: workout });
});

// ─── Delete workout ─────────────────────────────────────────────────

workoutsRouter.delete('/:id', async (req: Request, res: Response) => {
  const id = uuidParam(req, res, 'id');
  if (!id) return;

  const userId = getUserId(req);

  const existing = await prisma.workout.findFirst({
    where: { id, userId },
  });
  if (!existing) {
    res.status(404).json({ error: 'Workout not found' });
    return;
  }

  await prisma.workout.delete({ where: { id: existing.id } });
  res.json({ success: true });
});

// ─── Upsert workout (for SyncQueue) ────────────────────────────────

const upsertWorkoutSchema = z.object({
  workoutType: z.enum([
    'push', 'pull', 'legs', 'upper', 'lower', 'full_body',
    'hiit', 'cardio_run', 'cardio_cycle', 'cardio_row',
    'boxing', 'mobility', 'custom',
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
  const workoutId = uuidParam(req, res, 'id');
  if (!workoutId) return;

  const parsed = upsertWorkoutSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten().fieldErrors });
    return;
  }

  const data = parsed.data;

  // Check if workout already exists and verify ownership
  const existing = await prisma.workout.findUnique({ where: { id: workoutId } });
  if (existing && existing.userId !== userId) {
    res.status(403).json({ error: 'Forbidden' });
    return;
  }

  const workout = existing
    ? await prisma.workout.update({
        where: { id: workoutId },
        data: {
          status: data.status,
          title: data.title,
          completedAt: data.completedAt,
          durationSeconds: data.durationSeconds,
          exercises: data.exercises as JsonValue | undefined,
          metricsSummary: data.metricsSummary as JsonValue | undefined,
          notes: data.notes,
        },
      })
    : await prisma.workout.create({
        data: {
          id: workoutId,
          userId,
          workoutType: data.workoutType ?? 'custom',
          title: data.title,
          status: data.status,
          plan: (data.plan ?? undefined) as JsonValue | undefined,
          exercises: (data.exercises ?? []) as JsonValue,
          notes: data.notes,
        },
      });

  res.json({ data: workout });
});
