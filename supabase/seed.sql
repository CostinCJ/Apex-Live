-- ============================================================
-- Seed Data for Local Development
-- ============================================================
-- This file creates a test user and sample workout data.
-- Only run in development/local environments.

-- Insert a test user (matches Supabase Auth test user)
-- In local dev, create this user via Supabase Studio or Auth API first.
-- The handle_new_user() trigger will auto-create the users row.

-- Sample workout for the test user (use after creating auth user)
-- Replace 'TEST_USER_UUID' with actual auth.users.id after signup.

-- Example: Insert a completed push day workout
/*
INSERT INTO workouts (user_id, workout_type, status, title, started_at, completed_at, duration_seconds, exercises, metrics_summary)
VALUES (
  'TEST_USER_UUID',
  'push',
  'completed',
  'Morning Push Day',
  NOW() - INTERVAL '1 hour',
  NOW() - INTERVAL '5 minutes',
  3300,
  '[
    {"name": "Bench Press", "sets": [
      {"weight": 60, "reps": 12, "rpe": 7},
      {"weight": 80, "reps": 10, "rpe": 8},
      {"weight": 80, "reps": 8, "rpe": 9}
    ]},
    {"name": "Overhead Press", "sets": [
      {"weight": 40, "reps": 10, "rpe": 7},
      {"weight": 40, "reps": 10, "rpe": 8},
      {"weight": 40, "reps": 8, "rpe": 9}
    ]}
  ]'::jsonb,
  '{"total_volume_kg": 1240, "total_calories": 320, "avg_heart_rate": 135, "max_heart_rate": 168}'::jsonb
);
*/

-- Verify RLS is enabled on all tables
DO $$
DECLARE
  tbl RECORD;
BEGIN
  FOR tbl IN
    SELECT tablename FROM pg_tables
    WHERE schemaname = 'public'
      AND tablename NOT LIKE 'pg_%'
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public'
        AND c.relname = tbl.tablename
        AND c.relrowsecurity = true
    ) THEN
      RAISE WARNING 'RLS NOT enabled on table: %', tbl.tablename;
    END IF;
  END LOOP;
END $$;
