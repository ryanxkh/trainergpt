/**
 * Production exercise seeder — inserts new exercises AND updates existing ones.
 * Run with: npx tsx src/lib/db/seed-exercises.ts
 */
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { eq } from "drizzle-orm";
import { exercises } from "./schema";
import { exerciseData } from "./exercise-data";
import { config } from "dotenv";
config({ path: ".env.local" });

const sql = neon(process.env.POSTGRES_URL!);
const db = drizzle(sql);

async function seedExercises() {
  console.log("Checking existing exercises...");

  const existing = await db
    .select({ id: exercises.id, name: exercises.name })
    .from(exercises);
  const existingByName = new Map(existing.map((e) => [e.name, e.id]));

  console.log(`  Found ${existingByName.size} existing exercises`);

  // Split into new inserts vs updates
  const newExercises = exerciseData.filter((e) => !existingByName.has(e.name));
  const existingToUpdate = exerciseData.filter((e) => existingByName.has(e.name));

  // Insert new exercises
  if (newExercises.length > 0) {
    console.log(`  Inserting ${newExercises.length} new exercises...`);
    const inserted = await db
      .insert(exercises)
      .values(newExercises)
      .returning();
    console.log(`  Successfully inserted ${inserted.length} exercises`);
  } else {
    console.log("  No new exercises to add.");
  }

  // Update existing exercises with latest data from exercise-data.ts
  if (existingToUpdate.length > 0) {
    console.log(`  Updating ${existingToUpdate.length} existing exercises...`);
    let updated = 0;
    for (const data of existingToUpdate) {
      const id = existingByName.get(data.name)!;
      await db
        .update(exercises)
        .set({
          muscleGroups: data.muscleGroups,
          movementPattern: data.movementPattern,
          equipment: data.equipment,
          sfrRating: data.sfrRating,
          isStretchFocused: data.isStretchFocused,
          repRangeOptimal: data.repRangeOptimal,
          defaultRestSeconds: data.defaultRestSeconds,
        })
        .where(eq(exercises.id, id));
      updated++;
    }
    console.log(`  Successfully updated ${updated} exercises`);
  } else {
    console.log("  No existing exercises to update.");
  }

  console.log(`  Total exercises in DB: ${existing.length + newExercises.length}`);
}

seedExercises().catch((err) => {
  console.error("Seed exercises failed:", err);
  process.exit(1);
});
