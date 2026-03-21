import { Router, type Request, type Response } from 'express';
import { prisma } from '../config/database.js';
import { requireAuth, getUserId } from '../middleware/auth.js';

export const progressRouter = Router();
progressRouter.use(requireAuth);

// ─── Daily summaries ────────────────────────────────────────────────

progressRouter.get('/summaries', async (req: Request, res: Response) => {
  const userId = getUserId(req);
  const since = req.query.since as string | undefined;

  const where: Record<string, unknown> = { userId };
  if (since) {
    const sinceDate = new Date(since);
    if (isNaN(sinceDate.getTime())) {
      res.status(400).json({ error: 'Invalid date format for "since" parameter' });
      return;
    }
    where.date = { gte: sinceDate };
  }

  const limit = Math.min(Number(req.query.limit) || 365, 1000);

  const data = await prisma.dailyWorkoutSummary.findMany({
    where,
    orderBy: { date: 'desc' },
    take: limit,
  });

  res.json({ data });
});

// ─── Personal records ───────────────────────────────────────────────

progressRouter.get('/records', async (req: Request, res: Response) => {
  const userId = getUserId(req);
  const limit = Math.min(Number(req.query.limit) || 10, 100);

  const data = await prisma.personalRecord.findMany({
    where: { userId },
    orderBy: { achievedAt: 'desc' },
    take: limit,
  });

  res.json({ data });
});

// ─── Get previous workout (for comparison) ──────────────────────────

const VALID_WORKOUT_TYPES = [
  'push', 'pull', 'legs', 'upper', 'lower', 'full_body',
  'hiit', 'cardio_run', 'cardio_cycle', 'cardio_row',
  'boxing', 'mobility', 'custom',
];

const VALID_METRIC_TYPES = [
  'heart_rate', 'calories', 'distance', 'pace', 'speed',
  'cadence', 'power', 'elevation', 'rep_count', 'weight', 'rpe',
];

progressRouter.get('/previous-workout', async (req: Request, res: Response) => {
  const userId = getUserId(req);
  const workoutType = req.query.workoutType as string;
  const excludeId = req.query.excludeId as string | undefined;

  if (!workoutType) {
    res.status(400).json({ error: 'workoutType is required' });
    return;
  }

  if (!VALID_WORKOUT_TYPES.includes(workoutType)) {
    res.status(400).json({ error: `Invalid workoutType. Allowed: ${VALID_WORKOUT_TYPES.join(', ')}` });
    return;
  }

  const where: Record<string, unknown> = {
    userId,
    workoutType,
    status: 'completed',
  };
  if (excludeId) {
    where.id = { not: excludeId };
  }

  const data = await prisma.workout.findFirst({
    where,
    orderBy: { startedAt: 'desc' },
    select: {
      id: true,
      startedAt: true,
      completedAt: true,
      durationSeconds: true,
      metricsSummary: true,
    },
  });

  res.json({ data });
});

// ─── Compare workout metrics (raw SQL for bucketed comparison) ──────

progressRouter.get('/compare', async (req: Request, res: Response) => {
  const currentId = req.query.currentId as string;
  const previousId = req.query.previousId as string;
  const metric = req.query.metric as string;
  const bucketSeconds = Number(req.query.bucketSeconds) || 30;

  if (!currentId || !previousId || !metric) {
    res.status(400).json({ error: 'currentId, previousId, and metric are required' });
    return;
  }

  if (!VALID_METRIC_TYPES.includes(metric)) {
    res.status(400).json({ error: `Invalid metric. Allowed: ${VALID_METRIC_TYPES.join(', ')}` });
    return;
  }

  // IDOR check — verify the authenticated user owns both workouts
  const userId = getUserId(req);
  const [currentWorkout, previousWorkout] = await Promise.all([
    prisma.workout.findFirst({ where: { id: currentId, userId }, select: { id: true } }),
    prisma.workout.findFirst({ where: { id: previousId, userId }, select: { id: true } }),
  ]);
  if (!currentWorkout || !previousWorkout) {
    res.status(404).json({ error: 'One or both workouts not found' });
    return;
  }

  const data = await prisma.$queryRaw`
    SELECT * FROM compare_workout_metrics(
      ${currentId}::uuid,
      ${previousId}::uuid,
      ${metric}::metric_type,
      ${bucketSeconds}
    )
  `;

  res.json({ data });
});
