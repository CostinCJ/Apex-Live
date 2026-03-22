import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { prisma } from '../../config/database.js';

export function registerResources(server: McpServer): void {

  // ── Fitness schema reference ─────────────────────────────────────
  server.resource(
    'fitness-schema',
    'fitness://schema',
    { description: 'Database schema and available data types for the fitness tracking system', mimeType: 'text/plain' },
    async () => ({
      contents: [{
        uri: 'fitness://schema',
        mimeType: 'text/plain',
        text: `Apex Fitness Data Schema
========================

Workout Types: push, pull, legs, upper, lower, full_body, hiit, cardio_run, cardio_cycle, cardio_row, boxing, mobility, custom
Workout Statuses: active, paused, completed, abandoned
Metric Types: heart_rate, calories, distance, pace, speed, cadence, power, elevation, rep_count, weight, rpe

Tables:
- workouts: id, userId, workoutType, status, title, startedAt, completedAt, durationSeconds, exercises (JSON array), metricsSummary (JSON), notes
- workout_metrics: id (BigInt), workoutId, userId, metricType, value, unit, recordedAt, metadata — time-series data from wearables
- personal_records: id, userId, exerciseName, recordType (max_weight|max_reps|max_volume), value, unit, previousValue, achievedAt
- daily_workout_summaries: id, userId, date, workoutCount, totalDuration, totalCalories, totalVolume, workoutTypes
- users: id, email, fitnessLevel, heightCm, weightKg, units, preferences (JSON), voiceSettings (JSON)

Exercise JSON structure (inside workout.exercises):
[{ name: "Bench Press", sets: [{ setNumber: 1, weight: 100, reps: 8, rpe: 7 }, ...] }]

Real-time data flow:
Companion App (phone) → reads wearable sensors (Apple Watch, Polar, etc.) → pushes metrics via API → stored in workout_metrics → available via get_live_metrics and get_coaching_context tools
`,
      }],
    }),
  );

  // ── Exercise catalog ─────────────────────────────────────────────
  server.resource(
    'exercise-catalog',
    'fitness://exercises',
    { description: 'Common exercise names and categories for consistent logging', mimeType: 'text/plain' },
    async () => ({
      contents: [{
        uri: 'fitness://exercises',
        mimeType: 'text/plain',
        text: `Common Exercises by Workout Type
=================================

PUSH: Bench Press, Incline Bench Press, Overhead Press, Dumbbell Press, Dips, Tricep Pushdown, Lateral Raise, Cable Fly, Push-Ups
PULL: Deadlift, Barbell Row, Pull-Ups, Chin-Ups, Lat Pulldown, Cable Row, Face Pull, Bicep Curl, Hammer Curl
LEGS: Squat, Front Squat, Leg Press, Romanian Deadlift, Leg Extension, Leg Curl, Calf Raise, Bulgarian Split Squat, Hip Thrust
UPPER: Bench Press, Overhead Press, Barbell Row, Pull-Ups, Dumbbell Curl, Tricep Extension, Lateral Raise
LOWER: Squat, Deadlift, Leg Press, Romanian Deadlift, Calf Raise, Hip Thrust, Lunges
FULL_BODY: Clean and Press, Thruster, Burpees, Turkish Get-Up, Farmer's Walk
HIIT: Burpees, Box Jumps, Kettlebell Swings, Battle Ropes, Mountain Climbers
CARDIO: Running, Cycling, Rowing, Swimming, Jump Rope, Elliptical
BOXING: Heavy Bag, Speed Bag, Shadow Boxing, Pad Work, Jump Rope
MOBILITY: Foam Rolling, Stretching, Yoga, Band Work

PR Record Types: max_weight (heaviest single set), max_reps (most reps in a set), max_volume (highest weight x reps in a set)
`,
      }],
    }),
  );

  // ── User profile resource template (dynamic) ────────────────────
  server.resource(
    'user-profile',
    'fitness://profile/{userId}',
    { description: 'User fitness profile and recent training context', mimeType: 'application/json' },
    async (uri) => {
      const userId = uri.pathname.split('/').pop();
      if (!userId) {
        return { contents: [{ uri: uri.href, mimeType: 'text/plain', text: 'Error: userId required' }] };
      }

      const [user, recentWorkouts, prs] = await Promise.all([
        prisma.user.findUnique({
          where: { id: userId },
          select: {
            displayName: true, fitnessLevel: true,
            heightCm: true, weightKg: true, units: true,
            preferences: true, voiceSettings: true,
          },
        }),
        prisma.workout.findMany({
          where: { userId, status: 'completed' },
          orderBy: { startedAt: 'desc' },
          take: 5,
          select: {
            workoutType: true, startedAt: true, durationSeconds: true,
            metricsSummary: true, exercises: true,
          },
        }),
        prisma.personalRecord.findMany({
          where: { userId },
          orderBy: { achievedAt: 'desc' },
          take: 20,
        }),
      ]);

      return {
        contents: [{
          uri: uri.href,
          mimeType: 'application/json',
          text: JSON.stringify({ profile: user, recentWorkouts, personalRecords: prs }, null, 2),
        }],
      };
    },
  );
}
