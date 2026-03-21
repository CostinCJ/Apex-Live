-- Add missing email_verified column to users
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "email_verified" BOOLEAN NOT NULL DEFAULT false;

-- Fix workout_type enum: add 'boxing' (schema has 'boxing' instead of 'yoga')
ALTER TYPE "workout_type" ADD VALUE IF NOT EXISTS 'boxing';

-- CreateEnum
CREATE TYPE "subscription_status" AS ENUM ('active', 'past_due', 'canceled', 'expired', 'trialing');

-- CreateEnum
CREATE TYPE "subscription_plan" AS ENUM ('free', 'monthly', 'yearly');

-- CreateTable
CREATE TABLE "email_verify_tokens" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "token" TEXT NOT NULL,
    "expires_at" TIMESTAMPTZ NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "email_verify_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "password_reset_tokens" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "token" TEXT NOT NULL,
    "expires_at" TIMESTAMPTZ NOT NULL,
    "used_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "password_reset_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscriptions" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "plan" "subscription_plan" NOT NULL DEFAULT 'free',
    "status" "subscription_status" NOT NULL DEFAULT 'active',
    "provider" TEXT NOT NULL DEFAULT 'revenueCat',
    "provider_subscription_id" TEXT,
    "current_period_start" TIMESTAMPTZ,
    "current_period_end" TIMESTAMPTZ,
    "cancel_at_period_end" BOOLEAN NOT NULL DEFAULT false,
    "trial_end" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: email_verify_tokens
CREATE UNIQUE INDEX "email_verify_tokens_token_key" ON "email_verify_tokens"("token");
CREATE INDEX "email_verify_tokens_user_id_idx" ON "email_verify_tokens"("user_id");
CREATE INDEX "email_verify_tokens_expires_at_idx" ON "email_verify_tokens"("expires_at");

-- CreateIndex: password_reset_tokens
CREATE UNIQUE INDEX "password_reset_tokens_token_key" ON "password_reset_tokens"("token");
CREATE INDEX "password_reset_tokens_user_id_idx" ON "password_reset_tokens"("user_id");
CREATE INDEX "password_reset_tokens_expires_at_idx" ON "password_reset_tokens"("expires_at");

-- CreateIndex: subscriptions
CREATE UNIQUE INDEX "subscriptions_user_id_key" ON "subscriptions"("user_id");
CREATE INDEX "subscriptions_status_idx" ON "subscriptions"("status");
CREATE INDEX "subscriptions_current_period_end_idx" ON "subscriptions"("current_period_end");

-- Missing indexes from init migration for workout_metrics
CREATE INDEX IF NOT EXISTS "idx_wm_workout_type_recorded" ON "workout_metrics"("workout_id", "metric_type", "recorded_at" DESC);
CREATE INDEX IF NOT EXISTS "idx_wm_user_id" ON "workout_metrics"("user_id");

-- Missing indexes for workout_metrics_downsampled
CREATE INDEX IF NOT EXISTS "idx_downsampled_user_id" ON "workout_metrics_downsampled"("user_id");
CREATE INDEX IF NOT EXISTS "idx_downsampled_workout_id" ON "workout_metrics_downsampled"("workout_id");
CREATE INDEX IF NOT EXISTS "idx_downsampled_user_type_bucket" ON "workout_metrics_downsampled"("user_id", "metric_type", "bucket_start" DESC);

-- AddForeignKey
ALTER TABLE "email_verify_tokens" ADD CONSTRAINT "email_verify_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "password_reset_tokens" ADD CONSTRAINT "password_reset_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Missing foreign keys for workout_metrics_downsampled
ALTER TABLE "workout_metrics_downsampled" ADD CONSTRAINT "workout_metrics_downsampled_workout_id_fkey" FOREIGN KEY ("workout_id") REFERENCES "workouts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "workout_metrics_downsampled" ADD CONSTRAINT "workout_metrics_downsampled_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
