/**
 * Integration tests for the metrics API endpoints.
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

async function createWorkout(token: string) {
  const res = await fetch(`${API}/api/workouts`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ workoutType: 'push' }),
  });
  const body = (await res.json()) as { data: { id: string } };
  return body.data.id;
}

describe('Metrics API', () => {
  let token = '';
  let workoutId = '';

  beforeAll(async () => {
    const user = await createTestUser();
    token = user.token;
    workoutId = await createWorkout(token);
  });

  describe('POST /api/metrics', () => {
    it('returns 401 without auth', async () => {
      const res = await fetch(`${API}/api/metrics`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workoutId, metricType: 'heart_rate', value: 140 }),
      });
      expect(res.status).toBe(401);
    });

    it('creates a single metric', async () => {
      const res = await fetch(`${API}/api/metrics`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ workoutId, metricType: 'heart_rate', value: 142 }),
      });
      expect(res.status).toBe(201);
      const body = (await res.json()) as { data: { metricType: string; value: number } };
      expect(body.data.metricType).toBe('heart_rate');
    });

    it('rejects invalid metricType', async () => {
      const res = await fetch(`${API}/api/metrics`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ workoutId, metricType: 'invalid_type', value: 100 }),
      });
      expect(res.status).toBe(400);
    });

    it('returns 404 for other user workout', async () => {
      const other = await createTestUser();
      const res = await fetch(`${API}/api/metrics`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${other.token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ workoutId, metricType: 'heart_rate', value: 100 }),
      });
      expect(res.status).toBe(404);
    });
  });

  describe('POST /api/metrics/batch', () => {
    it('inserts batch of metrics', async () => {
      const res = await fetch(`${API}/api/metrics/batch`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          metrics: [
            { workoutId, metricType: 'heart_rate', value: 150 },
            { workoutId, metricType: 'calories', value: 200 },
          ],
        }),
      });
      expect(res.status).toBe(200);
      const body = (await res.json()) as { inserted: number };
      expect(body.inserted).toBe(2);
    });

    it('rejects empty batch', async () => {
      const res = await fetch(`${API}/api/metrics/batch`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ metrics: [] }),
      });
      expect(res.status).toBe(400);
    });

    it('rejects unauthorized workoutId', async () => {
      const other = await createTestUser();
      const res = await fetch(`${API}/api/metrics/batch`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${other.token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          metrics: [{ workoutId, metricType: 'heart_rate', value: 100 }],
        }),
      });
      expect(res.status).toBe(403);
    });
  });

  describe('GET /api/metrics/workout/:workoutId', () => {
    it('returns 401 without auth', async () => {
      const res = await fetch(`${API}/api/metrics/workout/${workoutId}`);
      expect(res.status).toBe(401);
    });

    it('returns metrics for workout', async () => {
      const res = await fetch(`${API}/api/metrics/workout/${workoutId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      expect(res.status).toBe(200);
      const body = (await res.json()) as { data: unknown[] };
      expect(body.data.length).toBeGreaterThanOrEqual(3);
    });

    it('filters by type', async () => {
      const res = await fetch(`${API}/api/metrics/workout/${workoutId}?type=calories`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      expect(res.status).toBe(200);
      const body = (await res.json()) as { data: Array<{ metricType: string }> };
      for (const m of body.data) {
        expect(m.metricType).toBe('calories');
      }
    });
  });
});
