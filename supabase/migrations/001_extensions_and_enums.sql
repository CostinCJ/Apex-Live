-- ============================================================
-- Extensions
-- ============================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ============================================================
-- Custom types
-- ============================================================
CREATE TYPE workout_type AS ENUM (
  'running', 'cycling', 'swimming', 'strength',
  'hiit', 'yoga', 'rowing', 'walking', 'custom'
);

CREATE TYPE metric_type AS ENUM (
  'heart_rate', 'calories', 'power_watts', 'cadence',
  'speed_kmh', 'distance_m', 'elevation_m', 'rep_count',
  'set_number', 'weight_kg', 'vo2_estimate', 'steps',
  'active_energy', 'hrv', 'blood_oxygen'
);

CREATE TYPE conversation_role AS ENUM ('user', 'assistant', 'system');

-- ============================================================
-- Helper: auto-update updated_at column
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
