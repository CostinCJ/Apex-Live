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

  describe('GET /api/users/me/export (GDPR)', () => {
    it('returns 401 without auth', async () => {
      const res = await fetch(`${API}/api/users/me/export`);
      expect(res.status).toBe(401);
    });

    it('returns user data without passwordHash', async () => {
      const res = await fetch(`${API}/api/users/me/export`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      expect(res.status).toBe(200);
      const body = (await res.json()) as {
        data: {
          user: Record<string, unknown>;
          workouts: unknown[];
          personal_records: unknown[];
          daily_summaries: unknown[];
        };
      };

      // user object must exist and not contain passwordHash
      expect(body.data.user).toBeDefined();
      expect(body.data.user.id).toBe(userId);
      expect(body.data.user.email).toBeDefined();
      expect(body.data.user).not.toHaveProperty('passwordHash');
    });

    it('returns data structure with user, workouts, personal_records, daily_summaries keys', async () => {
      const res = await fetch(`${API}/api/users/me/export`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      expect(res.status).toBe(200);
      const body = (await res.json()) as { data: Record<string, unknown> };

      expect(body.data).toHaveProperty('user');
      expect(body.data).toHaveProperty('workouts');
      expect(body.data).toHaveProperty('personal_records');
      expect(body.data).toHaveProperty('daily_summaries');

      // All collections should be arrays
      expect(Array.isArray(body.data.workouts)).toBe(true);
      expect(Array.isArray(body.data.personal_records)).toBe(true);
      expect(Array.isArray(body.data.daily_summaries)).toBe(true);
    });

    it('includes workouts created by the user', async () => {
      // Create a workout for this user so we can verify export includes it
      const createRes = await fetch(`${API}/api/workouts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ workoutType: 'push', title: 'Export Test Workout' }),
      });
      expect(createRes.status).toBe(201);

      const exportRes = await fetch(`${API}/api/users/me/export`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      expect(exportRes.status).toBe(200);
      const body = (await exportRes.json()) as {
        data: {
          workouts: Array<{ title: string; userId: string }>;
        };
      };

      expect(body.data.workouts.length).toBeGreaterThanOrEqual(1);
      const exportWorkout = body.data.workouts.find((w) => w.title === 'Export Test Workout');
      expect(exportWorkout).toBeDefined();
      expect(exportWorkout!.userId).toBe(userId);
    });
  });
});
