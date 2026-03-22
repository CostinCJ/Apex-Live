/**
 * HTTP/SSE transport for the MCP server.
 * Runs on port 3002 so OpenClaw (Docker) can reach it via host.docker.internal:3002.
 *
 * Usage: npx tsx src/mcp/http-server.ts
 */

// Suppress Prisma stdout logging for MCP
process.env.MCP_MODE = '1';

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { prisma } from '../config/database.js';
import { registerWorkoutTools } from './tools/workouts.js';
import { registerMetricsTools } from './tools/metrics.js';
import { registerProgressTools } from './tools/progress.js';
import { registerProfileTools } from './tools/profile.js';
import { registerRealtimeTools } from './tools/realtime.js';
import { registerResources } from './resources/index.js';
import express from 'express';

// BigInt serialization
(BigInt.prototype as unknown as { toJSON: () => string }).toJSON = function () {
  return this.toString();
};

const PORT = Number(process.env.MCP_PORT) || 3002;

const mcpServer = new McpServer({
  name: 'apex-fitness',
  version: '1.0.0',
});

// Register all tools & resources
registerWorkoutTools(mcpServer);
registerMetricsTools(mcpServer);
registerProgressTools(mcpServer);
registerProfileTools(mcpServer);
registerRealtimeTools(mcpServer);
registerResources(mcpServer);

const app = express();

app.post('/mcp', async (req, res) => {
  const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
  res.on('close', () => { transport.close(); });
  await mcpServer.connect(transport);
  await transport.handleRequest(req, res, req.body);
});

// Health check
app.get('/mcp', (_req, res) => {
  res.json({ status: 'ok', server: 'apex-fitness', version: '1.0.0' });
});

// DELETE for session cleanup
app.delete('/mcp', async (_req, res) => {
  res.status(200).json({ status: 'session closed' });
});

// ─── REST API for OpenClaw (no auth, local only) ─────────────────────
// These endpoints let OpenClaw query fitness data via curl from inside Docker.

const USER_ID = process.env.APEX_USER_ID ?? '2d6e2520-0d00-4a90-8632-2f8c754d3718';

app.get('/api/workouts', async (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 10, 50);
  const type = req.query.type as string | undefined;
  const where: Record<string, unknown> = { userId: USER_ID, status: 'completed' };
  if (type) where.workoutType = type;
  const workouts = await prisma.workout.findMany({
    where, orderBy: { startedAt: 'desc' }, take: limit,
    select: { id: true, workoutType: true, title: true, startedAt: true, durationSeconds: true, exercises: true, metricsSummary: true },
  });
  res.json(workouts);
});

app.get('/api/records', async (_req, res) => {
  const records = await prisma.personalRecord.findMany({
    where: { userId: USER_ID }, orderBy: { achievedAt: 'desc' },
  });
  res.json(records);
});

app.get('/api/progress', async (req, res) => {
  const exercise = req.query.exercise as string;
  const days = Number(req.query.days) || 90;
  const since = new Date(Date.now() - days * 86400000);
  const workouts = await prisma.workout.findMany({
    where: { userId: USER_ID, status: 'completed', startedAt: { gte: since } },
    orderBy: { startedAt: 'asc' },
    select: { startedAt: true, exercises: true, workoutType: true },
  });
  const progression = workouts.flatMap((w) => {
    const exs = (w.exercises as Array<Record<string, unknown>>) ?? [];
    const ex = exercise ? exs.find((e) => (e.name as string)?.toLowerCase().includes(exercise.toLowerCase())) : null;
    if (exercise && !ex) return [];
    return [{ date: w.startedAt, type: w.workoutType, exercises: exercise ? [ex] : exs }];
  });
  res.json(progression);
});

app.get('/api/summary', async (_req, res) => {
  const since = new Date(Date.now() - 28 * 86400000);
  const summaries = await prisma.dailyWorkoutSummary.findMany({
    where: { userId: USER_ID, date: { gte: since } }, orderBy: { date: 'desc' },
  });
  res.json(summaries);
});

app.get('/api/metrics', async (req, res) => {
  const workoutId = req.query.workoutId as string;
  if (!workoutId) { res.status(400).json({ error: 'workoutId required' }); return; }
  const metrics = await prisma.workoutMetric.findMany({
    where: { workoutId, userId: USER_ID }, orderBy: { recordedAt: 'desc' }, take: 100,
    select: { metricType: true, value: true, unit: true, recordedAt: true },
  });
  res.json(metrics);
});

app.get('/api/profile', async (_req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: USER_ID },
    select: { displayName: true, fitnessLevel: true, heightCm: true, weightKg: true, units: true, preferences: true, voiceSettings: true },
  });
  res.json(user);
});

async function main(): Promise<void> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    console.error('[MCP-HTTP] Database connected');
  } catch (err) {
    console.error('[MCP-HTTP] Database connection failed:', err);
    process.exit(1);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.error(`[MCP-HTTP] Apex Fitness MCP Server listening on http://0.0.0.0:${PORT}/mcp`);
    console.error(`[MCP-HTTP] OpenClaw can reach it at http://host.docker.internal:${PORT}/mcp`);
  });
}

main().catch((err) => {
  console.error('[MCP-HTTP] Fatal error:', err);
  process.exit(1);
});
