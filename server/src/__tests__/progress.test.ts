/**
 * Integration tests for the progress API endpoints.
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

describe('Progress API', () => {
  let token = '';

  beforeAll(async () => {
    const user = await createTestUser();
    token = user.token;
  });

  describe('GET /api/progress/summaries', () => {
    it('returns 401 without auth', async () => {
      const res = await fetch(`${API}/api/progress/summaries`);
      expect(res.status).toBe(401);
    });

    it('returns array (empty for new user)', async () => {
      const res = await fetch(`${API}/api/progress/summaries`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      expect(res.status).toBe(200);
      const body = (await res.json()) as { data: unknown[] };
      expect(Array.isArray(body.data)).toBe(true);
    });
  });

  describe('GET /api/progress/records', () => {
    it('returns 401 without auth', async () => {
      const res = await fetch(`${API}/api/progress/records`);
      expect(res.status).toBe(401);
    });

    it('returns array', async () => {
      const res = await fetch(`${API}/api/progress/records`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      expect(res.status).toBe(200);
      const body = (await res.json()) as { data: unknown[] };
      expect(Array.isArray(body.data)).toBe(true);
    });

    it('respects limit param', async () => {
      const res = await fetch(`${API}/api/progress/records?limit=5`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      expect(res.status).toBe(200);
      const body = (await res.json()) as { data: unknown[] };
      expect(body.data.length).toBeLessThanOrEqual(5);
    });
  });

  describe('GET /api/progress/previous-workout', () => {
    it('returns 401 without auth', async () => {
      const res = await fetch(`${API}/api/progress/previous-workout?workoutType=push`);
      expect(res.status).toBe(401);
    });

    it('returns 400 without workoutType', async () => {
      const res = await fetch(`${API}/api/progress/previous-workout`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      expect(res.status).toBe(400);
    });

    it('returns null for nonexistent type', async () => {
      const res = await fetch(`${API}/api/progress/previous-workout?workoutType=push`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      expect(res.status).toBe(200);
      const body = (await res.json()) as { data: unknown };
      expect(body.data).toBeNull();
    });
  });

  describe('GET /api/progress/compare', () => {
    it('returns 401 without auth', async () => {
      const res = await fetch(`${API}/api/progress/compare?currentId=a&previousId=b&metric=heart_rate`);
      expect(res.status).toBe(401);
    });

    it('returns 400 without required params', async () => {
      const res = await fetch(`${API}/api/progress/compare`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      expect(res.status).toBe(400);
    });
  });
});
