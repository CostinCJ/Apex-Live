import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import { prisma } from '../config/database.js';
import { requireAuth, getUserId } from '../middleware/auth.js';
import { revokeAllUserTokens } from '../services/auth.js';

export const usersRouter = Router();
usersRouter.use(requireAuth);

const updateProfileSchema = z.object({
  displayName: z.string().optional(),
  avatarUrl: z.string().url().nullable().optional(),
  fitnessLevel: z.enum(['beginner', 'intermediate', 'advanced']).optional(),
  preferences: z.record(z.string(), z.unknown()).optional(),
  voiceSettings: z.record(z.string(), z.unknown()).optional(),
  timezone: z.string().optional(),
  units: z.enum(['imperial', 'metric']).optional(),
  dateOfBirth: z.string().optional(),
  gender: z.enum(['male', 'female', 'other', 'prefer_not_to_say']).optional(),
  heightCm: z.number().optional(),
  weightKg: z.number().optional(),
});

// ─── Get profile ────────────────────────────────────────────────────

usersRouter.get('/me', async (req: Request, res: Response) => {
  const user = await prisma.user.findUnique({
    where: { id: getUserId(req) },
    omit: { passwordHash: true },
  });

  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }

  res.json({ data: user });
});

// ─── Update profile ─────────────────────────────────────────────────

usersRouter.patch('/me', async (req: Request, res: Response) => {
  const parsed = updateProfileSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten().fieldErrors });
    return;
  }

  const { preferences, voiceSettings, ...rest } = parsed.data;
  const user = await prisma.user.update({
    where: { id: getUserId(req) },
    data: {
      ...rest,
      ...(preferences !== undefined && {
        preferences: preferences as import('@prisma/client').Prisma.InputJsonValue,
      }),
      ...(voiceSettings !== undefined && {
        voiceSettings: voiceSettings as import('@prisma/client').Prisma.InputJsonValue,
      }),
    },
    omit: { passwordHash: true },
  });

  res.json({ data: user });
});

// ─── Delete account ─────────────────────────────────────────────────

usersRouter.delete('/me', async (req: Request, res: Response) => {
  const userId = getUserId(req);

  // Revoke all tokens first
  await revokeAllUserTokens(userId);

  // Cascade delete handles all related data
  await prisma.user.delete({ where: { id: userId } });

  res.json({ success: true });
});

// ─── Export user data (GDPR) ────────────────────────────────────────

usersRouter.get('/me/export', async (req: Request, res: Response) => {
  const userId = getUserId(req);
  const MAX_EXPORT_ROWS = 10000;

  const [user, workouts, personalRecords, dailySummaries, conversations] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, omit: { passwordHash: true } }),
    prisma.workout.findMany({ where: { userId }, take: MAX_EXPORT_ROWS }),
    prisma.personalRecord.findMany({ where: { userId }, take: MAX_EXPORT_ROWS }),
    prisma.dailyWorkoutSummary.findMany({ where: { userId }, take: MAX_EXPORT_ROWS }),
    prisma.coachConversation.findMany({
      where: { userId },
      include: { messages: true },
      take: MAX_EXPORT_ROWS,
    }),
  ]);

  res.json({
    data: {
      user,
      workouts,
      personal_records: personalRecords,
      daily_summaries: dailySummaries,
      conversations,
    },
  });
});
