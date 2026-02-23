"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { users, userVolumeLandmarks } from "@/lib/db/schema";
import { requireUserId } from "@/lib/auth-utils";
import { invalidateCache } from "@/lib/cache";
import { getVolumeLandmarksByLevel } from "@/lib/volume-landmarks";

type OnboardingInput = {
  experienceLevel: "beginner" | "intermediate" | "advanced";
  availableTrainingDays: number;
  preferredSplit: "full_body" | "upper_lower" | "push_pull_legs";
  equipmentAccess: "home" | "apartment" | "commercial" | "specialty";
};

export async function completeOnboarding(input: OnboardingInput) {
  const userId = await requireUserId();

  // 1. Update user profile + mark onboarding complete
  await db
    .update(users)
    .set({
      experienceLevel: input.experienceLevel,
      availableTrainingDays: input.availableTrainingDays,
      preferredSplit: input.preferredSplit,
      equipmentAccess: input.equipmentAccess,
      onboardingComplete: true,
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId));

  // 2. Delete existing landmarks (idempotent)
  await db
    .delete(userVolumeLandmarks)
    .where(eq(userVolumeLandmarks.userId, userId));

  // 3. Insert landmarks for selected experience level
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

  // 4. Invalidate caches
  await invalidateCache(userId, ["profile", "volume"]);

  // 5. Revalidate pages
  revalidatePath("/coach", "page");
  revalidatePath("/workout", "page");
}
