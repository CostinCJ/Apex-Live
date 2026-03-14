/**
 * Integration tests for the conversations API endpoints.
 * Tests run against the live server at localhost:3001.
 */

const API = 'http://localhost:3001';

function randomEmail(): string {
  return `test_${Date.now()}_${Math.random().toString(36).slice(2, 8)}@apex.dev`;
}

async function createTestUser() {
  const email = randomEmail();
  const password = 'TestPass1';
  const res = await fetch(`${API}/api/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const body = (await res.json()) as { accessToken: string; user: { id: string } };
  return { email, token: body.accessToken, userId: body.user.id };
}

describe('Conversations API', () => {
  let token = '';
  let conversationId = '';

  beforeAll(async () => {
    const user = await createTestUser();
    token = user.token;
  });

  describe('POST /api/conversations', () => {
    it('returns 401 without auth', async () => {
      const res = await fetch(`${API}/api/conversations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      expect(res.status).toBe(401);
    });

    it('creates a conversation', async () => {
      const res = await fetch(`${API}/api/conversations`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'Workout chat' }),
      });
      expect(res.status).toBe(201);
      const body = (await res.json()) as { data: { id: string; title: string } };
      expect(body.data.id).toBeDefined();
      expect(body.data.title).toBe('Workout chat');
      conversationId = body.data.id;
    });
  });

  describe('POST /api/conversations/:id/messages', () => {
    it('returns 401 without auth', async () => {
      const res = await fetch(`${API}/api/conversations/${conversationId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: [{ role: 'user', content: 'Hi' }] }),
      });
      expect(res.status).toBe(401);
    });

    it('adds messages', async () => {
      const res = await fetch(`${API}/api/conversations/${conversationId}/messages`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [
            { role: 'user', content: 'How many sets left?' },
            { role: 'assistant', content: 'You have 2 sets remaining.' },
          ],
        }),
      });
      expect(res.status).toBe(201);
      const body = (await res.json()) as { inserted: number };
      expect(body.inserted).toBe(2);
    });

    it('rejects empty messages array', async () => {
      const res = await fetch(`${API}/api/conversations/${conversationId}/messages`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: [] }),
      });
      expect(res.status).toBe(400);
    });

    it('returns 404 for nonexistent conversation', async () => {
      const res = await fetch(`${API}/api/conversations/00000000-0000-0000-0000-000000000000/messages`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: [{ role: 'user', content: 'test' }] }),
      });
      expect(res.status).toBe(404);
    });
  });

  describe('GET /api/conversations', () => {
    it('lists conversations', async () => {
      const res = await fetch(`${API}/api/conversations`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      expect(res.status).toBe(200);
      const body = (await res.json()) as { data: unknown[] };
      expect(body.data.length).toBeGreaterThanOrEqual(1);
    });

    it('other user sees empty list', async () => {
      const other = await createTestUser();
      const res = await fetch(`${API}/api/conversations`, {
        headers: { Authorization: `Bearer ${other.token}` },
      });
      expect(res.status).toBe(200);
      const body = (await res.json()) as { data: unknown[] };
      expect(body.data).toHaveLength(0);
    });
  });

  describe('GET /api/conversations/:id', () => {
    it('returns conversation with messages', async () => {
      const res = await fetch(`${API}/api/conversations/${conversationId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      expect(res.status).toBe(200);
      const body = (await res.json()) as { data: { messages: unknown[] } };
      expect(body.data.messages.length).toBeGreaterThanOrEqual(2);
    });

    it('returns 404 for other user', async () => {
      const other = await createTestUser();
      const res = await fetch(`${API}/api/conversations/${conversationId}`, {
        headers: { Authorization: `Bearer ${other.token}` },
      });
      expect(res.status).toBe(404);
    });
  });
});
