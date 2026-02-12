import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { exercises, users, userVolumeLandmarks } from "./schema";
import { config } from "dotenv";
config({ path: ".env.local" });

const sql = neon(process.env.POSTGRES_URL!);
const db = drizzle(sql);

const exerciseData: (typeof exercises.$inferInsert)[] = [
  // ─── Chest ──────────────────────────────────────────────────────────
  {
    name: "Barbell Bench Press",
    muscleGroups: { primary: ["chest"], secondary: ["front_delts", "triceps"] },
    movementPattern: "horizontal_press",
    equipment: "barbell",
    sfrRating: "low",
    isStretchFocused: false,
    repRangeOptimal: [6, 10],
    defaultRestSeconds: 180,
  },
  {
    name: "Incline Dumbbell Press",
    muscleGroups: { primary: ["chest"], secondary: ["front_delts", "triceps"] },
    movementPattern: "horizontal_press",
    equipment: "dumbbell",
    sfrRating: "medium",
    isStretchFocused: false,
    repRangeOptimal: [8, 12],
    defaultRestSeconds: 150,
  },
  {
    name: "Cable Fly",
    muscleGroups: { primary: ["chest"], secondary: [] },
    movementPattern: "isolation",
    equipment: "cable",
    sfrRating: "high",
    isStretchFocused: true,
    repRangeOptimal: [10, 15],
    defaultRestSeconds: 90,
  },
  {
    name: "Machine Chest Press",
    muscleGroups: { primary: ["chest"], secondary: ["front_delts", "triceps"] },
    movementPattern: "horizontal_press",
    equipment: "machine",
    sfrRating: "low",
    isStretchFocused: false,
    repRangeOptimal: [8, 12],
    defaultRestSeconds: 120,
  },
  {
    name: "Dumbbell Fly",
    muscleGroups: { primary: ["chest"], secondary: [] },
    movementPattern: "isolation",
    equipment: "dumbbell",
    sfrRating: "high",
    isStretchFocused: true,
    repRangeOptimal: [10, 15],
    defaultRestSeconds: 90,
  },

  // ─── Back ───────────────────────────────────────────────────────────
  {
    name: "Barbell Row",
    muscleGroups: { primary: ["back"], secondary: ["biceps", "rear_delts"] },
    movementPattern: "horizontal_pull",
    equipment: "barbell",
    sfrRating: "low",
    isStretchFocused: false,
    repRangeOptimal: [6, 10],
    defaultRestSeconds: 180,
  },
  {
    name: "Pull-Up",
    muscleGroups: { primary: ["back"], secondary: ["biceps"] },
    movementPattern: "vertical_pull",
    equipment: "bodyweight",
    sfrRating: "medium",
    isStretchFocused: true,
    repRangeOptimal: [6, 12],
    defaultRestSeconds: 150,
  },
  {
    name: "Lat Pulldown",
    muscleGroups: { primary: ["back"], secondary: ["biceps"] },
    movementPattern: "vertical_pull",
    equipment: "cable",
    sfrRating: "medium",
    isStretchFocused: true,
    repRangeOptimal: [8, 12],
    defaultRestSeconds: 120,
  },
  {
    name: "Seated Cable Row",
    muscleGroups: { primary: ["back"], secondary: ["biceps", "rear_delts"] },
    movementPattern: "horizontal_pull",
    equipment: "cable",
    sfrRating: "medium",
    isStretchFocused: false,
    repRangeOptimal: [8, 12],
    defaultRestSeconds: 120,
  },
  {
    name: "Chest-Supported Dumbbell Row",
    muscleGroups: { primary: ["back"], secondary: ["biceps", "rear_delts"] },
    movementPattern: "horizontal_pull",
    equipment: "dumbbell",
    sfrRating: "high",
    isStretchFocused: false,
    repRangeOptimal: [8, 12],
    defaultRestSeconds: 120,
  },

  // ─── Quads ──────────────────────────────────────────────────────────
  {
    name: "Barbell Back Squat",
    muscleGroups: { primary: ["quads"], secondary: ["glutes"] },
    movementPattern: "squat",
    equipment: "barbell",
    sfrRating: "low",
    isStretchFocused: false,
    repRangeOptimal: [6, 10],
    defaultRestSeconds: 180,
  },
  {
    name: "Leg Press",
    muscleGroups: { primary: ["quads"], secondary: ["glutes"] },
    movementPattern: "squat",
    equipment: "machine",
    sfrRating: "low",
    isStretchFocused: false,
    repRangeOptimal: [8, 12],
    defaultRestSeconds: 150,
  },
  {
    name: "Leg Extension",
    muscleGroups: { primary: ["quads"], secondary: [] },
    movementPattern: "isolation",
    equipment: "machine",
    sfrRating: "high",
    isStretchFocused: true,
    repRangeOptimal: [10, 15],
    defaultRestSeconds: 90,
  },
  {
    name: "Hack Squat",
    muscleGroups: { primary: ["quads"], secondary: ["glutes"] },
    movementPattern: "squat",
    equipment: "machine",
    sfrRating: "medium",
    isStretchFocused: true,
    repRangeOptimal: [8, 12],
    defaultRestSeconds: 150,
  },

  // ─── Hamstrings ─────────────────────────────────────────────────────
  {
    name: "Romanian Deadlift",
    muscleGroups: { primary: ["hamstrings"], secondary: ["glutes", "back"] },
    movementPattern: "hip_hinge",
    equipment: "barbell",
    sfrRating: "low",
    isStretchFocused: true,
    repRangeOptimal: [8, 12],
    defaultRestSeconds: 150,
  },
  {
    name: "Lying Leg Curl",
    muscleGroups: { primary: ["hamstrings"], secondary: [] },
    movementPattern: "isolation",
    equipment: "machine",
    sfrRating: "high",
    isStretchFocused: false,
    repRangeOptimal: [10, 15],
    defaultRestSeconds: 90,
  },
  {
    name: "Seated Leg Curl",
    muscleGroups: { primary: ["hamstrings"], secondary: [] },
    movementPattern: "isolation",
    equipment: "machine",
    sfrRating: "high",
    isStretchFocused: true,
    repRangeOptimal: [10, 15],
    defaultRestSeconds: 90,
  },

  // ─── Glutes ─────────────────────────────────────────────────────────
  {
    name: "Hip Thrust",
    muscleGroups: { primary: ["glutes"], secondary: ["hamstrings"] },
    movementPattern: "hip_hinge",
    equipment: "barbell",
    sfrRating: "medium",
    isStretchFocused: false,
    repRangeOptimal: [8, 12],
    defaultRestSeconds: 120,
  },
  {
    name: "Bulgarian Split Squat",
    muscleGroups: { primary: ["glutes", "quads"], secondary: [] },
    movementPattern: "squat",
    equipment: "dumbbell",
    sfrRating: "medium",
    isStretchFocused: true,
    repRangeOptimal: [8, 12],
    defaultRestSeconds: 120,
  },

  // ─── Shoulders ──────────────────────────────────────────────────────
  {
    name: "Overhead Press",
    muscleGroups: { primary: ["front_delts"], secondary: ["triceps"] },
    movementPattern: "vertical_press",
    equipment: "barbell",
    sfrRating: "low",
    isStretchFocused: false,
    repRangeOptimal: [6, 10],
    defaultRestSeconds: 150,
  },
  {
    name: "Dumbbell Lateral Raise",
    muscleGroups: { primary: ["side_delts"], secondary: [] },
    movementPattern: "isolation",
    equipment: "dumbbell",
    sfrRating: "high",
    isStretchFocused: false,
    repRangeOptimal: [12, 20],
    defaultRestSeconds: 60,
  },
  {
    name: "Cable Lateral Raise",
    muscleGroups: { primary: ["side_delts"], secondary: [] },
    movementPattern: "isolation",
    equipment: "cable",
    sfrRating: "high",
    isStretchFocused: true,
    repRangeOptimal: [12, 20],
    defaultRestSeconds: 60,
  },
  {
    name: "Reverse Pec Deck",
    muscleGroups: { primary: ["rear_delts"], secondary: [] },
    movementPattern: "isolation",
    equipment: "machine",
    sfrRating: "high",
    isStretchFocused: false,
    repRangeOptimal: [12, 20],
    defaultRestSeconds: 60,
  },
  {
    name: "Face Pull",
    muscleGroups: { primary: ["rear_delts"], secondary: ["traps"] },
    movementPattern: "horizontal_pull",
    equipment: "cable",
    sfrRating: "high",
    isStretchFocused: false,
    repRangeOptimal: [12, 20],
    defaultRestSeconds: 60,
  },

  // ─── Biceps ─────────────────────────────────────────────────────────
  {
    name: "Barbell Curl",
    muscleGroups: { primary: ["biceps"], secondary: [] },
    movementPattern: "isolation",
    equipment: "barbell",
    sfrRating: "medium",
    isStretchFocused: false,
    repRangeOptimal: [8, 12],
    defaultRestSeconds: 90,
  },
  {
    name: "Incline Dumbbell Curl",
    muscleGroups: { primary: ["biceps"], secondary: [] },
    movementPattern: "isolation",
    equipment: "dumbbell",
    sfrRating: "high",
    isStretchFocused: true,
    repRangeOptimal: [8, 12],
    defaultRestSeconds: 90,
  },
  {
    name: "Hammer Curl",
    muscleGroups: { primary: ["biceps"], secondary: ["forearms"] },
    movementPattern: "isolation",
    equipment: "dumbbell",
    sfrRating: "medium",
    isStretchFocused: false,
    repRangeOptimal: [8, 12],
    defaultRestSeconds: 90,
  },

  // ─── Triceps ────────────────────────────────────────────────────────
  {
    name: "Cable Tricep Pushdown",
    muscleGroups: { primary: ["triceps"], secondary: [] },
    movementPattern: "isolation",
    equipment: "cable",
    sfrRating: "high",
    isStretchFocused: false,
    repRangeOptimal: [10, 15],
    defaultRestSeconds: 90,
  },
  {
    name: "Overhead Tricep Extension",
    muscleGroups: { primary: ["triceps"], secondary: [] },
    movementPattern: "isolation",
    equipment: "cable",
    sfrRating: "high",
    isStretchFocused: true,
    repRangeOptimal: [10, 15],
    defaultRestSeconds: 90,
  },
  {
    name: "Close-Grip Bench Press",
    muscleGroups: { primary: ["triceps"], secondary: ["chest", "front_delts"] },
    movementPattern: "horizontal_press",
    equipment: "barbell",
    sfrRating: "low",
    isStretchFocused: false,
    repRangeOptimal: [6, 10],
    defaultRestSeconds: 150,
  },

  // ─── Calves ─────────────────────────────────────────────────────────
  {
    name: "Standing Calf Raise",
    muscleGroups: { primary: ["calves"], secondary: [] },
    movementPattern: "isolation",
    equipment: "machine",
    sfrRating: "high",
    isStretchFocused: true,
    repRangeOptimal: [10, 15],
    defaultRestSeconds: 60,
  },
  {
    name: "Seated Calf Raise",
    muscleGroups: { primary: ["calves"], secondary: [] },
    movementPattern: "isolation",
    equipment: "machine",
    sfrRating: "high",
    isStretchFocused: true,
    repRangeOptimal: [12, 20],
    defaultRestSeconds: 60,
  },

  // ─── Traps / Abs ───────────────────────────────────────────────────
  {
    name: "Barbell Shrug",
    muscleGroups: { primary: ["traps"], secondary: [] },
    movementPattern: "isolation",
    equipment: "barbell",
    sfrRating: "medium",
    isStretchFocused: false,
    repRangeOptimal: [10, 15],
    defaultRestSeconds: 90,
  },
  {
    name: "Cable Crunch",
    muscleGroups: { primary: ["abs"], secondary: [] },
    movementPattern: "isolation",
    equipment: "cable",
    sfrRating: "high",
    isStretchFocused: false,
    repRangeOptimal: [10, 15],
    defaultRestSeconds: 60,
  },
  {
    name: "Hanging Leg Raise",
    muscleGroups: { primary: ["abs"], secondary: [] },
    movementPattern: "isolation",
    equipment: "bodyweight",
    sfrRating: "medium",
    isStretchFocused: true,
    repRangeOptimal: [10, 15],
    defaultRestSeconds: 60,
  },

  // ─── Compound Extras ───────────────────────────────────────────────
  {
    name: "Conventional Deadlift",
    muscleGroups: { primary: ["back", "hamstrings"], secondary: ["glutes", "traps", "forearms"] },
    movementPattern: "hip_hinge",
    equipment: "barbell",
    sfrRating: "low",
    isStretchFocused: false,
    repRangeOptimal: [4, 8],
    defaultRestSeconds: 240,
  },
  {
    name: "Dip",
    muscleGroups: { primary: ["chest", "triceps"], secondary: ["front_delts"] },
    movementPattern: "vertical_press",
    equipment: "bodyweight",
    sfrRating: "medium",
    isStretchFocused: true,
    repRangeOptimal: [6, 12],
    defaultRestSeconds: 120,
  },
  {
    name: "Farmer's Walk",
    muscleGroups: { primary: ["traps", "forearms"], secondary: ["abs"] },
    movementPattern: "carry",
    equipment: "dumbbell",
    sfrRating: "low",
    isStretchFocused: false,
    repRangeOptimal: [30, 60], // seconds
    defaultRestSeconds: 120,
  },
];

// Default volume landmarks for an intermediate lifter
const defaultLandmarks: { muscleGroup: string; mev: number; mav: number; mrv: number }[] = [
  { muscleGroup: "chest", mev: 8, mav: 14, mrv: 22 },
  { muscleGroup: "back", mev: 8, mav: 14, mrv: 22 },
  { muscleGroup: "quads", mev: 6, mav: 12, mrv: 20 },
  { muscleGroup: "hamstrings", mev: 4, mav: 10, mrv: 16 },
  { muscleGroup: "glutes", mev: 0, mav: 8, mrv: 16 },
  { muscleGroup: "front_delts", mev: 0, mav: 8, mrv: 14 },
  { muscleGroup: "side_delts", mev: 8, mav: 16, mrv: 26 },
  { muscleGroup: "rear_delts", mev: 6, mav: 12, mrv: 22 },
  { muscleGroup: "biceps", mev: 6, mav: 12, mrv: 20 },
  { muscleGroup: "triceps", mev: 4, mav: 10, mrv: 18 },
  { muscleGroup: "calves", mev: 6, mav: 12, mrv: 20 },
  { muscleGroup: "abs", mev: 0, mav: 8, mrv: 16 },
  { muscleGroup: "traps", mev: 0, mav: 8, mrv: 16 },
  { muscleGroup: "forearms", mev: 0, mav: 6, mrv: 12 },
];

async function seed() {
  console.log("Seeding database...\n");

  // 1. Create a default user (for development before auth is wired up)
  console.log("Creating default user...");
  const [user] = await db
    .insert(users)
    .values({
      email: "ryan@trainergpt.dev",
      name: "Ryan",
      experienceLevel: "intermediate",
      trainingAgeMonths: 36,
      availableTrainingDays: 4,
      preferredSplit: "upper_lower",
    })
    .returning();
  console.log(`  Created user: ${user.name} (id: ${user.id})`);

  // 2. Seed exercises
  console.log(`\nSeeding ${exerciseData.length} exercises...`);
  const insertedExercises = await db.insert(exercises).values(exerciseData).returning();
  console.log(`  Inserted ${insertedExercises.length} exercises`);

  // 3. Seed volume landmarks for the default user
  console.log("\nSeeding volume landmarks...");
  const landmarkValues = defaultLandmarks.map((l) => ({
    userId: user.id,
    ...l,
  }));
  await db.insert(userVolumeLandmarks).values(landmarkValues);
  console.log(`  Inserted ${landmarkValues.length} volume landmarks`);

  console.log("\nSeed complete!");
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
