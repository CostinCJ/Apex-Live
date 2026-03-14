import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import { prisma } from '../config/database.js';
import {
  hashPassword,
  verifyPassword,
  createTokenPair,
  rotateRefreshToken,
  revokeAllUserTokens,
} from '../services/auth.js';
import { requireAuth, getUserId } from '../middleware/auth.js';

export const authRouter = Router();

const signUpSchema = z.object({
  email: z.string().email(),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one digit'),
  displayName: z.string().optional(),
});

const signInSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const refreshSchema = z.object({
  refreshToken: z.string().min(1),
});

// ─── Sign Up ────────────────────────────────────────────────────────

authRouter.post('/signup', async (req: Request, res: Response) => {
  const parsed = signUpSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten().fieldErrors });
    return;
  }

  const { email, password, displayName } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    res.status(409).json({ error: 'Email already registered' });
    return;
  }

  const passwordHash = await hashPassword(password);
  const user = await prisma.user.create({
    data: {
      email,
      passwordHash,
      displayName: displayName ?? email.split('@')[0] ?? email,
    },
  });

  const tokens = await createTokenPair(user.id, user.email);

  res.status(201).json({
    user: { id: user.id, email: user.email, displayName: user.displayName },
    ...tokens,
  });
});

// ─── Sign In ────────────────────────────────────────────────────────

authRouter.post('/signin', async (req: Request, res: Response) => {
  const parsed = signInSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten().fieldErrors });
    return;
  }

  const { email, password } = parsed.data;

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    res.status(401).json({ error: 'Invalid email or password' });
    return;
  }

  const tokens = await createTokenPair(user.id, user.email);

  res.json({
    user: { id: user.id, email: user.email, displayName: user.displayName },
    ...tokens,
  });
});

// ─── Refresh Token ──────────────────────────────────────────────────

authRouter.post('/refresh', async (req: Request, res: Response) => {
  const parsed = refreshSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Missing refresh token' });
    return;
  }

  const tokens = await rotateRefreshToken(parsed.data.refreshToken);
  if (!tokens) {
    res.status(401).json({ error: 'Invalid or expired refresh token' });
    return;
  }

  res.json(tokens);
});

// ─── Sign Out ───────────────────────────────────────────────────────

authRouter.post('/signout', requireAuth, async (req: Request, res: Response) => {
  await revokeAllUserTokens(getUserId(req));
  res.json({ success: true });
});

// ─── Get Session (current user) ─────────────────────────────────────

authRouter.get('/session', requireAuth, async (req: Request, res: Response) => {
  const user = await prisma.user.findUnique({
    where: { id: getUserId(req) },
    select: {
      id: true,
      email: true,
      displayName: true,
      avatarUrl: true,
      fitnessLevel: true,
      preferences: true,
      voiceSettings: true,
      timezone: true,
      units: true,
      createdAt: true,
    },
  });

  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }

  res.json({ user });
});
