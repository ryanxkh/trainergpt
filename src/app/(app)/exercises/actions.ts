"use server";

import { eq, and, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { exercises } from "@/lib/db/schema";
import { requireUserId } from "@/lib/auth-utils";
import { invalidateCache } from "@/lib/cache";

type CreateExerciseInput = {
  name: string;
  primaryMuscles: string[];
  secondaryMuscles: string[];
  movementPattern:
    | "horizontal_press"
    | "vertical_press"
    | "horizontal_pull"
    | "vertical_pull"
    | "squat"
    | "hip_hinge"
    | "isolation"
    | "carry";
  equipment: string;
};

export async function createCustomExercise(
  input: CreateExerciseInput
): Promise<
  { success: true; exerciseId: number } | { success: false; error: string }
> {
  try {
    const userId = await requireUserId();

    // Check for duplicate name among user's custom exercises
    const existing = await db.query.exercises.findFirst({
      where: and(
        eq(exercises.name, input.name),
        eq(exercises.userId, userId)
      ),
    });

    if (existing) {
      return { success: false, error: "You already have an exercise with that name." };
    }

    const [created] = await db
      .insert(exercises)
      .values({
        name: input.name,
        muscleGroups: {
          primary: input.primaryMuscles,
          secondary: input.secondaryMuscles,
        },
        movementPattern: input.movementPattern,
        equipment: input.equipment,
        userId,
      })
      .returning({ id: exercises.id });

    await invalidateCache(userId, ["exercises"]);
    revalidatePath("/exercises", "page");

    return { success: true, exerciseId: created.id };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Failed to create exercise",
    };
  }
}

export async function deleteCustomExercise(
  exerciseId: number
): Promise<{ success: true } | { success: false; error: string }> {
  try {
    const userId = await requireUserId();

    // Only allow deleting user's own exercises
    const exercise = await db.query.exercises.findFirst({
      where: and(
        eq(exercises.id, exerciseId),
        eq(exercises.userId, userId)
      ),
    });

    if (!exercise) {
      return { success: false, error: "Exercise not found or not yours to delete." };
    }

    await db.delete(exercises).where(eq(exercises.id, exerciseId));

    await invalidateCache(userId, ["exercises"]);
    revalidatePath("/exercises", "page");

    return { success: true };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Failed to delete exercise",
    };
  }
}
