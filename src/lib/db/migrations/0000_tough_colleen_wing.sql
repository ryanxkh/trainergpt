CREATE TYPE "public"."experience_level" AS ENUM('beginner', 'intermediate', 'advanced');--> statement-breakpoint
CREATE TYPE "public"."mesocycle_status" AS ENUM('planned', 'active', 'completed');--> statement-breakpoint
CREATE TYPE "public"."movement_pattern" AS ENUM('horizontal_press', 'vertical_press', 'horizontal_pull', 'vertical_pull', 'squat', 'hip_hinge', 'isolation', 'carry');--> statement-breakpoint
CREATE TYPE "public"."split_type" AS ENUM('full_body', 'upper_lower', 'push_pull_legs', 'custom');--> statement-breakpoint
CREATE TABLE "exercise_sets" (
	"id" serial PRIMARY KEY NOT NULL,
	"session_id" integer NOT NULL,
	"exercise_id" integer NOT NULL,
	"set_number" integer NOT NULL,
	"weight" real NOT NULL,
	"reps" integer NOT NULL,
	"rir" integer,
	"rpe" real,
	"rest_seconds" integer,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "exercises" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"muscle_groups" jsonb NOT NULL,
	"movement_pattern" "movement_pattern" NOT NULL,
	"equipment" text NOT NULL,
	"sfr_rating" text DEFAULT 'medium',
	"is_stretch_focused" boolean DEFAULT false,
	"rep_range_optimal" jsonb DEFAULT '[8,12]'::jsonb,
	"default_rest_seconds" integer DEFAULT 120
);
--> statement-breakpoint
CREATE TABLE "mesocycles" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"name" text NOT NULL,
	"split_type" "split_type" NOT NULL,
	"status" "mesocycle_status" DEFAULT 'planned' NOT NULL,
	"total_weeks" integer DEFAULT 4 NOT NULL,
	"current_week" integer DEFAULT 1 NOT NULL,
	"volume_plan" jsonb,
	"start_date" timestamp,
	"end_date" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_volume_landmarks" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"muscle_group" text NOT NULL,
	"mev" integer NOT NULL,
	"mav" integer NOT NULL,
	"mrv" integer NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" varchar(255) NOT NULL,
	"name" text,
	"experience_level" "experience_level" DEFAULT 'intermediate',
	"training_age_months" integer DEFAULT 0,
	"available_training_days" integer DEFAULT 4,
	"preferred_split" "split_type" DEFAULT 'upper_lower',
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "workout_sessions" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"mesocycle_id" integer,
	"session_name" text NOT NULL,
	"date" timestamp DEFAULT now() NOT NULL,
	"mesocycle_week" integer,
	"pre_readiness" jsonb,
	"post_notes" text,
	"duration_minutes" integer,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "exercise_sets" ADD CONSTRAINT "exercise_sets_session_id_workout_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."workout_sessions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exercise_sets" ADD CONSTRAINT "exercise_sets_exercise_id_exercises_id_fk" FOREIGN KEY ("exercise_id") REFERENCES "public"."exercises"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mesocycles" ADD CONSTRAINT "mesocycles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_volume_landmarks" ADD CONSTRAINT "user_volume_landmarks_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workout_sessions" ADD CONSTRAINT "workout_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workout_sessions" ADD CONSTRAINT "workout_sessions_mesocycle_id_mesocycles_id_fk" FOREIGN KEY ("mesocycle_id") REFERENCES "public"."mesocycles"("id") ON DELETE no action ON UPDATE no action;