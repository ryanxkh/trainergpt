ALTER TYPE "public"."session_status" ADD VALUE 'planned' BEFORE 'active';--> statement-breakpoint
ALTER TABLE "mesocycles" ADD COLUMN "session_plan" jsonb;--> statement-breakpoint
ALTER TABLE "workout_sessions" ADD COLUMN "is_deload" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "workout_sessions" ADD COLUMN "day_number" integer;