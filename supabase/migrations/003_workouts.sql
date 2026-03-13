-- ============================================================
-- Workouts table
-- ============================================================
CREATE TABLE workouts (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  workout_type      workout_type NOT NULL,
  title             TEXT,
  status            TEXT NOT NULL DEFAULT 'active'
                      CHECK (status IN ('active', 'paused', 'completed', 'abandoned')),
  started_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at      TIMESTAMPTZ,
  duration_seconds  INTEGER,

  -- Denormalized summary written on workout completion
  metrics_summary   JSONB NOT NULL DEFAULT '{}'::jsonb,
  /*
    Example metrics_summary:
    {
      "avg_heart_rate": 145,
      "max_heart_rate": 178,
      "total_calories": 623,
      "total_distance_m": 5120,
      "total_volume_kg": 4500,
      "total_sets": 16,
      "total_reps": 128,
      "exercises": [
        { "name": "Bench Press", "sets": 4, "best_set": "100kg x 8" }
      ]
    }
  */

  notes             TEXT,
  device_info       JSONB,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Critical: "get previous session for same workout type"
CREATE INDEX idx_workouts_user_type_started
  ON workouts (user_id, workout_type, started_at DESC);

-- Dashboard: recent workouts
CREATE INDEX idx_workouts_user_started
  ON workouts (user_id, started_at DESC);

-- Quick find active workouts (very few rows)
CREATE INDEX idx_workouts_active
  ON workouts (status)
  WHERE status = 'active';
