/**
 * Integration tests for the workouts API.
 * Tests run against the live server at localhost:3001.
 */

const API = 'http://localhost:3001';

async function createTestUser(): Promise<{ accessToken: string; userId: string }> {
  const email = `workout_test_${Date.now()}_${Math.random().toString(36).slice(2, 8)}@apex.dev`;
  const res = await fetch(`${API}/api/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: 'testpass123' }),
  });
  const body = await res.json();
  return { accessToken: body.accessToken, userId: body.user.id };
}

describe('Workouts API', () => {
  let token = '';
  let workoutId = '';

  beforeAll(async () => {
    const user = await createTestUser();
    token = user.accessToken;
  });

  it('POST /api/workouts — creates a workout', async () => {
    const res = await fetch(`${API}/api/workouts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ workoutType: 'push', title: 'Test Push Day' }),
    });

    expect(res.status).toBe(201);
    const body = await res.json();
    workoutId = body.data.id;
    expect(body.data.workoutType).toBe('push');
    expect(body.data.title).toBe('Test Push Day');
    expect(body.data.status).toBe('active');
  });

  it('GET /api/workouts — lists workouts', async () => {
    const res = await fetch(`${API}/api/workouts`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.length).toBeGreaterThanOrEqual(1);
  });

  it('GET /api/workouts/:id — returns single workout', async () => {
    const res = await fetch(`${API}/api/workouts/${workoutId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.id).toBe(workoutId);
  });

  it('PATCH /api/workouts/:id — completes a workout', async () => {
    const res = await fetch(`${API}/api/workouts/${workoutId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        status: 'completed',
        durationSeconds: 2700,
        metricsSummary: { total_calories: 280, avg_heart_rate: 140 },
      }),
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.status).toBe('completed');
    expect(body.data.durationSeconds).toBe(2700);
  });

  it('GET /api/workouts?status=completed — filters by status', async () => {
    const res = await fetch(`${API}/api/workouts?status=completed`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.every((w: { status: string }) => w.status === 'completed')).toBe(true);
  });

  it('POST /api/metrics/batch — inserts workout metrics', async () => {
    const res = await fetch(`${API}/api/metrics/batch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        metrics: [
          { workoutId, metricType: 'heart_rate', value: 145, unit: 'bpm' },
          { workoutId, metricType: 'heart_rate', value: 152, unit: 'bpm' },
          { workoutId, metricType: 'calories', value: 280, unit: 'kcal' },
        ],
      }),
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.inserted).toBe(3);
  });

  it('GET /api/metrics/workout/:workoutId — returns metrics', async () => {
    const res = await fetch(`${API}/api/metrics/workout/${workoutId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.length).toBe(3);
  });

  it('GET /api/progress/summaries — returns daily summaries', async () => {
    const res = await fetch(`${API}/api/progress/summaries?since=2020-01-01`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    // The completed workout should have triggered a daily summary
    expect(body.data.length).toBeGreaterThanOrEqual(1);
  });

  it('DELETE /api/workouts/:id — deletes a workout', async () => {
    // Create a throwaway workout
    const createRes = await fetch(`${API}/api/workouts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ workoutType: 'yoga', title: 'Delete me' }),
    });
    const { data } = await createRes.json();

    const res = await fetch(`${API}/api/workouts/${data.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });

    expect(res.status).toBe(200);

    // Verify it's gone
    const getRes = await fetch(`${API}/api/workouts/${data.id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(getRes.status).toBe(404);
  });

  it('GET /api/workouts/:id — rejects access from other users', async () => {
    const otherUser = await createTestUser();
    const res = await fetch(`${API}/api/workouts/${workoutId}`, {
      headers: { Authorization: `Bearer ${otherUser.accessToken}` },
    });

    expect(res.status).toBe(404); // Not found (not 403) to avoid leaking existence
  });
});
