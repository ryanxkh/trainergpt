import {
  pgTable,
  serial,
  text,
  timestamp,
  integer,
  varchar,
  boolean,
  jsonb,
  real,
  pgEnum,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// Enums
export const experienceLevelEnum = pgEnum("experience_level", [
  "beginner",
  "intermediate",
  "advanced",
]);

export const splitTypeEnum = pgEnum("split_type", [
  "full_body",
  "upper_lower",
  "push_pull_legs",
  "custom",
]);

export const mesocycleStatusEnum = pgEnum("mesocycle_status", [
  "planned",
  "active",
  "completed",
]);

export const movementPatternEnum = pgEnum("movement_pattern", [
  "horizontal_press",
  "vertical_press",
  "horizontal_pull",
  "vertical_pull",
  "squat",
  "hip_hinge",
  "isolation",
  "carry",
]);

// ─── Users ──────────────────────────────────────────────────────────

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  name: text("name"),
  experienceLevel: experienceLevelEnum("experience_level").default("intermediate"),
  trainingAgeMonths: integer("training_age_months").default(0),
  availableTrainingDays: integer("available_training_days").default(4),
  preferredSplit: splitTypeEnum("preferred_split").default("upper_lower"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ─── Exercises (Reference Table) ────────────────────────────────────

export const exercises = pgTable("exercises", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  muscleGroups: jsonb("muscle_groups").$type<{
    primary: string[];
    secondary: string[];
  }>().notNull(),
  movementPattern: movementPatternEnum("movement_pattern").notNull(),
  equipment: text("equipment").notNull(),
  sfrRating: text("sfr_rating").default("medium"), // low, medium, high
  isStretchFocused: boolean("is_stretch_focused").default(false),
  repRangeOptimal: jsonb("rep_range_optimal").$type<[number, number]>().default([8, 12]),
  defaultRestSeconds: integer("default_rest_seconds").default(120),
});

// ─── Mesocycles ─────────────────────────────────────────────────────

export const mesocycles = pgTable("mesocycles", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .references(() => users.id)
    .notNull(),
  name: text("name").notNull(),
  splitType: splitTypeEnum("split_type").notNull(),
  status: mesocycleStatusEnum("status").default("planned").notNull(),
  totalWeeks: integer("total_weeks").default(4).notNull(),
  currentWeek: integer("current_week").default(1).notNull(),
  volumePlan: jsonb("volume_plan").$type<
    Record<string, Record<string, number>>
  >(), // { "week_1": { "chest": 10, "back": 12 } }
  startDate: timestamp("start_date"),
  endDate: timestamp("end_date"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ─── Workout Sessions ───────────────────────────────────────────────

export const workoutSessions = pgTable("workout_sessions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .references(() => users.id)
    .notNull(),
  mesocycleId: integer("mesocycle_id").references(() => mesocycles.id),
  sessionName: text("session_name").notNull(),
  date: timestamp("date").defaultNow().notNull(),
  mesocycleWeek: integer("mesocycle_week"),
  preReadiness: jsonb("pre_readiness").$type<{
    energy: number;
    motivation: number;
    soreness: number;
    sleepQuality: number;
    sleepHours: number;
  }>(),
  postNotes: text("post_notes"),
  prescribedExercises: jsonb("prescribed_exercises").$type<{
    exerciseId: number;
    exerciseName: string;
    targetSets: number;
    repRangeMin: number;
    repRangeMax: number;
    rirTarget: number;
    restSeconds: number;
  }[]>(),
  durationMinutes: integer("duration_minutes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ─── Exercise Sets ──────────────────────────────────────────────────

export const exerciseSets = pgTable("exercise_sets", {
  id: serial("id").primaryKey(),
  sessionId: integer("session_id")
    .references(() => workoutSessions.id)
    .notNull(),
  exerciseId: integer("exercise_id")
    .references(() => exercises.id)
    .notNull(),
  setNumber: integer("set_number").notNull(),
  weight: real("weight").notNull(),
  reps: integer("reps").notNull(),
  rir: integer("rir"), // Reps in Reserve (0-5)
  rpe: real("rpe"), // Rating of Perceived Exertion (6-10)
  setType: text("set_type").default("normal"), // 'normal' | 'myorep' | 'dropset'
  restSeconds: integer("rest_seconds"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ─── User Volume Landmarks ──────────────────────────────────────────

export const userVolumeLandmarks = pgTable("user_volume_landmarks", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .references(() => users.id)
    .notNull(),
  muscleGroup: text("muscle_group").notNull(),
  mev: integer("mev").notNull(), // Minimum Effective Volume
  mav: integer("mav").notNull(), // Maximum Adaptive Volume
  mrv: integer("mrv").notNull(), // Maximum Recoverable Volume
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ─── Relations ──────────────────────────────────────────────────────

export const usersRelations = relations(users, ({ many }) => ({
  mesocycles: many(mesocycles),
  workoutSessions: many(workoutSessions),
  volumeLandmarks: many(userVolumeLandmarks),
}));

export const mesocyclesRelations = relations(mesocycles, ({ one, many }) => ({
  user: one(users, {
    fields: [mesocycles.userId],
    references: [users.id],
  }),
  workoutSessions: many(workoutSessions),
}));

export const workoutSessionsRelations = relations(
  workoutSessions,
  ({ one, many }) => ({
    user: one(users, {
      fields: [workoutSessions.userId],
      references: [users.id],
    }),
    mesocycle: one(mesocycles, {
      fields: [workoutSessions.mesocycleId],
      references: [mesocycles.id],
    }),
    sets: many(exerciseSets),
  })
);

export const exerciseSetsRelations = relations(exerciseSets, ({ one }) => ({
  session: one(workoutSessions, {
    fields: [exerciseSets.sessionId],
    references: [workoutSessions.id],
  }),
  exercise: one(exercises, {
    fields: [exerciseSets.exerciseId],
    references: [exercises.id],
  }),
}));

export const userVolumeLandmarksRelations = relations(
  userVolumeLandmarks,
  ({ one }) => ({
    user: one(users, {
      fields: [userVolumeLandmarks.userId],
      references: [users.id],
    }),
  })
);
