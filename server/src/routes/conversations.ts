import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import { prisma } from '../config/database.js';
import { requireAuth, getUserId } from '../middleware/auth.js';
import { uuidParam } from '../middleware/params.js';

export const conversationsRouter = Router();
conversationsRouter.use(requireAuth);

const createConversationSchema = z.object({
  workoutId: z.string().uuid().nullable().optional(),
  title: z.string().optional(),
  startedAt: z.string().datetime().optional(),
  endedAt: z.string().datetime().nullable().optional(),
  messageCount: z.number().int().optional(),
});

const createMessagesSchema = z.object({
  messages: z.array(z.object({
    role: z.enum(['user', 'assistant', 'system']),
    content: z.string(),
    audioDurationMs: z.number().int().nullable().optional(),
    metadata: z.record(z.string(), z.unknown()).optional(),
  })).min(1),
});

// ─── Create conversation ────────────────────────────────────────────

conversationsRouter.post('/', async (req: Request, res: Response) => {
  const parsed = createConversationSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten().fieldErrors });
    return;
  }

  const conversation = await prisma.coachConversation.create({
    data: {
      userId: getUserId(req),
      workoutId: parsed.data.workoutId ?? null,
      title: parsed.data.title,
      startedAt: parsed.data.startedAt ? new Date(parsed.data.startedAt) : new Date(),
      endedAt: parsed.data.endedAt ? new Date(parsed.data.endedAt) : null,
      messageCount: parsed.data.messageCount ?? 0,
    },
  });

  res.status(201).json({ data: conversation });
});

// ─── Add messages to conversation ───────────────────────────────────

conversationsRouter.post('/:id/messages', async (req: Request, res: Response) => {
  const parsed = createMessagesSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten().fieldErrors });
    return;
  }

  const conversationId = uuidParam(req, res, 'id');
  if (!conversationId) return;

  const userId = getUserId(req);

  // Verify ownership
  const conversation = await prisma.coachConversation.findFirst({
    where: { id: conversationId, userId },
  });
  if (!conversation) {
    res.status(404).json({ error: 'Conversation not found' });
    return;
  }

  const rows = parsed.data.messages.map((m) => ({
    conversationId,
    role: m.role as import('@prisma/client').ConversationRole,
    content: m.content,
    audioDurationMs: m.audioDurationMs ?? null,
    metadata: (m.metadata ?? undefined) as import('@prisma/client').Prisma.InputJsonValue | undefined,
  }));

  await prisma.coachMessage.createMany({ data: rows });

  // Update message count
  await prisma.coachConversation.update({
    where: { id: conversationId },
    data: { messageCount: { increment: rows.length } },
  });

  res.status(201).json({ success: true, inserted: rows.length });
});

// ─── List conversations ─────────────────────────────────────────────

conversationsRouter.get('/', async (req: Request, res: Response) => {
  const offset = Number(req.query.offset) || 0;
  const limit = Math.min(Number(req.query.limit) || 50, 100);

  const data = await prisma.coachConversation.findMany({
    where: { userId: getUserId(req) },
    orderBy: { startedAt: 'desc' },
    skip: offset,
    take: limit,
  });

  res.json({ data });
});

// ─── Get conversation with messages ─────────────────────────────────

conversationsRouter.get('/:id', async (req: Request, res: Response) => {
  const id = uuidParam(req, res, 'id');
  if (!id) return;

  const conversation = await prisma.coachConversation.findFirst({
    where: { id, userId: getUserId(req) },
    include: {
      messages: { orderBy: { createdAt: 'asc' } },
    },
  });

  if (!conversation) {
    res.status(404).json({ error: 'Conversation not found' });
    return;
  }

  res.json({ data: conversation });
});
