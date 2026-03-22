import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { prisma } from '../../config/database.js';

const WORKOUT_TYPES = [
  'push', 'pull', 'legs', 'upper', 'lower', 'full_body',
  'hiit', 'cardio_run', 'cardio_cycle', 'cardio_row',
  'boxing', 'mobility', 'custom',
] as const;

export function registerProgressTools(server: McpServer): void {

  // ── get_personal_records ─────────────────────────────────────────
  server.tool(
    'get_personal_records',
    'Get all personal records, optionally filtered by exercise name. Shows current PRs with previous values for tracking progressive overload.',
    {
      userId: z.string().uuid().describe('User ID'),
      exerciseName: z.string().optional().describe('Filter by specific exercise'),
      limit: z.number().min(1).max(100).default(50),
    },
    async ({ userId, exerciseName, limit }) => {
      const where: Record<string, unknown> = { userId };
      if (exerciseName) where.exerciseName = exerciseName;

      const records = await prisma.personalRecord.findMany({
        where,
        orderBy: { achievedAt: 'desc' },
        take: limit,
      });

      return {
        content: [{ type: 'text', text: JSON.stringify({ records, count: records.length }) }],
      };
    },
  );

  // ── get_exercise_progress ────────────────────────────────────────
  server.tool(
    'get_exercise_progress',
    'Get the progression history for a specific exercise over time. Shows how weight, reps, and volume have changed across workouts.',
    {
      userId: z.string().uuid().describe('User ID'),
      exerciseName: z.string().describe('Exercise name to track (e.g. "Bench Press")'),
      days: z.number().min(1).max(365).default(90).describe('Look back N days'),
    },
    async ({ userId, exerciseName, days }) => {
      const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

      const workouts = await prisma.workout.findMany({
        where: {
          userId,
          status: 'completed',
          startedAt: { gte: since },
        },
        orderBy: { startedAt: 'asc' },
        select: { id: true, startedAt: true, exercises: true, workoutType: true },
      });

      // Extract the target exercise from each workout
      const progression: Array<{
        date: string;
        workoutType: string;
        bestWeight: number;
        bestReps: number;
        totalVolume: number;
        totalSets: number;
      }> = [];

      for (const w of workouts) {
        const exercises = (w.exercises as Array<Record<string, unknown>>) ?? [];
        const ex = exercises.find(
          (e) => (e.name as string)?.toLowerCase() === exerciseName.toLowerCase(),
        );
        if (!ex) continue;

        const sets = (ex.sets as Array<Record<string, unknown>>) ?? [];
        let bestWeight = 0;
        let bestReps = 0;
        let totalVolume = 0;

        for (const s of sets) {
          const weight = Number(s.weight ?? 0);
          const reps = Number(s.reps ?? 0);
          if (weight > bestWeight) bestWeight = weight;
          if (reps > bestReps) bestReps = reps;
          totalVolume += weight * reps;
        }

        progression.push({
          date: w.startedAt.toISOString().split('T')[0]!,
          workoutType: w.workoutType,
          bestWeight,
          bestReps,
          totalVolume,
          totalSets: sets.length,
        });
      }

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            exercise: exerciseName,
            period: `${days} days`,
            dataPoints: progression.length,
            progression,
          }),
        }],
      };
    },
  );

  // ── get_previous_workout ─────────────────────────────────────────
  server.tool(
    'get_previous_workout',
    'Get the most recent completed workout of a given type. Essential for session-over-session comparison and progressive overload coaching.',
    {
      userId: z.string().uuid().describe('User ID'),
      workoutType: z.enum(WORKOUT_TYPES).describe('Workout type to find'),
      excludeId: z.string().uuid().optional().describe('Exclude this workout ID (current session)'),
    },
    async ({ userId, workoutType, excludeId }) => {
      const where: Record<string, unknown> = {
        userId, workoutType, status: 'completed',
      };
      if (excludeId) where.id = { not: excludeId };

      const workout = await prisma.workout.findFirst({
        where,
        orderBy: { startedAt: 'desc' },
        select: {
          id: true, startedAt: true, completedAt: true,
          durationSeconds: true, exercises: true, metricsSummary: true,
        },
      });

      if (!workout) {
        return { content: [{ type: 'text', text: JSON.stringify({ found: false, message: 'No previous workout of this type' }) }] };
      }

      return {
        content: [{ type: 'text', text: JSON.stringify({ found: true, workout }) }],
      };
    },
  );

  // ── get_weekly_summary ───────────────────────────────────────────
  server.tool(
    'get_weekly_summary',
    'Get a summary of workouts for the past N weeks. Includes workout count, total volume, duration, and workout types.',
    {
      userId: z.string().uuid().describe('User ID'),
      weeks: z.number().min(1).max(52).default(4).describe('Number of weeks to summarize'),
    },
    async ({ userId, weeks }) => {
      const since = new Date(Date.now() - weeks * 7 * 24 * 60 * 60 * 1000);

      const summaries = await prisma.dailyWorkoutSummary.findMany({
        where: { userId, date: { gte: since } },
        orderBy: { date: 'desc' },
      });

      // Aggregate by week
      const weeklyData: Record<string, {
        workouts: number;
        duration: number;
        volume: number;
        types: string[];
      }> = {};

      for (const s of summaries) {
        const d = new Date(s.date);
        const weekStart = new Date(d);
        weekStart.setDate(d.getDate() - d.getDay());
        const key = weekStart.toISOString().split('T')[0]!;

        if (!weeklyData[key]) {
          weeklyData[key] = { workouts: 0, duration: 0, volume: 0, types: [] };
        }
        const w = weeklyData[key]!;
        w.workouts += s.workoutCount;
        w.duration += s.totalDuration;
        w.volume += Number(s.totalVolume);
        const types = s.workoutTypes as string[];
        if (Array.isArray(types)) w.types.push(...types);
      }

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            period: `${weeks} weeks`,
            weeklySummaries: weeklyData,
            totalWorkouts: summaries.reduce((sum, s) => sum + s.workoutCount, 0),
          }),
        }],
      };
    },
  );
}
