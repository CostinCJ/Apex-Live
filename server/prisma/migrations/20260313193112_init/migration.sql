-- CreateEnum
CREATE TYPE "workout_type" AS ENUM ('push', 'pull', 'legs', 'upper', 'lower', 'full_body', 'hiit', 'cardio_run', 'cardio_cycle', 'cardio_row', 'yoga', 'mobility', 'custom');

-- CreateEnum
CREATE TYPE "metric_type" AS ENUM ('heart_rate', 'calories', 'distance', 'pace', 'speed', 'cadence', 'power', 'elevation', 'rep_count', 'weight', 'rpe');

-- CreateEnum
CREATE TYPE "conversation_role" AS ENUM ('user', 'assistant', 'system');

-- CreateEnum
CREATE TYPE "workout_status" AS ENUM ('active', 'paused', 'completed', 'abandoned');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "display_name" TEXT,
    "avatar_url" TEXT,
    "date_of_birth" DATE,
    "gender" TEXT,
    "height_cm" DECIMAL(5,1),
    "weight_kg" DECIMAL(5,1),
    "fitness_level" TEXT NOT NULL DEFAULT 'intermediate',
    "preferences" JSONB NOT NULL DEFAULT '{"units": "imperial", "weekly_goal_days": 4, "preferred_workout_types": [], "rest_day_reminders": true}',
    "voice_settings" JSONB NOT NULL DEFAULT '{"voice_id": "default", "speed": 1.0, "coaching_style": "motivational", "verbosity": "moderate", "language": "en-US"}',
    "timezone" TEXT NOT NULL DEFAULT 'UTC',
    "units" TEXT NOT NULL DEFAULT 'imperial',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refresh_tokens" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "token" TEXT NOT NULL,
    "expires_at" TIMESTAMPTZ NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workouts" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "workout_type" "workout_type" NOT NULL,
    "status" "workout_status" NOT NULL DEFAULT 'active',
    "title" TEXT,
    "started_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMPTZ,
    "duration_seconds" INTEGER,
    "plan" JSONB,
    "exercises" JSONB NOT NULL DEFAULT '[]',
    "metrics_summary" JSONB NOT NULL DEFAULT '{}',
    "notes" TEXT,
    "device_info" JSONB,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "workouts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workout_metrics" (
    "id" BIGSERIAL NOT NULL,
    "workout_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "metric_type" "metric_type" NOT NULL,
    "value" DECIMAL(10,2) NOT NULL,
    "unit" TEXT,
    "recorded_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadata" JSONB,

    CONSTRAINT "workout_metrics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workout_metrics_downsampled" (
    "workout_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "metric_type" "metric_type" NOT NULL,
    "bucket_start" TIMESTAMPTZ NOT NULL,
    "bucket_seconds" INTEGER NOT NULL DEFAULT 60,
    "avg_value" DECIMAL(10,2) NOT NULL,
    "min_value" DECIMAL(10,2) NOT NULL,
    "max_value" DECIMAL(10,2) NOT NULL,
    "sample_count" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "workout_metrics_downsampled_pkey" PRIMARY KEY ("workout_id","metric_type","bucket_start")
);

-- CreateTable
CREATE TABLE "personal_records" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "exercise_name" TEXT NOT NULL,
    "record_type" TEXT NOT NULL,
    "value" DECIMAL(10,2) NOT NULL,
    "unit" TEXT NOT NULL,
    "achieved_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "workout_id" UUID,
    "previous_value" DECIMAL(10,2),
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "personal_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "coach_conversations" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "workout_id" UUID,
    "title" TEXT,
    "started_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ended_at" TIMESTAMPTZ,
    "message_count" INTEGER NOT NULL DEFAULT 0,
    "summary" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "coach_conversations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "coach_messages" (
    "id" UUID NOT NULL,
    "conversation_id" UUID NOT NULL,
    "role" "conversation_role" NOT NULL,
    "content" TEXT NOT NULL,
    "audio_duration_ms" INTEGER,
    "token_count" INTEGER,
    "metadata" JSONB,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "coach_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "daily_workout_summaries" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "date" DATE NOT NULL,
    "workout_count" INTEGER NOT NULL DEFAULT 0,
    "total_duration" INTEGER NOT NULL DEFAULT 0,
    "total_calories" DECIMAL(8,1) NOT NULL DEFAULT 0,
    "total_distance" DECIMAL(10,1) NOT NULL DEFAULT 0,
    "total_volume" DECIMAL(12,1) NOT NULL DEFAULT 0,
    "avg_heart_rate" DECIMAL(5,1),
    "workout_types" JSONB NOT NULL DEFAULT '[]',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "daily_workout_summaries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "refresh_tokens_token_key" ON "refresh_tokens"("token");

-- CreateIndex
CREATE INDEX "refresh_tokens_user_id_idx" ON "refresh_tokens"("user_id");

-- CreateIndex
CREATE INDEX "refresh_tokens_expires_at_idx" ON "refresh_tokens"("expires_at");

-- CreateIndex
CREATE INDEX "idx_workouts_user_type_started" ON "workouts"("user_id", "workout_type", "started_at" DESC);

-- CreateIndex
CREATE INDEX "idx_workouts_user_started" ON "workouts"("user_id", "started_at" DESC);

-- CreateIndex
CREATE INDEX "idx_workouts_active" ON "workouts"("status");

-- CreateIndex
CREATE INDEX "idx_wm_workout_recorded" ON "workout_metrics"("workout_id", "recorded_at");

-- CreateIndex
CREATE INDEX "idx_wm_user_type_recorded" ON "workout_metrics"("user_id", "metric_type", "recorded_at" DESC);

-- CreateIndex
CREATE INDEX "idx_pr_user_exercise" ON "personal_records"("user_id", "exercise_name");

-- CreateIndex
CREATE UNIQUE INDEX "personal_records_user_id_exercise_name_record_type_key" ON "personal_records"("user_id", "exercise_name", "record_type");

-- CreateIndex
CREATE INDEX "idx_cc_user_started" ON "coach_conversations"("user_id", "started_at" DESC);

-- CreateIndex
CREATE INDEX "idx_cm_conversation_created" ON "coach_messages"("conversation_id", "created_at");

-- CreateIndex
CREATE INDEX "idx_daily_user_date" ON "daily_workout_summaries"("user_id", "date" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "daily_workout_summaries_user_id_date_key" ON "daily_workout_summaries"("user_id", "date");

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workouts" ADD CONSTRAINT "workouts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workout_metrics" ADD CONSTRAINT "workout_metrics_workout_id_fkey" FOREIGN KEY ("workout_id") REFERENCES "workouts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workout_metrics" ADD CONSTRAINT "workout_metrics_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "personal_records" ADD CONSTRAINT "personal_records_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "personal_records" ADD CONSTRAINT "personal_records_workout_id_fkey" FOREIGN KEY ("workout_id") REFERENCES "workouts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "coach_conversations" ADD CONSTRAINT "coach_conversations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "coach_conversations" ADD CONSTRAINT "coach_conversations_workout_id_fkey" FOREIGN KEY ("workout_id") REFERENCES "workouts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "coach_messages" ADD CONSTRAINT "coach_messages_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "coach_conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "daily_workout_summaries" ADD CONSTRAINT "daily_workout_summaries_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
