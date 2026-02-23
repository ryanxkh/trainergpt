CREATE TYPE "public"."session_status" AS ENUM('active', 'completed', 'abandoned');--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "password_hash" text;--> statement-breakpoint
ALTER TABLE "workout_sessions" ADD COLUMN "status" "session_status" DEFAULT 'active' NOT NULL;--> statement-breakpoint

-- Backfill existing sessions
UPDATE "workout_sessions" SET "status" = 'completed'
  WHERE "duration_minutes" IS NOT NULL;--> statement-breakpoint

UPDATE "workout_sessions" SET "status" = 'abandoned'
  WHERE "duration_minutes" IS NULL
  AND "created_at" < NOW() - INTERVAL '48 hours';