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
    body: JSON.stringify({ email, password: 'TestPass1' }),
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
    // Daily summaries are not auto-generated — just verify the endpoint works
    expect(Array.isArray(body.data)).toBe(true);
  });

  it('DELETE /api/workouts/:id — deletes a workout', async () => {
    // Create a throwaway workout
    const createRes = await fetch(`${API}/api/workouts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ workoutType: 'boxing', title: 'Delete me' }),
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

// ─── Status Transition Validation ────────────────────────────────────

describe('Workout Status Transitions', () => {
  let token = '';

  beforeAll(async () => {
    const user = await createTestUser();
    token = user.accessToken;
  });

  it('PATCH completed -> active returns 400', async () => {
    // Create and complete a workout first
    const createRes = await fetch(`${API}/api/workouts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ workoutType: 'push' }),
    });
    const { data: created } = (await createRes.json()) as { data: { id: string } };

    await fetch(`${API}/api/workouts/${created.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ status: 'completed' }),
    });

    // Now try to transition completed -> active
    const res = await fetch(`${API}/api/workouts/${created.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ status: 'active' }),
    });

    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: string };
    expect(body.error).toContain('Cannot transition');
    expect(body.error).toContain('completed');
    expect(body.error).toContain('active');
  });

  it('PATCH completed -> paused returns 400', async () => {
    const createRes = await fetch(`${API}/api/workouts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ workoutType: 'pull' }),
    });
    const { data: created } = (await createRes.json()) as { data: { id: string } };

    await fetch(`${API}/api/workouts/${created.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ status: 'completed' }),
    });

    const res = await fetch(`${API}/api/workouts/${created.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ status: 'paused' }),
    });

    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: string };
    expect(body.error).toContain('Cannot transition');
    expect(body.error).toContain('completed');
    expect(body.error).toContain('paused');
  });

  it('PATCH active -> paused -> active succeeds', async () => {
    const createRes = await fetch(`${API}/api/workouts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ workoutType: 'legs' }),
    });
    const { data: created } = (await createRes.json()) as { data: { id: string; status: string } };
    expect(created.status).toBe('active');

    // active -> paused
    const pauseRes = await fetch(`${API}/api/workouts/${created.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ status: 'paused' }),
    });
    expect(pauseRes.status).toBe(200);
    const pauseBody = (await pauseRes.json()) as { data: { status: string } };
    expect(pauseBody.data.status).toBe('paused');

    // paused -> active
    const resumeRes = await fetch(`${API}/api/workouts/${created.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ status: 'active' }),
    });
    expect(resumeRes.status).toBe(200);
    const resumeBody = (await resumeRes.json()) as { data: { status: string } };
    expect(resumeBody.data.status).toBe('active');
  });

  it('PATCH abandoned -> active returns 400', async () => {
    const createRes = await fetch(`${API}/api/workouts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ workoutType: 'hiit' }),
    });
    const { data: created } = (await createRes.json()) as { data: { id: string } };

    await fetch(`${API}/api/workouts/${created.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ status: 'abandoned' }),
    });

    const res = await fetch(`${API}/api/workouts/${created.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ status: 'active' }),
    });

    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: string };
    expect(body.error).toContain('Cannot transition');
  });
});

// ─── Personal Record Auto-Detection ─────────────────────────────────

describe('Workout PR Auto-Detection', () => {
  let token = '';

  beforeAll(async () => {
    const user = await createTestUser();
    token = user.accessToken;
  });

  it('auto-creates PRs when a workout with exercises is completed', async () => {
    const exercises = [
      {
        name: 'Bench Press',
        sets: [
          { weight: 100, reps: 8 },
          { weight: 110, reps: 6 },
          { weight: 100, reps: 8 },
        ],
      },
      {
        name: 'Incline Dumbbell Press',
        sets: [
          { weight: 30, reps: 12 },
          { weight: 35, reps: 10 },
        ],
      },
    ];

    // 1. Create a workout with exercises
    const createRes = await fetch(`${API}/api/workouts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ workoutType: 'push', exercises }),
    });
    expect(createRes.status).toBe(201);
    const { data: created } = (await createRes.json()) as { data: { id: string } };

    // 2. Complete the workout with exercises JSON
    const completeRes = await fetch(`${API}/api/workouts/${created.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ status: 'completed', exercises }),
    });
    expect(completeRes.status).toBe(200);

    // 3. Wait for async PR detection (fire-and-forget)
    await new Promise((resolve) => setTimeout(resolve, 500));

    // 4. Check GET /api/progress/records
    const recordsRes = await fetch(`${API}/api/progress/records?limit=100`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(recordsRes.status).toBe(200);
    const { data: records } = (await recordsRes.json()) as {
      data: Array<{
        exerciseName: string;
        recordType: string;
        value: string;
        unit: string;
        workoutId: string;
      }>;
    };

    // Verify Bench Press PRs
    const benchRecords = records.filter((r) => r.exerciseName === 'Bench Press');
    expect(benchRecords.length).toBeGreaterThanOrEqual(3);

    const benchMaxWeight = benchRecords.find((r) => r.recordType === 'max_weight');
    expect(benchMaxWeight).toBeDefined();
    expect(Number(benchMaxWeight!.value)).toBe(110); // heaviest set was 110kg

    const benchMaxReps = benchRecords.find((r) => r.recordType === 'max_reps');
    expect(benchMaxReps).toBeDefined();
    expect(Number(benchMaxReps!.value)).toBe(8); // max reps in any set was 8

    const benchMaxVolume = benchRecords.find((r) => r.recordType === 'max_volume');
    expect(benchMaxVolume).toBeDefined();
    // Max volume per set: max(100*8, 110*6, 100*8) = max(800, 660, 800) = 800
    expect(Number(benchMaxVolume!.value)).toBe(800);

    // Verify Incline Dumbbell Press PRs
    const inclineRecords = records.filter((r) => r.exerciseName === 'Incline Dumbbell Press');
    expect(inclineRecords.length).toBeGreaterThanOrEqual(3);

    const inclineMaxWeight = inclineRecords.find((r) => r.recordType === 'max_weight');
    expect(inclineMaxWeight).toBeDefined();
    expect(Number(inclineMaxWeight!.value)).toBe(35);

    const inclineMaxReps = inclineRecords.find((r) => r.recordType === 'max_reps');
    expect(inclineMaxReps).toBeDefined();
    expect(Number(inclineMaxReps!.value)).toBe(12);

    const inclineMaxVolume = inclineRecords.find((r) => r.recordType === 'max_volume');
    expect(inclineMaxVolume).toBeDefined();
    // Max volume per set: max(30*12, 35*10) = max(360, 350) = 360
    expect(Number(inclineMaxVolume!.value)).toBe(360);

    // Verify correct units
    expect(benchMaxWeight!.unit).toBe('kg');
    expect(benchMaxReps!.unit).toBe('reps');
    expect(benchMaxVolume!.unit).toBe('kg');

    // Verify workoutId is linked
    expect(benchMaxWeight!.workoutId).toBe(created.id);
  });

  it('updates PRs when a new workout beats previous records', async () => {
    // Complete a second workout with heavier bench press
    const exercises = [
      {
        name: 'Bench Press',
        sets: [
          { weight: 120, reps: 5 },
          { weight: 115, reps: 6 },
        ],
      },
    ];

    const createRes = await fetch(`${API}/api/workouts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ workoutType: 'push', exercises }),
    });
    const { data: created } = (await createRes.json()) as { data: { id: string } };

    const completeRes = await fetch(`${API}/api/workouts/${created.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ status: 'completed', exercises }),
    });
    expect(completeRes.status).toBe(200);

    await new Promise((resolve) => setTimeout(resolve, 500));

    const recordsRes = await fetch(`${API}/api/progress/records?limit=100`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const { data: records } = (await recordsRes.json()) as {
      data: Array<{
        exerciseName: string;
        recordType: string;
        value: string;
        previousValue: string | null;
        workoutId: string;
      }>;
    };

    const benchMaxWeight = records.find(
      (r) => r.exerciseName === 'Bench Press' && r.recordType === 'max_weight',
    );
    expect(benchMaxWeight).toBeDefined();
    // New PR: 120 > previous 110
    expect(Number(benchMaxWeight!.value)).toBe(120);
    // previousValue should be the old PR
    expect(Number(benchMaxWeight!.previousValue)).toBe(110);
    expect(benchMaxWeight!.workoutId).toBe(created.id);

    // max_reps should NOT be updated (8 > 6), so it should still point to old workout
    const benchMaxReps = records.find(
      (r) => r.exerciseName === 'Bench Press' && r.recordType === 'max_reps',
    );
    expect(benchMaxReps).toBeDefined();
    expect(Number(benchMaxReps!.value)).toBe(8); // unchanged from first workout
  });

  it('does not create PRs for exercises without sets', async () => {
    const exercises = [
      {
        name: 'Stretching',
        // no sets array
        duration: 300,
      },
    ];

    const createRes = await fetch(`${API}/api/workouts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ workoutType: 'mobility', exercises }),
    });
    const { data: created } = (await createRes.json()) as { data: { id: string } };

    await fetch(`${API}/api/workouts/${created.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ status: 'completed', exercises }),
    });

    await new Promise((resolve) => setTimeout(resolve, 500));

    const recordsRes = await fetch(`${API}/api/progress/records?limit=100`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const { data: records } = (await recordsRes.json()) as {
      data: Array<{ exerciseName: string }>;
    };

    const stretchingRecords = records.filter((r) => r.exerciseName === 'Stretching');
    expect(stretchingRecords.length).toBe(0);
  });
});

// ─── Upsert (PUT) Tests ─────────────────────────────────────────────

describe('Workout Upsert (PUT)', () => {
  let token = '';

  beforeAll(async () => {
    const user = await createTestUser();
    token = user.accessToken;
  });

  it('PUT /api/workouts/:id — creates workout if it does not exist', async () => {
    // Generate a random UUID for a workout that doesn't exist yet
    const newId = crypto.randomUUID();

    const res = await fetch(`${API}/api/workouts/${newId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        workoutType: 'upper',
        title: 'Upserted Upper',
        exercises: [{ name: 'Pull Up', sets: [{ weight: 0, reps: 10 }] }],
      }),
    });

    expect(res.status).toBe(200);
    const body = (await res.json()) as { data: { id: string; title: string; workoutType: string; exercises: unknown[] } };
    expect(body.data.id).toBe(newId);
    expect(body.data.title).toBe('Upserted Upper');
    expect(body.data.workoutType).toBe('upper');

    // Verify it actually exists via GET
    const getRes = await fetch(`${API}/api/workouts/${newId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(getRes.status).toBe(200);
    const getBody = (await getRes.json()) as { data: { id: string } };
    expect(getBody.data.id).toBe(newId);
  });

  it('PUT /api/workouts/:id — updates workout if it already exists', async () => {
    // Create a workout first via POST
    const createRes = await fetch(`${API}/api/workouts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ workoutType: 'lower', title: 'Original Title' }),
    });
    const { data: created } = (await createRes.json()) as { data: { id: string } };

    // Upsert (update) via PUT
    const res = await fetch(`${API}/api/workouts/${created.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        title: 'Updated Title',
        notes: 'Added via upsert',
        status: 'paused',
      }),
    });

    expect(res.status).toBe(200);
    const body = (await res.json()) as { data: { id: string; title: string; notes: string; status: string } };
    expect(body.data.id).toBe(created.id);
    expect(body.data.title).toBe('Updated Title');
    expect(body.data.notes).toBe('Added via upsert');
    expect(body.data.status).toBe('paused');
  });

  it('PUT /api/workouts/:id — defaults to custom workoutType on create', async () => {
    const newId = crypto.randomUUID();

    const res = await fetch(`${API}/api/workouts/${newId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ title: 'No Type Specified' }),
    });

    expect(res.status).toBe(200);
    const body = (await res.json()) as { data: { workoutType: string } };
    expect(body.data.workoutType).toBe('custom');
  });

  it('PUT /api/workouts/:id — rejects invalid body', async () => {
    const newId = crypto.randomUUID();

    const res = await fetch(`${API}/api/workouts/${newId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ workoutType: 'invalid_type' }),
    });

    expect(res.status).toBe(400);
  });
});
