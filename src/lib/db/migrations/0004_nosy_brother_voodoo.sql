CREATE TYPE "public"."equipment_access" AS ENUM('home', 'apartment', 'commercial', 'specialty');--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "equipment_access" "equipment_access" DEFAULT 'commercial';--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "onboarding_complete" boolean DEFAULT false NOT NULL;--> statement-breakpoint
UPDATE "users" SET "onboarding_complete" = true WHERE "id" IN (SELECT DISTINCT "user_id" FROM "user_volume_landmarks");