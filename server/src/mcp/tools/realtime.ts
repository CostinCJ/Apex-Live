import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { prisma } from '../../config/database.js';

export function registerRealtimeTools(server: McpServer): void {

  // ── get_active_workout ───────────────────────────────────────────
  server.tool(
    'get_active_workout',
    'Check if the user has an active workout session right now. Returns full workout state with live metrics snapshot if active. Use this to get real-time coaching context from the companion app.',
    {
      userId: z.string().uuid().describe('User ID'),
    },
    async ({ userId }) => {
      const workout = await prisma.workout.findFirst({
        where: { userId, status: { in: ['active', 'paused'] } },
        orderBy: { startedAt: 'desc' },
      });

      if (!workout) {
        return { content: [{ type: 'text', text: JSON.stringify({ active: false }) }] };
      }

      // Get last 30 seconds of live metrics
      const since = new Date(Date.now() - 30_000);
      const liveMetrics = await prisma.workoutMetric.findMany({
        where: { workoutId: workout.id, userId, recordedAt: { gte: since } },
        orderBy: { recordedAt: 'desc' },
        select: { metricType: true, value: true, unit: true, recordedAt: true },
      });

      // Latest per metric type
      const latestByType: Record<string, { value: number; unit: string | null; at: string }> = {};
      for (const m of liveMetrics) {
        if (!latestByType[m.metricType]) {
          latestByType[m.metricType] = {
            value: Number(m.value),
            unit: m.unit,
            at: m.recordedAt.toISOString(),
          };
        }
      }

      const elapsedSeconds = Math.floor((Date.now() - new Date(workout.startedAt).getTime()) / 1000);
      const exercises = (workout.exercises as Array<Record<string, unknown>>) ?? [];
      const currentExercise = exercises[exercises.length - 1];

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            active: true,
            workoutId: workout.id,
            workoutType: workout.workoutType,
            status: workout.status,
            startedAt: workout.startedAt,
            elapsedSeconds,
            exercises: exercises.map((e) => ({
              name: e.name,
              setsCompleted: ((e.sets as unknown[]) ?? []).length,
            })),
            currentExercise: currentExercise ? {
              name: currentExercise.name,
              setsCompleted: ((currentExercise.sets as unknown[]) ?? []).length,
            } : null,
            liveMetrics: latestByType,
          }),
        }],
      };
    },
  );

  // ── get_coaching_context ─────────────────────────────────────────
  server.tool(
    'get_coaching_context',
    'Get comprehensive coaching context for an active workout: current state, live metrics, and previous session data for comparison. This is the primary tool for real-time AI coaching via OpenClaw.',
    {
      userId: z.string().uuid().describe('User ID'),
      workoutId: z.string().uuid().describe('Active workout ID'),
    },
    async ({ userId, workoutId }) => {
      const workout = await prisma.workout.findFirst({
        where: { id: workoutId, userId },
      });
      if (!workout) {
        return { content: [{ type: 'text', text: 'Error: Workout not found' }], isError: true };
      }

      // Get live metrics (last 30s)
      const since = new Date(Date.now() - 30_000);
      const liveMetrics = await prisma.workoutMetric.findMany({
        where: { workoutId, userId, recordedAt: { gte: since } },
        orderBy: { recordedAt: 'desc' },
        select: { metricType: true, value: true, recordedAt: true },
      });

      const latestByType: Record<string, number> = {};
      for (const m of liveMetrics) {
        if (!latestByType[m.metricType]) {
          latestByType[m.metricType] = Number(m.value);
        }
      }

      // Get previous workout of same type
      const previousWorkout = await prisma.workout.findFirst({
        where: {
          userId,
          workoutType: workout.workoutType,
          status: 'completed',
          id: { not: workoutId },
        },
        orderBy: { startedAt: 'desc' },
        select: { exercises: true, metricsSummary: true, durationSeconds: true, startedAt: true },
      });

      // Get PRs for exercises in this workout
      const exercises = (workout.exercises as Array<Record<string, unknown>>) ?? [];
      const exerciseNames = exercises.map((e) => e.name as string).filter(Boolean);
      const prs = exerciseNames.length > 0
        ? await prisma.personalRecord.findMany({
            where: { userId, exerciseName: { in: exerciseNames } },
          })
        : [];

      const elapsedSeconds = Math.floor((Date.now() - new Date(workout.startedAt).getTime()) / 1000);

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            workout: {
              id: workout.id,
              type: workout.workoutType,
              status: workout.status,
              elapsedSeconds,
              exercises,
            },
            liveMetrics: latestByType,
            previousSession: previousWorkout ? {
              date: previousWorkout.startedAt,
              exercises: previousWorkout.exercises,
              summary: previousWorkout.metricsSummary,
              duration: previousWorkout.durationSeconds,
            } : null,
            personalRecords: prs.map((pr) => ({
              exercise: pr.exerciseName,
              type: pr.recordType,
              value: Number(pr.value),
              unit: pr.unit,
            })),
          }),
        }],
      };
    },
  );
}
