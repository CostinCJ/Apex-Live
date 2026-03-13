-- ============================================================
-- Users table
-- ============================================================
CREATE TABLE users (
  id              UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name    TEXT,
  email           TEXT,
  avatar_url      TEXT,

  -- Profile
  date_of_birth   DATE,
  gender          TEXT CHECK (gender IN ('male', 'female', 'other', 'prefer_not_to_say')),
  height_cm       NUMERIC(5, 1),
  weight_kg       NUMERIC(5, 1),
  fitness_level   TEXT CHECK (fitness_level IN ('beginner', 'intermediate', 'advanced')),

  -- Preferences (JSONB for flexibility)
  preferences     JSONB NOT NULL DEFAULT '{
    "units": "imperial",
    "weekly_goal_days": 4,
    "preferred_workout_types": [],
    "rest_day_reminders": true
  }'::jsonb,

  -- Voice / coach settings
  voice_settings  JSONB NOT NULL DEFAULT '{
    "voice_id": "default",
    "speed": 1.0,
    "coaching_style": "motivational",
    "verbosity": "moderate",
    "language": "en-US"
  }'::jsonb,

  timezone        TEXT NOT NULL DEFAULT 'UTC',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_users_email ON users (email);

CREATE TRIGGER trg_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- Auto-create user profile on auth signup
-- ============================================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, display_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1))
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
