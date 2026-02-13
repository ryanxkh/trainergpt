/**
 * Production exercise seeder — only inserts exercises that don't already exist.
 * Run with: npx tsx src/lib/db/seed-exercises.ts
 */
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { exercises } from "./schema";
import { exerciseData } from "./exercise-data";
import { config } from "dotenv";
config({ path: ".env.local" });

const sql = neon(process.env.POSTGRES_URL!);
const db = drizzle(sql);

async function seedExercises() {
  console.log("Checking existing exercises...");

  const existing = await db.select({ name: exercises.name }).from(exercises);
  const existingNames = new Set(existing.map((e) => e.name));

  console.log(`  Found ${existingNames.size} existing exercises`);

  const newExercises = exerciseData.filter((e) => !existingNames.has(e.name));

  if (newExercises.length === 0) {
    console.log("  No new exercises to add. All up to date!");
    return;
  }

  console.log(`  Inserting ${newExercises.length} new exercises...`);

  const inserted = await db
    .insert(exercises)
    .values(newExercises)
    .returning();

  console.log(`  Successfully inserted ${inserted.length} exercises`);
  console.log(`  Total exercises in DB: ${existingNames.size + inserted.length}`);
}

seedExercises().catch((err) => {
  console.error("Seed exercises failed:", err);
  process.exit(1);
});
