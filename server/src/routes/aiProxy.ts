import { Router, type Request, type Response } from 'express';
import { requireAuth, getUserId } from '../middleware/auth.js';
import { env } from '../config/env.js';

export const aiProxyRouter = Router();
aiProxyRouter.use(requireAuth);

const RATE_LIMIT_MAX = 5;
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 hour

// In-memory rate limiter (use Redis in production)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(userId);

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(userId, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }

  if (entry.count >= RATE_LIMIT_MAX) return false;

  entry.count += 1;
  return true;
}

// ─── Create ephemeral OpenAI Realtime session ───────────────────────

aiProxyRouter.post('/session', async (req: Request, res: Response) => {
  const userId = getUserId(req);

  if (!checkRateLimit(userId)) {
    res.status(429).json({ error: 'Rate limit exceeded. Max 5 sessions per hour.' });
    return;
  }

  const ALLOWED_MODELS = ['gpt-4o-realtime-preview', 'gpt-4o-realtime-preview-2024-12-17', 'gpt-4o-mini-realtime-preview-2024-12-17'];
  const ALLOWED_VOICES = ['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer'];

  const rawModel = String((req.body as Record<string, unknown>).model ?? 'gpt-4o-realtime-preview');
  const rawVoice = String((req.body as Record<string, unknown>).voice ?? 'alloy');

  if (!ALLOWED_MODELS.includes(rawModel)) {
    res.status(400).json({ error: `Invalid model. Allowed: ${ALLOWED_MODELS.join(', ')}` });
    return;
  }
  if (!ALLOWED_VOICES.includes(rawVoice)) {
    res.status(400).json({ error: `Invalid voice. Allowed: ${ALLOWED_VOICES.join(', ')}` });
    return;
  }

  const model = rawModel;
  const voice = rawVoice;

  const sessionResponse = await fetch('https://api.openai.com/v1/realtime/sessions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      voice,
      input_audio_format: 'pcm16',
      output_audio_format: 'pcm16',
      input_audio_transcription: { model: 'whisper-1' },
      turn_detection: {
        type: 'server_vad',
        threshold: 0.5,
        prefix_padding_ms: 300,
        silence_duration_ms: 500,
      },
    }),
  });

  if (!sessionResponse.ok) {
    const errorText = await sessionResponse.text();
    console.error('OpenAI session error:', errorText);
    res.status(502).json({ error: 'Failed to create voice session' });
    return;
  }

  const sessionData = await sessionResponse.json() as Record<string, unknown>;
  const clientSecret = sessionData.client_secret as Record<string, unknown> | undefined;

  res.json({
    url: `wss://api.openai.com/v1/realtime?model=${model as string}`,
    token: clientSecret?.value ?? sessionData.token,
    expires_at: clientSecret?.expires_at ?? sessionData.expires_at,
    session_id: sessionData.id,
  });
});
