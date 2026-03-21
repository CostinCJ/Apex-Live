import { Router, type Request, type Response } from 'express';
import crypto from 'node:crypto';
import { z } from 'zod';
import { prisma } from '../config/database.js';
import {
  hashPassword,
  verifyPassword,
  createTokenPair,
  rotateRefreshToken,
  revokeAllUserTokens,
} from '../services/auth.js';
import { sendVerificationEmail, sendPasswordResetEmail } from '../services/email.js';
import { requireAuth, getUserId } from '../middleware/auth.js';
import { rateLimit } from '../middleware/rateLimit.js';

export const authRouter = Router();

// Rate limit auth endpoints: 10 attempts per 15 minutes per IP
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: 'Too many authentication attempts, please try again later.',
});

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
  password: z.string().min(1, 'Password is required'),
});

const refreshSchema = z.object({
  refreshToken: z.string().min(1),
});

// ─── Helpers ────────────────────────────────────────────────────────

/** Generate a 6-digit numeric code */
function generateCode(): string {
  return crypto.randomInt(100_000, 999_999).toString();
}

/** Hash a token/code before DB storage */
function hashCode(code: string): string {
  return crypto.createHash('sha256').update(code).digest('hex');
}

// ─── Sign Up ────────────────────────────────────────────────────────

authRouter.post('/signup', authLimiter, async (req: Request, res: Response) => {
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

  // Send verification email
  const code = generateCode();
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + 24);

  await prisma.emailVerifyToken.create({
    data: {
      userId: user.id,
      token: hashCode(code),
      expiresAt,
    },
  });

  void sendVerificationEmail(user.email, code).catch((err) => {
    console.error('[auth] Failed to send verification email:', err);
  });

  const tokens = await createTokenPair(user.id, user.email);

  res.status(201).json({
    user: {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      emailVerified: user.emailVerified,
    },
    ...tokens,
  });
});

// ─── Sign In ────────────────────────────────────────────────────────

authRouter.post('/signin', authLimiter, async (req: Request, res: Response) => {
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

authRouter.post('/refresh', authLimiter, async (req: Request, res: Response) => {
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
      emailVerified: true,
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

// ─── Verify Email ──────────────────────────────────────────────────

const verifyEmailSchema = z.object({
  code: z.string().length(6),
});

const verifyEmailLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: 'Too many verification attempts, please try again later.',
});

authRouter.post('/verify-email', requireAuth, verifyEmailLimiter, async (req: Request, res: Response) => {
  const parsed = verifyEmailSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid verification code format' });
    return;
  }

  const userId = getUserId(req);
  const hashedCode = hashCode(parsed.data.code);

  const token = await prisma.emailVerifyToken.findFirst({
    where: {
      userId,
      token: hashedCode,
      expiresAt: { gt: new Date() },
    },
  });

  if (!token) {
    res.status(400).json({ error: 'Invalid or expired verification code' });
    return;
  }

  // Mark email as verified and clean up tokens
  await Promise.all([
    prisma.user.update({ where: { id: userId }, data: { emailVerified: true } }),
    prisma.emailVerifyToken.deleteMany({ where: { userId } }),
  ]);

  res.json({ success: true });
});

// ─── Resend Verification Email ─────────────────────────────────────

authRouter.post('/resend-verification', requireAuth, authLimiter, async (req: Request, res: Response) => {
  const userId = getUserId(req);
  const user = await prisma.user.findUnique({ where: { id: userId } });

  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }

  if (user.emailVerified) {
    res.json({ success: true, message: 'Email already verified' });
    return;
  }

  // Delete old tokens and create new one
  await prisma.emailVerifyToken.deleteMany({ where: { userId } });

  const code = generateCode();
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + 24);

  await prisma.emailVerifyToken.create({
    data: { userId, token: hashCode(code), expiresAt },
  });

  void sendVerificationEmail(user.email, code).catch((err) => {
    console.error('[auth] Failed to resend verification email:', err);
  });

  res.json({ success: true });
});

// ─── Forgot Password ──────────────────────────────────────────────

const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

authRouter.post('/forgot-password', authLimiter, async (req: Request, res: Response) => {
  const parsed = forgotPasswordSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Valid email is required' });
    return;
  }

  // Always return success to prevent email enumeration
  const user = await prisma.user.findUnique({ where: { email: parsed.data.email } });

  if (user) {
    // Delete any existing reset tokens for this user
    await prisma.passwordResetToken.deleteMany({ where: { userId: user.id } });

    const code = generateCode();
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1); // 1 hour expiry

    await prisma.passwordResetToken.create({
      data: { userId: user.id, token: hashCode(code), expiresAt },
    });

    void sendPasswordResetEmail(user.email, code).catch((err) => {
      console.error('[auth] Failed to send password reset email:', err);
    });
  }

  // Always return success to prevent email enumeration
  res.json({ success: true, message: 'If an account with that email exists, a reset code has been sent.' });
});

// ─── Reset Password ───────────────────────────────────────────────

const resetPasswordSchema = z.object({
  email: z.string().email(),
  code: z.string().length(6),
  newPassword: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one digit'),
});

authRouter.post('/reset-password', authLimiter, async (req: Request, res: Response) => {
  const parsed = resetPasswordSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten().fieldErrors });
    return;
  }

  const { email, code, newPassword } = parsed.data;

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    res.status(400).json({ error: 'Invalid reset code' });
    return;
  }

  const resetToken = await prisma.passwordResetToken.findFirst({
    where: {
      userId: user.id,
      token: hashCode(code),
      expiresAt: { gt: new Date() },
      usedAt: null,
    },
  });

  if (!resetToken) {
    res.status(400).json({ error: 'Invalid or expired reset code' });
    return;
  }

  // Update password and mark token as used
  const newHash = await hashPassword(newPassword);

  await Promise.all([
    prisma.user.update({ where: { id: user.id }, data: { passwordHash: newHash } }),
    prisma.passwordResetToken.update({ where: { id: resetToken.id }, data: { usedAt: new Date() } }),
    // Revoke all existing refresh tokens for security
    revokeAllUserTokens(user.id),
  ]);

  res.json({ success: true });
});

// ─── Change Password (authenticated) ──────────────────────────────

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one digit'),
});

authRouter.post('/change-password', requireAuth, async (req: Request, res: Response) => {
  const parsed = changePasswordSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten().fieldErrors });
    return;
  }

  const userId = getUserId(req);
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }

  const valid = await verifyPassword(parsed.data.currentPassword, user.passwordHash);
  if (!valid) {
    res.status(401).json({ error: 'Current password is incorrect' });
    return;
  }

  const newHash = await hashPassword(parsed.data.newPassword);
  await prisma.user.update({ where: { id: userId }, data: { passwordHash: newHash } });

  // Revoke all existing sessions for security
  await revokeAllUserTokens(userId);

  // Issue new token pair for the current session
  const tokens = await createTokenPair(user.id, user.email);

  res.json({ success: true, ...tokens });
});
