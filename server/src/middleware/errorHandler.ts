import type { Request, Response, NextFunction } from 'express';

/** Map known Prisma error codes to HTTP responses */
function handlePrismaError(err: unknown): { status: number; message: string } | null {
  const code = (err as { code?: string }).code;
  if (!code) return null;

  switch (code) {
    case 'P2025': // Record not found
      return { status: 404, message: 'Resource not found' };
    case 'P2002': // Unique constraint violation
      return { status: 409, message: 'Resource already exists' };
    case 'P2003': // Foreign key constraint violation
      return { status: 400, message: 'Referenced resource does not exist' };
    case 'P2023': // Inconsistent column data (e.g., invalid UUID)
      return { status: 400, message: 'Invalid ID format' };
    default:
      return null;
  }
}

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction): void {
  console.error('Unhandled error:', err);

  if (err instanceof SyntaxError && 'body' in err) {
    res.status(400).json({ error: 'Invalid JSON' });
    return;
  }

  // Handle known Prisma errors with proper HTTP status codes
  const prismaError = handlePrismaError(err);
  if (prismaError) {
    res.status(prismaError.status).json({ error: prismaError.message });
    return;
  }

  const message = err instanceof Error ? err.message : 'Internal server error';
  const status = (err as { status?: number }).status ?? 500;

  res.status(status).json({
    error: process.env.NODE_ENV === 'production' ? 'Internal server error' : message,
  });
}
