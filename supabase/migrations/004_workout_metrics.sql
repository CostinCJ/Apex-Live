-- ============================================================
-- Workout metrics (time-series, partitioned by month)
-- ============================================================
CREATE TABLE workout_metrics (
  id              BIGINT GENERATED ALWAYS AS IDENTITY,
  workout_id      UUID NOT NULL,
  user_id         UUID NOT NULL,          -- denormalized for RLS performance
  metric_type     metric_type NOT NULL,
  value           NUMERIC(10, 2) NOT NULL,
  unit            TEXT,
  recorded_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  metadata        JSONB,

  PRIMARY KEY (id, recorded_at)
) PARTITION BY RANGE (recorded_at);

-- Create partitions for current quarter + next quarter
CREATE TABLE workout_metrics_2026_01 PARTITION OF workout_metrics
  FOR VALUES FROM ('2026-01-01') TO ('2026-02-01');
CREATE TABLE workout_metrics_2026_02 PARTITION OF workout_metrics
  FOR VALUES FROM ('2026-02-01') TO ('2026-03-01');
CREATE TABLE workout_metrics_2026_03 PARTITION OF workout_metrics
  FOR VALUES FROM ('2026-03-01') TO ('2026-04-01');
CREATE TABLE workout_metrics_2026_04 PARTITION OF workout_metrics
  FOR VALUES FROM ('2026-04-01') TO ('2026-05-01');
CREATE TABLE workout_metrics_2026_05 PARTITION OF workout_metrics
  FOR VALUES FROM ('2026-05-01') TO ('2026-06-01');
CREATE TABLE workout_metrics_2026_06 PARTITION OF workout_metrics
  FOR VALUES FROM ('2026-06-01') TO ('2026-07-01');

-- BRIN index: tiny index for time-ordered append-only data
CREATE INDEX idx_wm_recorded_brin
  ON workout_metrics USING BRIN (recorded_at)
  WITH (pages_per_range = 32);

-- Primary access: all metrics for a single workout
CREATE INDEX idx_wm_workout_recorded
  ON workout_metrics (workout_id, recorded_at ASC);

-- Trend queries: "show heart_rate over last 30 days"
CREATE INDEX idx_wm_user_type_recorded
  ON workout_metrics (user_id, metric_type, recorded_at DESC);

-- ============================================================
-- Downsampled historical data (1-minute buckets for data > 90 days)
-- ============================================================
CREATE TABLE workout_metrics_downsampled (
  workout_id    UUID NOT NULL,
  user_id       UUID NOT NULL,
  metric_type   metric_type NOT NULL,
  bucket        TIMESTAMPTZ NOT NULL,
  avg_value     NUMERIC(10, 2),
  min_value     NUMERIC(10, 2),
  max_value     NUMERIC(10, 2),
  sample_count  INTEGER,

  PRIMARY KEY (workout_id, metric_type, bucket)
);
