// BigInt JSON serialization (Prisma returns BigInt for autoincrement IDs)
(BigInt.prototype as unknown as { toJSON: () => string }).toJSON = function () {
  return this.toString();
};

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { createServer } from 'node:http';
import { env } from './config/env.js';
import { errorHandler } from './middleware/errorHandler.js';
import { authRouter } from './routes/auth.js';
import { workoutsRouter } from './routes/workouts.js';
import { metricsRouter } from './routes/metrics.js';
import { conversationsRouter } from './routes/conversations.js';
import { progressRouter } from './routes/progress.js';
import { usersRouter } from './routes/users.js';
import { aiProxyRouter } from './routes/aiProxy.js';
import { initRealtime } from './services/realtime.js';

const app = express();

// ─── Middleware ──────────────────────────────────────────────────────

app.use(helmet());
app.use(cors({ origin: env.CORS_ORIGIN, credentials: true }));
app.use(express.json({ limit: '2mb' }));

// ─── Health check ───────────────────────────────────────────────────

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ─── Routes ─────────────────────────────────────────────────────────

app.use('/api/auth', authRouter);
app.use('/api/workouts', workoutsRouter);
app.use('/api/metrics', metricsRouter);
app.use('/api/conversations', conversationsRouter);
app.use('/api/progress', progressRouter);
app.use('/api/users', usersRouter);
app.use('/api/ai', aiProxyRouter);

// ─── Error handler (must be last) ───────────────────────────────────

app.use(errorHandler);

// ─── Start server ───────────────────────────────────────────────────

const server = createServer(app);

// WebSocket for realtime updates (replaces Supabase Realtime)
initRealtime(server);

server.listen(env.PORT, () => {
  console.log(`Apex API server running on port ${env.PORT}`);
  console.log(`WebSocket available at ws://localhost:${env.PORT}/ws`);
});

export default app;
