import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { exercises, users, userVolumeLandmarks } from "./schema";
import { config } from "dotenv";
import { exerciseData } from "./exercise-data";
config({ path: ".env.local" });

const sql = neon(process.env.POSTGRES_URL!);
const db = drizzle(sql);

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
