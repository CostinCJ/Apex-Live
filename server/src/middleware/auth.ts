import type { Request, Response, NextFunction } from 'express';
import { verifyAccessToken, type TokenPayload } from '../services/auth.js';

declare global {
  namespace Express {
    interface Request {
      user?: TokenPayload;
    }
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const header = req.headers.authorization;

  if (!header?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing authorization header' });
    return;
  }

  const token = header.slice(7);

  try {
    req.user = verifyAccessToken(token);
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}

/** Helper to get authenticated user ID — throws if middleware not applied */
export function getUserId(req: Request): string {
  if (!req.user?.sub) {
    throw new Error('requireAuth middleware not applied');
  }
  return req.user.sub;
}
