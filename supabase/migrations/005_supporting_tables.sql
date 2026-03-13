-- ============================================================
-- Personal Records
-- ============================================================
CREATE TABLE personal_records (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  exercise_name   TEXT NOT NULL,
  workout_type    workout_type NOT NULL,
  record_type     TEXT NOT NULL,         -- 'max_weight', 'max_reps', 'max_volume', 'fastest_time'
  value           NUMERIC(10, 2) NOT NULL,
  unit            TEXT NOT NULL,
  achieved_at     TIMESTAMPTZ NOT NULL,
  workout_id      UUID REFERENCES workouts(id) ON DELETE SET NULL,
  previous_value  NUMERIC(10, 2),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (user_id, exercise_name, record_type)
);

CREATE INDEX idx_pr_user_workout_type
  ON personal_records (user_id, workout_type);
CREATE INDEX idx_pr_user_exercise
  ON personal_records (user_id, exercise_name);

-- ============================================================
-- Coach Conversations
-- ============================================================
CREATE TABLE coach_conversations (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  workout_id      UUID REFERENCES workouts(id) ON DELETE SET NULL,
  started_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at        TIMESTAMPTZ,
  message_count   INTEGER NOT NULL DEFAULT 0,
  summary         TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_cc_user_started
  ON coach_conversations (user_id, started_at DESC);

-- ============================================================
-- Coach Messages
-- ============================================================
CREATE TABLE coach_messages (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES coach_conversations(id) ON DELETE CASCADE,
  role            conversation_role NOT NULL,
  content         TEXT NOT NULL,
  audio_duration_ms INTEGER,
  token_count     INTEGER,
  metadata        JSONB,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_cm_conversation_created
  ON coach_messages (conversation_id, created_at ASC);

-- ============================================================
-- Daily Workout Summaries (pre-computed for charts)
-- ============================================================
CREATE TABLE daily_workout_summaries (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date            DATE NOT NULL,
  workout_count   INTEGER NOT NULL DEFAULT 0,
  total_duration  INTEGER NOT NULL DEFAULT 0,       -- seconds
  total_calories  NUMERIC(8, 1) NOT NULL DEFAULT 0,
  total_distance  NUMERIC(10, 1) NOT NULL DEFAULT 0, -- metres
  total_volume    NUMERIC(12, 1) NOT NULL DEFAULT 0,  -- kg lifted
  avg_heart_rate  NUMERIC(5, 1),
  workout_types   JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (user_id, date)
);

CREATE INDEX idx_daily_user_date
  ON daily_workout_summaries (user_id, date DESC);

CREATE TRIGGER trg_daily_summaries_updated_at
  BEFORE UPDATE ON daily_workout_summaries
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
