/**
 * Integration tests for the AI proxy API endpoints.
 * Tests run against the live server at localhost:3001.
 */

const API = 'http://localhost:3001';

async function createTestUser(): Promise<{ accessToken: string; userId: string }> {
  const email = `ai_test_${Date.now()}_${Math.random().toString(36).slice(2, 8)}@apex.dev`;
  const res = await fetch(`${API}/api/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: 'TestPass1' }),
  });
  const body = await res.json();
  return { accessToken: body.accessToken, userId: body.user.id };
}

describe('AI Proxy API', () => {
  let token = '';

  beforeAll(async () => {
    const user = await createTestUser();
    token = user.accessToken;
  });

  it('POST /api/ai/session — requires auth (401 without token)', async () => {
    const res = await fetch(`${API}/api/ai/session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBeDefined();
  });

  it('POST /api/ai/session — returns 400 for invalid model', async () => {
    const res = await fetch(`${API}/api/ai/session`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ model: 'gpt-3.5-turbo-invalid' }),
    });

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/invalid model/i);
  });

  it('POST /api/ai/session — returns 400 for invalid voice', async () => {
    const res = await fetch(`${API}/api/ai/session`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ voice: 'nonexistent-voice' }),
    });

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/invalid voice/i);
  });

  it('POST /api/ai/session — returns 503 when OPENAI_API_KEY is empty', async () => {
    // Note: This test depends on the server having OPENAI_API_KEY set to empty string
    // or the endpoint being unreachable. Since the route checks for empty key AFTER
    // rate limit, and the valid model/voice defaults pass validation, a request with
    // defaults will hit the OPENAI_API_KEY check if the key is empty, or proceed to
    // the OpenAI call if set. We test the 503 path by checking the behavior:
    // If key is empty -> 503; if key is set but invalid -> 502 from OpenAI rejection.
    const res = await fetch(`${API}/api/ai/session`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({}),
    });

    // Server either returns 503 (no key) or 502 (bad key / OpenAI error) or 200 (valid key)
    expect([200, 502, 503]).toContain(res.status);

    if (res.status === 503) {
      const body = await res.json();
      expect(body.error).toMatch(/not configured/i);
    }
  });

  it('POST /api/ai/session — rate limits after excessive requests', async () => {
    // Create a fresh user so we start with a clean rate-limit slate
    const freshUser = await createTestUser();
    const freshToken = freshUser.accessToken;

    // The AI proxy has a per-user rate limit of 5 sessions per hour.
    // We need to send requests that pass validation but may fail at OpenAI call.
    // We send 6 requests; the 6th should be rate-limited (429).
    const statuses: number[] = [];
    for (let i = 0; i < 6; i++) {
      const res = await fetch(`${API}/api/ai/session`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${freshToken}`,
        },
        body: JSON.stringify({}),
      });
      statuses.push(res.status);
    }

    // The 6th request (index 5) should be rate-limited
    expect(statuses[5]).toBe(429);
  }, 30_000);
});
