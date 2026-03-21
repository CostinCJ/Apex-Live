// BigInt JSON serialization (Prisma returns BigInt for autoincrement IDs)
(BigInt.prototype as unknown as { toJSON: () => string }).toJSON = function () {
  return this.toString();
};

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { createServer } from 'node:http';
import { env } from './config/env.js';
import { requestId } from './middleware/requestId.js';
import { rateLimit } from './middleware/rateLimit.js';
import { errorHandler } from './middleware/errorHandler.js';
import { authRouter } from './routes/auth.js';
import { workoutsRouter } from './routes/workouts.js';
import { metricsRouter } from './routes/metrics.js';
import { conversationsRouter } from './routes/conversations.js';
import { progressRouter } from './routes/progress.js';
import { usersRouter } from './routes/users.js';
import { aiProxyRouter } from './routes/aiProxy.js';
import { subscriptionsRouter } from './routes/subscriptions.js';
import { legalRouter } from './routes/legal.js';
import { initRealtime, realtimeService } from './services/realtime.js';
import { prisma } from './config/database.js';
import { startScheduler, stopScheduler } from './services/scheduler.js';

const app = express();

// Trust first proxy (required for correct req.ip behind load balancers)
app.set('trust proxy', 1);

// ─── Middleware ──────────────────────────────────────────────────────

app.use(requestId);
app.use(helmet());
app.use(cors({ origin: env.CORS_ORIGIN, credentials: true }));
app.use(express.json({ limit: '2mb' }));

// Global API rate limiter: 100 requests per minute per IP
const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  message: 'Too many requests, please slow down.',
});
app.use('/api', apiLimiter);

// ─── Health check ───────────────────────────────────────────────────

app.get('/health', async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  } catch {
    res.status(503).json({ status: 'unhealthy', timestamp: new Date().toISOString() });
  }
});

// ─── Routes ─────────────────────────────────────────────────────────

app.use('/api/auth', authRouter);
app.use('/api/workouts', workoutsRouter);
app.use('/api/metrics', metricsRouter);
app.use('/api/conversations', conversationsRouter);
app.use('/api/progress', progressRouter);
app.use('/api/users', usersRouter);
app.use('/api/ai', aiProxyRouter);
app.use('/api/subscriptions', subscriptionsRouter);

// ─── Legal pages ────────────────────────────────────────────────────

app.use('/legal', legalRouter);

// ─── Error handler (must be last) ───────────────────────────────────

app.use(errorHandler);

// ─── Start server ───────────────────────────────────────────────────

const server = createServer(app);

// WebSocket for realtime updates (replaces Supabase Realtime)
initRealtime(server);

server.listen(env.PORT, () => {
  console.error(`Apex API server running on port ${env.PORT}`);
  console.error(`WebSocket available at ws://localhost:${env.PORT}/ws`);
  startScheduler();
});

// ─── Graceful shutdown ─────────────────────────────────────────────

function shutdown() {
  console.error('Shutting down gracefully...');
  stopScheduler();
  server.close(async () => {
    realtimeService?.close();
    await prisma.$disconnect();
    process.exit(0);
  });
  // Force exit after 10s if graceful shutdown fails
  const forceTimer = setTimeout(() => process.exit(0), 10_000);
  forceTimer.unref();
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

export default app;
