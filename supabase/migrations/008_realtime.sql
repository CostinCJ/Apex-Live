-- ============================================================
-- Supabase Realtime Configuration
-- ============================================================
-- Only enable realtime on low-frequency tables.
-- workout_metrics is TOO HIGH VOLUME for postgres_changes.
-- Use Supabase Broadcast channels for live metrics instead.

ALTER PUBLICATION supabase_realtime ADD TABLE workouts;
ALTER PUBLICATION supabase_realtime ADD TABLE personal_records;
ALTER PUBLICATION supabase_realtime ADD TABLE coach_messages;
