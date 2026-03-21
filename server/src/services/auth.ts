import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import { prisma } from '../config/database.js';
import { env } from '../config/env.js';

export interface TokenPayload {
  sub: string;  // user id
  email: string;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

const SALT_ROUNDS = 12;

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function signAccessToken(payload: TokenPayload): string {
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, {
    algorithm: 'HS256',
    expiresIn: env.JWT_ACCESS_EXPIRES_IN as string & jwt.SignOptions['expiresIn'],
  });
}

export function verifyAccessToken(token: string): TokenPayload {
  return jwt.verify(token, env.JWT_ACCESS_SECRET, {
    algorithms: ['HS256'],
  }) as TokenPayload;
}

/** Hash a refresh token before DB storage to protect against DB compromise */
function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export async function createTokenPair(userId: string, email: string): Promise<TokenPair> {
  const payload: TokenPayload = { sub: userId, email };
  const accessToken = signAccessToken(payload);

  // Create opaque refresh token stored in DB
  const rawToken = crypto.randomBytes(48).toString('hex');
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 30); // 30 days

  await prisma.refreshToken.create({
    data: {
      userId,
      token: hashToken(rawToken),
      expiresAt,
    },
  });

  return {
    accessToken,
    refreshToken: rawToken,
    expiresIn: 3600, // 1h in seconds
  };
}

export async function rotateRefreshToken(oldToken: string): Promise<TokenPair | null> {
  const hashedToken = hashToken(oldToken);

  // Use a serializable transaction to prevent TOCTOU race on concurrent refresh requests
  const result = await prisma.$transaction(async (tx) => {
    const stored = await tx.refreshToken.findUnique({ where: { token: hashedToken } });

    if (!stored) return null;

    if (stored.expiresAt < new Date()) {
      // Expired token reuse — revoke all tokens for this user (theft detection)
      await tx.refreshToken.deleteMany({ where: { userId: stored.userId } });
      return null;
    }

    // Delete the old token atomically (single-use enforcement)
    await tx.refreshToken.delete({ where: { id: stored.id } });

    return { userId: stored.userId };
  });

  if (!result) return null;

  const user = await prisma.user.findUnique({ where: { id: result.userId } });
  if (!user) return null;

  return createTokenPair(user.id, user.email);
}

export async function revokeAllUserTokens(userId: string): Promise<void> {
  await prisma.refreshToken.deleteMany({ where: { userId } });
}
