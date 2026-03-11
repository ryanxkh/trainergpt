"use server";

import { eq, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { users, userVolumeLandmarks } from "@/lib/db/schema";
import { requireUserId } from "@/lib/auth-utils";
import { invalidateCache } from "@/lib/cache";
import { getVolumeLandmarksByLevel } from "@/lib/volume-landmarks";
import { signOut } from "@/lib/auth";

type ProfileInput = {
  name?: string;
  experienceLevel?: "beginner" | "intermediate" | "advanced";
  trainingAgeMonths?: number;
  availableTrainingDays?: number;
  preferredSplit?: "full_body" | "upper_lower" | "push_pull_legs" | "custom";
  equipmentAccess?: "home" | "apartment" | "commercial" | "specialty";
};

export async function getSettingsData() {
  const userId = await requireUserId();

  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
    columns: {
      name: true,
      email: true,
      experienceLevel: true,
      trainingAgeMonths: true,
      availableTrainingDays: true,
      preferredSplit: true,
      equipmentAccess: true,
    },
  });

  if (!user) throw new Error("User not found");

  const landmarks = await db.query.userVolumeLandmarks.findMany({
    where: eq(userVolumeLandmarks.userId, userId),
    columns: {
      muscleGroup: true,
      mev: true,
      mav: true,
      mrv: true,
    },
  });

  return { user, landmarks };
}

export async function updateProfile(
  input: ProfileInput
): Promise<{ success: true } | { success: false; error: string }> {
  try {
    const userId = await requireUserId();

    // Read current experience level to detect changes
    const current = await db.query.users.findFirst({
      where: eq(users.id, userId),
      columns: { experienceLevel: true },
    });

    await db
      .update(users)
      .set({
        ...input,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));

    // If experience level changed, reseed volume landmarks
    if (
      input.experienceLevel &&
      input.experienceLevel !== current?.experienceLevel
    ) {
      await db
        .delete(userVolumeLandmarks)
        .where(eq(userVolumeLandmarks.userId, userId));

      const landmarks = getVolumeLandmarksByLevel(input.experienceLevel);
      await db.insert(userVolumeLandmarks).values(
        landmarks.map((l) => ({
          userId,
          muscleGroup: l.muscleGroup,
          mev: l.mev,
          mav: l.mav,
          mrv: l.mrv,
        }))
      );
    }

    await invalidateCache(userId, ["profile", "volume"]);
    revalidatePath("/settings", "page");
    revalidatePath("/coach", "page");
    revalidatePath("/workout", "page");

    return { success: true };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Failed to update profile",
    };
  }
}

export async function updateVolumeLandmark(
  muscleGroup: string,
  values: { mev: number; mav: number; mrv: number }
): Promise<{ success: true } | { success: false; error: string }> {
  try {
    const userId = await requireUserId();

    await db
      .update(userVolumeLandmarks)
      .set({
        mev: values.mev,
        mav: values.mav,
        mrv: values.mrv,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(userVolumeLandmarks.userId, userId),
          eq(userVolumeLandmarks.muscleGroup, muscleGroup)
        )
      );

    await invalidateCache(userId, ["profile", "volume"]);
    revalidatePath("/settings", "page");
    revalidatePath("/coach", "page");

    return { success: true };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Failed to update landmark",
    };
  }
}

export async function resetVolumeLandmarks(): Promise<
  { success: true } | { success: false; error: string }
> {
  try {
    const userId = await requireUserId();

    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
      columns: { experienceLevel: true },
    });

    const level = user?.experienceLevel ?? "intermediate";

    await db
      .delete(userVolumeLandmarks)
      .where(eq(userVolumeLandmarks.userId, userId));

    const landmarks = getVolumeLandmarksByLevel(level);
    await db.insert(userVolumeLandmarks).values(
      landmarks.map((l) => ({
        userId,
        muscleGroup: l.muscleGroup,
        mev: l.mev,
        mav: l.mav,
        mrv: l.mrv,
      }))
    );

    await invalidateCache(userId, ["profile", "volume"]);
    revalidatePath("/settings", "page");
    revalidatePath("/coach", "page");

    return { success: true };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Failed to reset landmarks",
    };
  }
}

export async function handleSignOut() {
  await signOut({ redirectTo: "/login" });
}
