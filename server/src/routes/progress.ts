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
    where.date = { gte: new Date(since) };
  }

  const data = await prisma.dailyWorkoutSummary.findMany({
    where,
    orderBy: { date: 'desc' },
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

progressRouter.get('/previous-workout', async (req: Request, res: Response) => {
  const userId = getUserId(req);
  const workoutType = req.query.workoutType as string;
  const excludeId = req.query.excludeId as string | undefined;

  if (!workoutType) {
    res.status(400).json({ error: 'workoutType is required' });
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
