import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { Prisma } from '@prisma/client';
import { prisma } from '../../config/database.js';

type JsonValue = Prisma.InputJsonValue;

const WORKOUT_TYPES = [
  'push', 'pull', 'legs', 'upper', 'lower', 'full_body',
  'hiit', 'cardio_run', 'cardio_cycle', 'cardio_row',
  'boxing', 'mobility', 'custom',
] as const;

const VALID_TRANSITIONS: Record<string, string[]> = {
  active: ['paused', 'completed', 'abandoned'],
  paused: ['active', 'completed', 'abandoned'],
};

// ─── PR Detection (salvaged from workouts.ts) ──────────────────────

async function detectPersonalRecords(workoutId: string, userId: string): Promise<string[]> {
  const workout = await prisma.workout.findUnique({
    where: { id: workoutId },
    select: { exercises: true, workoutType: true },
  });
  if (!workout?.exercises || !Array.isArray(workout.exercises)) return [];

  const candidates: Array<{
    exerciseName: string;
    recordType: string;
    value: number;
    unit: string;
  }> = [];

  for (const exercise of workout.exercises as Array<Record<string, unknown>>) {
    const name = exercise.name as string | undefined;
    if (!name) continue;
    const sets = exercise.sets as Array<Record<string, unknown>> | undefined;
    if (!sets?.length) continue;

    let maxWeight = 0;
    let maxReps = 0;
    let maxVolume = 0;

    for (const set of sets) {
      const weight = Number(set.weight ?? 0);
      const reps = Number(set.reps ?? 0);
      if (weight > maxWeight) maxWeight = weight;
      if (reps > maxReps) maxReps = reps;
      const volume = weight * reps;
      if (volume > maxVolume) maxVolume = volume;
    }

    if (maxWeight > 0) candidates.push({ exerciseName: name, recordType: 'max_weight', value: maxWeight, unit: 'kg' });
    if (maxReps > 0) candidates.push({ exerciseName: name, recordType: 'max_reps', value: maxReps, unit: 'reps' });
    if (maxVolume > 0) candidates.push({ exerciseName: name, recordType: 'max_volume', value: maxVolume, unit: 'kg' });
  }

  if (candidates.length === 0) return [];

  const exerciseNames = [...new Set(candidates.map((c) => c.exerciseName))];
  const existingRecords = await prisma.personalRecord.findMany({
    where: { userId, exerciseName: { in: exerciseNames } },
  });

  const existingMap = new Map(
    existingRecords.map((r) => [`${r.exerciseName}|${r.recordType}`, r]),
  );

  const newPRs: string[] = [];
  const upsertOps = candidates
    .filter((c) => {
      const existing = existingMap.get(`${c.exerciseName}|${c.recordType}`);
      return !existing || Number(existing.value) < c.value;
    })
    .map((c) => {
      const existing = existingMap.get(`${c.exerciseName}|${c.recordType}`);
      newPRs.push(`${c.exerciseName} ${c.recordType}: ${c.value} ${c.unit}`);
      return prisma.personalRecord.upsert({
        where: { userId_exerciseName_recordType: { userId, exerciseName: c.exerciseName, recordType: c.recordType } },
        create: {
          userId, exerciseName: c.exerciseName, recordType: c.recordType,
          value: c.value, unit: c.unit, workoutId,
          previousValue: existing ? existing.value : null,
        },
        update: {
          value: c.value, previousValue: existing?.value ?? null,
          workoutId, achievedAt: new Date(),
        },
      });
    });

  if (upsertOps.length > 0) {
    await prisma.$transaction(upsertOps);
  }

  return newPRs;
}

// ─── Register workout tools ────────────────────────────────────────

export function registerWorkoutTools(server: McpServer): void {

  // ── start_workout ────────────────────────────────────────────────
  server.tool(
    'start_workout',
    'Start a new workout session. Returns the workout ID to use for logging sets.',
    {
      userId: z.string().uuid().describe('User ID'),
      workoutType: z.enum(WORKOUT_TYPES).describe('Type of workout'),
      title: z.string().optional().describe('Optional workout title'),
    },
    async ({ userId, workoutType, title }) => {
      const workout = await prisma.workout.create({
        data: { userId, workoutType, title },
      });
      return {
        content: [{ type: 'text', text: JSON.stringify({ workoutId: workout.id, status: workout.status, startedAt: workout.startedAt }) }],
      };
    },
  );

  // ── log_set ──────────────────────────────────────────────────────
  server.tool(
    'log_set',
    'Log a single set for an exercise in an active workout. Optimized for quick mid-workout logging.',
    {
      userId: z.string().uuid().describe('User ID'),
      workoutId: z.string().uuid().describe('Active workout ID'),
      exercise: z.string().describe('Exercise name (e.g. "Bench Press", "Squat")'),
      weight: z.number().min(0).describe('Weight used (in user units)'),
      reps: z.number().int().min(0).describe('Number of reps completed'),
      rpe: z.number().min(1).max(10).optional().describe('Rate of Perceived Exertion (1-10)'),
      notes: z.string().optional().describe('Optional notes for this set'),
    },
    async ({ userId, workoutId, exercise, weight, reps, rpe, notes }) => {
      const workout = await prisma.workout.findFirst({
        where: { id: workoutId, userId, status: { in: ['active', 'paused'] } },
      });
      if (!workout) {
        return { content: [{ type: 'text', text: 'Error: Workout not found or not active' }], isError: true };
      }

      // Update exercises JSON array
      const exercises = (workout.exercises as Array<Record<string, unknown>>) ?? [];
      let exerciseEntry = exercises.find((e) => e.name === exercise);
      if (!exerciseEntry) {
        exerciseEntry = { name: exercise, sets: [] };
        exercises.push(exerciseEntry);
      }
      const sets = (exerciseEntry.sets as Array<Record<string, unknown>>) ?? [];
      const setNumber = sets.length + 1;
      sets.push({ setNumber, weight, reps, rpe: rpe ?? null, notes: notes ?? null, loggedAt: new Date().toISOString() });
      exerciseEntry.sets = sets;

      await prisma.workout.update({
        where: { id: workoutId },
        data: { exercises: exercises as JsonValue },
      });

      const totalSets = exercises.reduce((sum, e) => sum + ((e.sets as unknown[]) ?? []).length, 0);

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            logged: { exercise, set: setNumber, weight, reps, rpe },
            totalExercises: exercises.length,
            totalSets,
          }),
        }],
      };
    },
  );

  // ── complete_workout ─────────────────────────────────────────────
  server.tool(
    'complete_workout',
    'Complete a workout session. Auto-calculates duration and detects new personal records.',
    {
      userId: z.string().uuid().describe('User ID'),
      workoutId: z.string().uuid().describe('Workout ID to complete'),
      notes: z.string().optional().describe('Post-workout notes'),
    },
    async ({ userId, workoutId, notes }) => {
      const workout = await prisma.workout.findFirst({
        where: { id: workoutId, userId, status: { in: ['active', 'paused'] } },
      });
      if (!workout) {
        return { content: [{ type: 'text', text: 'Error: Workout not found or already completed' }], isError: true };
      }

      const completedAt = new Date();
      const durationSeconds = Math.floor((completedAt.getTime() - new Date(workout.startedAt).getTime()) / 1000);

      // Compute summary
      const exercises = (workout.exercises as Array<Record<string, unknown>>) ?? [];
      let totalVolume = 0;
      let totalReps = 0;
      let totalSets = 0;
      for (const ex of exercises) {
        const sets = (ex.sets as Array<Record<string, unknown>>) ?? [];
        totalSets += sets.length;
        for (const s of sets) {
          const w = Number(s.weight ?? 0);
          const r = Number(s.reps ?? 0);
          totalReps += r;
          totalVolume += w * r;
        }
      }

      const metricsSummary = { totalVolume, totalReps, totalSets, exerciseCount: exercises.length };

      const updated = await prisma.workout.update({
        where: { id: workoutId },
        data: {
          status: 'completed',
          completedAt,
          durationSeconds,
          notes: notes ?? workout.notes,
          metricsSummary: metricsSummary as JsonValue,
        },
      });

      // Detect PRs
      const newPRs = await detectPersonalRecords(workoutId, userId);

      // Update daily summary
      const dateStr = completedAt.toISOString().split('T')[0]!;
      await prisma.dailyWorkoutSummary.upsert({
        where: { userId_date: { userId, date: new Date(dateStr) } },
        create: {
          userId, date: new Date(dateStr),
          workoutCount: 1, totalDuration: durationSeconds,
          totalVolume, workoutTypes: [updated.workoutType],
        },
        update: {
          workoutCount: { increment: 1 },
          totalDuration: { increment: durationSeconds },
          totalVolume: { increment: totalVolume },
        },
      });

      const mins = Math.floor(durationSeconds / 60);
      const secs = durationSeconds % 60;

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            status: 'completed',
            duration: `${mins}m ${secs}s`,
            summary: metricsSummary,
            newPersonalRecords: newPRs,
            exerciseBreakdown: exercises.map((e) => ({
              name: e.name,
              sets: ((e.sets as unknown[]) ?? []).length,
            })),
          }),
        }],
      };
    },
  );

  // ── update_workout ───────────────────────────────────────────────
  server.tool(
    'update_workout',
    'Update a workout status (pause, resume, abandon) or modify exercises.',
    {
      userId: z.string().uuid().describe('User ID'),
      workoutId: z.string().uuid().describe('Workout ID'),
      status: z.enum(['active', 'paused', 'completed', 'abandoned']).optional(),
      title: z.string().optional(),
      notes: z.string().optional(),
    },
    async ({ userId, workoutId, status, title, notes }) => {
      const workout = await prisma.workout.findFirst({ where: { id: workoutId, userId } });
      if (!workout) {
        return { content: [{ type: 'text', text: 'Error: Workout not found' }], isError: true };
      }

      if (status && status !== workout.status) {
        const allowed = VALID_TRANSITIONS[workout.status] ?? [];
        if (!allowed.includes(status)) {
          return { content: [{ type: 'text', text: `Error: Cannot transition from '${workout.status}' to '${status}'` }], isError: true };
        }
      }

      const data: Record<string, unknown> = {};
      if (status) data.status = status;
      if (title) data.title = title;
      if (notes) data.notes = notes;
      if (status === 'abandoned') data.completedAt = new Date();

      const updated = await prisma.workout.update({ where: { id: workoutId }, data });
      return {
        content: [{ type: 'text', text: JSON.stringify({ id: updated.id, status: updated.status }) }],
      };
    },
  );

  // ── list_workouts ────────────────────────────────────────────────
  server.tool(
    'list_workouts',
    'List workout history for a user with optional filters.',
    {
      userId: z.string().uuid().describe('User ID'),
      workoutType: z.enum(WORKOUT_TYPES).optional().describe('Filter by workout type'),
      status: z.enum(['active', 'paused', 'completed', 'abandoned']).optional(),
      limit: z.number().min(1).max(50).default(10),
      since: z.string().optional().describe('ISO date string to filter workouts after this date'),
    },
    async ({ userId, workoutType, status, limit, since }) => {
      const where: Record<string, unknown> = { userId };
      if (workoutType) where.workoutType = workoutType;
      if (status) where.status = status;
      if (since) where.startedAt = { gte: new Date(since) };

      const [workouts, total] = await Promise.all([
        prisma.workout.findMany({
          where,
          orderBy: { startedAt: 'desc' },
          take: limit,
          select: {
            id: true, workoutType: true, status: true, title: true,
            startedAt: true, completedAt: true, durationSeconds: true,
            exercises: true, metricsSummary: true, notes: true,
          },
        }),
        prisma.workout.count({ where }),
      ]);

      return {
        content: [{ type: 'text', text: JSON.stringify({ workouts, total }) }],
      };
    },
  );

  // ── get_workout ──────────────────────────────────────────────────
  server.tool(
    'get_workout',
    'Get full details of a specific workout including all exercises and sets.',
    {
      userId: z.string().uuid().describe('User ID'),
      workoutId: z.string().uuid().describe('Workout ID'),
    },
    async ({ userId, workoutId }) => {
      const workout = await prisma.workout.findFirst({
        where: { id: workoutId, userId },
      });
      if (!workout) {
        return { content: [{ type: 'text', text: 'Error: Workout not found' }], isError: true };
      }
      return {
        content: [{ type: 'text', text: JSON.stringify(workout) }],
      };
    },
  );

  // ── delete_workout ───────────────────────────────────────────────
  server.tool(
    'delete_workout',
    'Permanently delete a workout and all associated data.',
    {
      userId: z.string().uuid().describe('User ID'),
      workoutId: z.string().uuid().describe('Workout ID'),
    },
    async ({ userId, workoutId }) => {
      const workout = await prisma.workout.findFirst({ where: { id: workoutId, userId } });
      if (!workout) {
        return { content: [{ type: 'text', text: 'Error: Workout not found' }], isError: true };
      }
      await prisma.workout.delete({ where: { id: workoutId } });
      return { content: [{ type: 'text', text: JSON.stringify({ deleted: true, workoutId }) }] };
    },
  );
}
