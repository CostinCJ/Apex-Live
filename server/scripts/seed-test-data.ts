import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({ log: ['error'] });

async function seed() {
  // Create or find test user
  let user = await prisma.user.findUnique({ where: { email: 'costin@apex.dev' } });
  if (!user) {
    user = await prisma.user.create({
      data: {
        email: 'costin@apex.dev',
        passwordHash: '$2b$12$placeholder.hash.for.testing.only',
        emailVerified: true,
        displayName: 'Costin',
        fitnessLevel: 'intermediate',
        heightCm: 180,
        weightKg: 85,
        units: 'metric',
        preferences: {
          units: 'metric',
          weekly_goal_days: 5,
          preferred_workout_types: ['push', 'pull', 'legs'],
          rest_day_reminders: true,
        },
        voiceSettings: {
          voice_id: 'default',
          speed: 1.0,
          coaching_style: 'motivational',
          verbosity: 'moderate',
          language: 'en-US',
        },
      },
    });
    console.log('Created user:', user.id);
  } else {
    console.log('User exists:', user.id);
  }

  const userId = user.id;

  // ── Workout 1: Push day (5 days ago, completed) ──────────────
  const pushDate = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000);
  const push = await prisma.workout.create({
    data: {
      userId,
      workoutType: 'push',
      status: 'completed',
      title: 'Push Day - Chest & Triceps',
      startedAt: pushDate,
      completedAt: new Date(pushDate.getTime() + 55 * 60 * 1000),
      durationSeconds: 55 * 60,
      exercises: [
        {
          name: 'Bench Press',
          sets: [
            { setNumber: 1, weight: 100, reps: 8, rpe: 7 },
            { setNumber: 2, weight: 100, reps: 8, rpe: 8 },
            { setNumber: 3, weight: 100, reps: 7, rpe: 9 },
            { setNumber: 4, weight: 100, reps: 6, rpe: 9.5 },
          ],
        },
        {
          name: 'Incline Dumbbell Press',
          sets: [
            { setNumber: 1, weight: 36, reps: 10, rpe: 7 },
            { setNumber: 2, weight: 36, reps: 9, rpe: 8 },
            { setNumber: 3, weight: 36, reps: 8, rpe: 9 },
          ],
        },
        {
          name: 'Overhead Press',
          sets: [
            { setNumber: 1, weight: 60, reps: 8, rpe: 7 },
            { setNumber: 2, weight: 60, reps: 7, rpe: 8 },
            { setNumber: 3, weight: 60, reps: 6, rpe: 9 },
          ],
        },
        {
          name: 'Tricep Pushdown',
          sets: [
            { setNumber: 1, weight: 30, reps: 12, rpe: 7 },
            { setNumber: 2, weight: 30, reps: 12, rpe: 8 },
            { setNumber: 3, weight: 30, reps: 10, rpe: 9 },
          ],
        },
        {
          name: 'Lateral Raise',
          sets: [
            { setNumber: 1, weight: 14, reps: 15, rpe: 7 },
            { setNumber: 2, weight: 14, reps: 12, rpe: 8 },
            { setNumber: 3, weight: 14, reps: 12, rpe: 9 },
          ],
        },
      ],
      metricsSummary: {
        totalVolume: 7926,
        totalReps: 132,
        totalSets: 16,
        exerciseCount: 5,
      },
    },
  });
  console.log('Created push workout:', push.id);

  // ── Workout 2: Pull day (3 days ago, completed) ──────────────
  const pullDate = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
  const pull = await prisma.workout.create({
    data: {
      userId,
      workoutType: 'pull',
      status: 'completed',
      title: 'Pull Day - Back & Biceps',
      startedAt: pullDate,
      completedAt: new Date(pullDate.getTime() + 60 * 60 * 1000),
      durationSeconds: 60 * 60,
      exercises: [
        {
          name: 'Deadlift',
          sets: [
            { setNumber: 1, weight: 140, reps: 5, rpe: 7 },
            { setNumber: 2, weight: 140, reps: 5, rpe: 8 },
            { setNumber: 3, weight: 140, reps: 4, rpe: 9 },
          ],
        },
        {
          name: 'Barbell Row',
          sets: [
            { setNumber: 1, weight: 80, reps: 8, rpe: 7 },
            { setNumber: 2, weight: 80, reps: 8, rpe: 8 },
            { setNumber: 3, weight: 80, reps: 7, rpe: 9 },
          ],
        },
        {
          name: 'Pull-Ups',
          sets: [
            { setNumber: 1, weight: 0, reps: 10, rpe: 7 },
            { setNumber: 2, weight: 0, reps: 9, rpe: 8 },
            { setNumber: 3, weight: 0, reps: 8, rpe: 9 },
          ],
        },
        {
          name: 'Bicep Curl',
          sets: [
            { setNumber: 1, weight: 16, reps: 12, rpe: 7 },
            { setNumber: 2, weight: 16, reps: 10, rpe: 8 },
            { setNumber: 3, weight: 16, reps: 10, rpe: 9 },
          ],
        },
      ],
      metricsSummary: {
        totalVolume: 4392,
        totalReps: 96,
        totalSets: 12,
        exerciseCount: 4,
      },
    },
  });
  console.log('Created pull workout:', pull.id);

  // ── Workout 3: Legs (yesterday, completed) ───────────────────
  const legsDate = new Date(Date.now() - 1 * 24 * 60 * 60 * 1000);
  const legs = await prisma.workout.create({
    data: {
      userId,
      workoutType: 'legs',
      status: 'completed',
      title: 'Leg Day',
      startedAt: legsDate,
      completedAt: new Date(legsDate.getTime() + 50 * 60 * 1000),
      durationSeconds: 50 * 60,
      exercises: [
        {
          name: 'Squat',
          sets: [
            { setNumber: 1, weight: 120, reps: 5, rpe: 7 },
            { setNumber: 2, weight: 120, reps: 5, rpe: 8 },
            { setNumber: 3, weight: 120, reps: 5, rpe: 8.5 },
            { setNumber: 4, weight: 120, reps: 4, rpe: 9 },
          ],
        },
        {
          name: 'Romanian Deadlift',
          sets: [
            { setNumber: 1, weight: 100, reps: 8, rpe: 7 },
            { setNumber: 2, weight: 100, reps: 8, rpe: 8 },
            { setNumber: 3, weight: 100, reps: 7, rpe: 9 },
          ],
        },
        {
          name: 'Leg Press',
          sets: [
            { setNumber: 1, weight: 200, reps: 10, rpe: 7 },
            { setNumber: 2, weight: 200, reps: 10, rpe: 8 },
            { setNumber: 3, weight: 200, reps: 8, rpe: 9 },
          ],
        },
        {
          name: 'Calf Raise',
          sets: [
            { setNumber: 1, weight: 80, reps: 15, rpe: 7 },
            { setNumber: 2, weight: 80, reps: 12, rpe: 8 },
            { setNumber: 3, weight: 80, reps: 12, rpe: 9 },
          ],
        },
      ],
      metricsSummary: {
        totalVolume: 12980,
        totalReps: 107,
        totalSets: 13,
        exerciseCount: 4,
      },
    },
  });
  console.log('Created legs workout:', legs.id);

  // ── Personal Records ─────────────────────────────────────────
  const prData = [
    { exerciseName: 'Bench Press', recordType: 'max_weight', value: 100, unit: 'kg', workoutId: push.id },
    { exerciseName: 'Bench Press', recordType: 'max_reps', value: 8, unit: 'reps', workoutId: push.id },
    { exerciseName: 'Bench Press', recordType: 'max_volume', value: 800, unit: 'kg', workoutId: push.id },
    { exerciseName: 'Deadlift', recordType: 'max_weight', value: 140, unit: 'kg', workoutId: pull.id },
    { exerciseName: 'Squat', recordType: 'max_weight', value: 120, unit: 'kg', workoutId: legs.id },
    { exerciseName: 'Squat', recordType: 'max_volume', value: 600, unit: 'kg', workoutId: legs.id },
    { exerciseName: 'Overhead Press', recordType: 'max_weight', value: 60, unit: 'kg', workoutId: push.id },
  ];

  for (const pr of prData) {
    await prisma.personalRecord.create({
      data: { userId, ...pr },
    });
  }
  console.log('Created', prData.length, 'personal records');

  // ── Daily Summaries ──────────────────────────────────────────
  const summaries = [
    { date: pushDate, workoutCount: 1, totalDuration: 55 * 60, totalVolume: 7926, workoutTypes: ['push'] },
    { date: pullDate, workoutCount: 1, totalDuration: 60 * 60, totalVolume: 4392, workoutTypes: ['pull'] },
    { date: legsDate, workoutCount: 1, totalDuration: 50 * 60, totalVolume: 12980, workoutTypes: ['legs'] },
  ];

  for (const s of summaries) {
    const dateOnly = new Date(s.date.toISOString().split('T')[0]!);
    await prisma.dailyWorkoutSummary.upsert({
      where: { userId_date: { userId, date: dateOnly } },
      create: {
        userId,
        date: dateOnly,
        workoutCount: s.workoutCount,
        totalDuration: s.totalDuration,
        totalVolume: s.totalVolume,
        workoutTypes: s.workoutTypes,
      },
      update: {},
    });
  }
  console.log('Created', summaries.length, 'daily summaries');

  // ── Some workout metrics (simulated heart rate data for legs day) ──
  const metricsToCreate = [];
  for (let i = 0; i < 50; i++) {
    const recordedAt = new Date(legsDate.getTime() + i * 60 * 1000); // 1 per minute
    metricsToCreate.push({
      workoutId: legs.id,
      userId,
      metricType: 'heart_rate' as const,
      value: 80 + Math.floor(Math.random() * 60), // 80-140 BPM
      unit: 'bpm',
      recordedAt,
    });
    if (i % 5 === 0) {
      metricsToCreate.push({
        workoutId: legs.id,
        userId,
        metricType: 'calories' as const,
        value: Math.floor(i * 8.5),
        unit: 'kcal',
        recordedAt,
      });
    }
  }
  await prisma.workoutMetric.createMany({ data: metricsToCreate });
  console.log('Created', metricsToCreate.length, 'workout metrics');

  console.log('\n=== SEED COMPLETE ===');
  console.log('User ID:', userId);
  console.log('Copy this ID to test in MCP Inspector!');

  await prisma.$disconnect();
}

seed().catch((e) => {
  console.error(e);
  process.exit(1);
});
