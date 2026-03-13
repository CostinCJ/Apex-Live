-- ============================================================
-- Get previous workout of same type (for real-time comparison)
-- ============================================================
CREATE OR REPLACE FUNCTION get_previous_workout(
  p_user_id UUID,
  p_workout_type workout_type,
  p_current_workout_id UUID DEFAULT NULL
)
RETURNS TABLE (
  workout_id        UUID,
  started_at        TIMESTAMPTZ,
  completed_at      TIMESTAMPTZ,
  duration_seconds  INTEGER,
  metrics_summary   JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    w.id,
    w.started_at,
    w.completed_at,
    w.duration_seconds,
    w.metrics_summary
  FROM workouts w
  WHERE w.user_id = p_user_id
    AND w.workout_type = p_workout_type
    AND w.status = 'completed'
    AND (p_current_workout_id IS NULL OR w.id != p_current_workout_id)
  ORDER BY w.started_at DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- ============================================================
-- Compare workout metrics between two sessions
-- ============================================================
CREATE OR REPLACE FUNCTION compare_workout_metrics(
  p_current_workout_id UUID,
  p_previous_workout_id UUID,
  p_metric metric_type,
  p_bucket_seconds INTEGER DEFAULT 30
)
RETURNS TABLE (
  elapsed_seconds   INTEGER,
  current_value     NUMERIC(10, 2),
  previous_value    NUMERIC(10, 2),
  delta             NUMERIC(10, 2)
) AS $$
BEGIN
  RETURN QUERY
  WITH current_data AS (
    SELECT
      (EXTRACT(EPOCH FROM (wm.recorded_at - w.started_at)) / p_bucket_seconds)::INTEGER
        * p_bucket_seconds AS elapsed,
      ROUND(AVG(wm.value), 2) AS avg_val
    FROM workout_metrics wm
    JOIN workouts w ON w.id = wm.workout_id
    WHERE wm.workout_id = p_current_workout_id
      AND wm.metric_type = p_metric
    GROUP BY 1
  ),
  previous_data AS (
    SELECT
      (EXTRACT(EPOCH FROM (wm.recorded_at - w.started_at)) / p_bucket_seconds)::INTEGER
        * p_bucket_seconds AS elapsed,
      ROUND(AVG(wm.value), 2) AS avg_val
    FROM workout_metrics wm
    JOIN workouts w ON w.id = wm.workout_id
    WHERE wm.workout_id = p_previous_workout_id
      AND wm.metric_type = p_metric
    GROUP BY 1
  )
  SELECT
    COALESCE(c.elapsed, p.elapsed) AS elapsed_seconds,
    c.avg_val AS current_value,
    p.avg_val AS previous_value,
    ROUND(COALESCE(c.avg_val, 0) - COALESCE(p.avg_val, 0), 2) AS delta
  FROM current_data c
  FULL OUTER JOIN previous_data p ON c.elapsed = p.elapsed
  ORDER BY 1;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- ============================================================
-- Auto-update daily summaries when workout completes
-- ============================================================
CREATE OR REPLACE FUNCTION update_daily_summary()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'completed' AND (OLD IS NULL OR OLD.status != 'completed') THEN
    INSERT INTO daily_workout_summaries (
      user_id, date, workout_count,
      total_duration, total_calories, total_distance, total_volume, workout_types
    )
    VALUES (
      NEW.user_id,
      (NEW.started_at AT TIME ZONE COALESCE(
        (SELECT timezone FROM users WHERE id = NEW.user_id), 'UTC'
      ))::DATE,
      1,
      COALESCE(NEW.duration_seconds, 0),
      COALESCE((NEW.metrics_summary->>'total_calories')::NUMERIC, 0),
      COALESCE((NEW.metrics_summary->>'total_distance_m')::NUMERIC, 0),
      COALESCE((NEW.metrics_summary->>'total_volume_kg')::NUMERIC, 0),
      jsonb_build_array(NEW.workout_type)
    )
    ON CONFLICT (user_id, date) DO UPDATE SET
      workout_count  = daily_workout_summaries.workout_count + 1,
      total_duration = daily_workout_summaries.total_duration
                       + COALESCE(NEW.duration_seconds, 0),
      total_calories = daily_workout_summaries.total_calories
                       + COALESCE((NEW.metrics_summary->>'total_calories')::NUMERIC, 0),
      total_distance = daily_workout_summaries.total_distance
                       + COALESCE((NEW.metrics_summary->>'total_distance_m')::NUMERIC, 0),
      total_volume   = daily_workout_summaries.total_volume
                       + COALESCE((NEW.metrics_summary->>'total_volume_kg')::NUMERIC, 0),
      workout_types  = daily_workout_summaries.workout_types
                       || jsonb_build_array(NEW.workout_type),
      updated_at     = now();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_workout_completed
  AFTER INSERT OR UPDATE ON workouts
  FOR EACH ROW EXECUTE FUNCTION update_daily_summary();

-- ============================================================
-- Export user data (GDPR compliance)
-- ============================================================
CREATE OR REPLACE FUNCTION export_user_data(p_user_id UUID)
RETURNS JSONB AS $$
  SELECT jsonb_build_object(
    'user', (SELECT to_jsonb(u.*) FROM users u WHERE u.id = p_user_id),
    'workouts', COALESCE(
      (SELECT jsonb_agg(to_jsonb(w.*)) FROM workouts w WHERE w.user_id = p_user_id),
      '[]'::jsonb
    ),
    'personal_records', COALESCE(
      (SELECT jsonb_agg(to_jsonb(pr.*)) FROM personal_records pr WHERE pr.user_id = p_user_id),
      '[]'::jsonb
    ),
    'daily_summaries', COALESCE(
      (SELECT jsonb_agg(to_jsonb(ds.*)) FROM daily_workout_summaries ds WHERE ds.user_id = p_user_id),
      '[]'::jsonb
    )
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;
