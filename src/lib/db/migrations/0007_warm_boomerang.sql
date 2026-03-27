ALTER TABLE "exercise_sets" DROP CONSTRAINT "exercise_sets_session_id_workout_sessions_id_fk";
--> statement-breakpoint
ALTER TABLE "exercise_sets" ADD CONSTRAINT "exercise_sets_session_id_workout_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."workout_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "one_active_mesocycle_per_user" ON "mesocycles" USING btree ("user_id") WHERE "mesocycles"."status" = 'active';--> statement-breakpoint
CREATE UNIQUE INDEX "one_active_session_per_user" ON "workout_sessions" USING btree ("user_id") WHERE "workout_sessions"."status" = 'active';--> statement-breakpoint
ALTER TABLE "user_volume_landmarks" ADD CONSTRAINT "unique_user_muscle_landmark" UNIQUE("user_id","muscle_group");