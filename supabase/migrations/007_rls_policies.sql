-- ============================================================
-- Row Level Security Policies
-- ============================================================
-- CRITICAL: Every table must have RLS enabled.
-- user_id on workout_metrics is denormalized specifically
-- to avoid JOIN in RLS checks on the highest-volume table.

-- USERS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own profile"
  ON users FOR SELECT
  USING (auth.uid() = id);
CREATE POLICY "Users can update own profile"
  ON users FOR UPDATE
  USING (auth.uid() = id);

-- WORKOUTS
ALTER TABLE workouts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own workouts"
  ON workouts FOR SELECT
  USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own workouts"
  ON workouts FOR INSERT
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own workouts"
  ON workouts FOR UPDATE
  USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own workouts"
  ON workouts FOR DELETE
  USING (auth.uid() = user_id);

-- WORKOUT METRICS
ALTER TABLE workout_metrics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own metrics"
  ON workout_metrics FOR SELECT
  USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own metrics"
  ON workout_metrics FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- WORKOUT METRICS DOWNSAMPLED
ALTER TABLE workout_metrics_downsampled ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own downsampled metrics"
  ON workout_metrics_downsampled FOR SELECT
  USING (auth.uid() = user_id);

-- PERSONAL RECORDS
ALTER TABLE personal_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own records"
  ON personal_records FOR SELECT
  USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own records"
  ON personal_records FOR INSERT
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own records"
  ON personal_records FOR UPDATE
  USING (auth.uid() = user_id);

-- COACH CONVERSATIONS
ALTER TABLE coach_conversations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own conversations"
  ON coach_conversations FOR SELECT
  USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own conversations"
  ON coach_conversations FOR INSERT
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own conversations"
  ON coach_conversations FOR UPDATE
  USING (auth.uid() = user_id);

-- COACH MESSAGES (access through conversation ownership)
ALTER TABLE coach_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own messages"
  ON coach_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM coach_conversations cc
      WHERE cc.id = coach_messages.conversation_id
        AND cc.user_id = auth.uid()
    )
  );
CREATE POLICY "Users can insert own messages"
  ON coach_messages FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM coach_conversations cc
      WHERE cc.id = coach_messages.conversation_id
        AND cc.user_id = auth.uid()
    )
  );

-- DAILY WORKOUT SUMMARIES (read-only for users, written by triggers)
ALTER TABLE daily_workout_summaries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own summaries"
  ON daily_workout_summaries FOR SELECT
  USING (auth.uid() = user_id);
