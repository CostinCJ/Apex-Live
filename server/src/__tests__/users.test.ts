/**
 * Integration tests for the users API endpoints.
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
  const body = (await res.json()) as { accessToken: string; refreshToken: string; user: { id: string; email: string } };
  return { email, password, ...body };
}

describe('Users API', () => {
  let token = '';
  let userId = '';

  beforeAll(async () => {
    const user = await createTestUser();
    token = user.accessToken;
    userId = user.user.id;
  });

  describe('GET /api/users/me', () => {
    it('returns 401 without auth', async () => {
      const res = await fetch(`${API}/api/users/me`);
      expect(res.status).toBe(401);
    });

    it('returns user profile without passwordHash', async () => {
      const res = await fetch(`${API}/api/users/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      expect(res.status).toBe(200);
      const body = (await res.json()) as { data: Record<string, unknown> };
      expect(body.data.id).toBe(userId);
      expect(body.data.email).toBeDefined();
      expect(body.data).not.toHaveProperty('passwordHash');
    });
  });

  describe('PATCH /api/users/me', () => {
    it('returns 401 without auth', async () => {
      const res = await fetch(`${API}/api/users/me`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ displayName: 'Test' }),
      });
      expect(res.status).toBe(401);
    });

    it('updates displayName', async () => {
      const res = await fetch(`${API}/api/users/me`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ displayName: 'New Name' }),
      });
      expect(res.status).toBe(200);
      const body = (await res.json()) as { data: { displayName: string } };
      expect(body.data.displayName).toBe('New Name');
    });

    it('updates fitnessLevel', async () => {
      const res = await fetch(`${API}/api/users/me`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ fitnessLevel: 'advanced' }),
      });
      expect(res.status).toBe(200);
      const body = (await res.json()) as { data: { fitnessLevel: string } };
      expect(body.data.fitnessLevel).toBe('advanced');
    });

    it('rejects invalid fitnessLevel', async () => {
      const res = await fetch(`${API}/api/users/me`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ fitnessLevel: 'superhero' }),
      });
      expect(res.status).toBe(400);
    });

    it('rejects invalid units', async () => {
      const res = await fetch(`${API}/api/users/me`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ units: 'stones' }),
      });
      expect(res.status).toBe(400);
    });

    it('updates multiple fields', async () => {
      const res = await fetch(`${API}/api/users/me`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ units: 'metric', timezone: 'Europe/London', heightCm: 180, weightKg: 80 }),
      });
      expect(res.status).toBe(200);
      const body = (await res.json()) as { data: Record<string, unknown> };
      expect(body.data.units).toBe('metric');
      expect(body.data.timezone).toBe('Europe/London');
    });
  });

  describe('DELETE /api/users/me', () => {
    it('returns 401 without auth', async () => {
      const res = await fetch(`${API}/api/users/me`, { method: 'DELETE' });
      expect(res.status).toBe(401);
    });

    it('deletes account and invalidates token', async () => {
      // Create a disposable user for deletion
      const disposable = await createTestUser();

      const res = await fetch(`${API}/api/users/me`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${disposable.accessToken}` },
      });
      expect(res.status).toBe(200);

      // Token should no longer work
      const check = await fetch(`${API}/api/users/me`, {
        headers: { Authorization: `Bearer ${disposable.accessToken}` },
      });
      expect([401, 404]).toContain(check.status);
    });
  });
});
