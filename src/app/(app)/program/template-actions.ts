"use server";

import { db } from "@/lib/db";
import {
  mesocycles,
  workoutSessions,
  exercises,
  userVolumeLandmarks,
  users,
} from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { requireUserId } from "@/lib/auth-utils";
import { revalidatePath } from "next/cache";
import {
  buildProgramPreview,
  previewToSessionPlan,
  type BuilderPreview,
} from "@/lib/program-builder";
import { buildVolumePlan, materializeWeekSessions } from "@/lib/program-utils";
import {
  getTemplateBySlug,
  PROGRAM_TEMPLATES,
} from "@/lib/program-templates";

// ─── Get user data needed for template building ─────────────────────

async function getUserBuildData(userId: number) {
  const [user, allExercises, landmarks] = await Promise.all([
    db.query.users.findFirst({ where: eq(users.id, userId) }),
    db.query.exercises.findMany(), // All exercises (global + custom)
    db.query.userVolumeLandmarks.findMany({
      where: eq(userVolumeLandmarks.userId, userId),
    }),
  ]);

  return { user, exercises: allExercises, landmarks };
}

// ─── Build Template Preview ──────────────────────────────────────────

export async function getTemplatePreview(
  slug: string,
): Promise<BuilderPreview | null> {
  const userId = await requireUserId();
  const template = getTemplateBySlug(slug);
  if (!template) return null;

  const { user, exercises: allExercises, landmarks } =
    await getUserBuildData(userId);

  return buildProgramPreview({
    template,
    exercises: allExercises.map((e) => ({
      id: e.id,
      name: e.name,
      muscleGroups: e.muscleGroups as { primary: string[]; secondary: string[] },
      movementPattern: e.movementPattern,
      equipment: e.equipment,
      sfrRating: e.sfrRating,
      isStretchFocused: e.isStretchFocused,
      repRangeOptimal: e.repRangeOptimal as [number, number] | null,
      defaultRestSeconds: e.defaultRestSeconds,
    })),
    landmarks,
    equipmentAccess: user?.equipmentAccess ?? "commercial",
  });
}

// ─── Start Program from Template ─────────────────────────────────────

export async function startProgramFromTemplate(
  slug: string,
): Promise<{ success: boolean; mesocycleId?: number; error?: string }> {
  const userId = await requireUserId();
  const template = getTemplateBySlug(slug);
  if (!template) return { success: false, error: "Template not found." };

  // Build the personalized program
  const { user, exercises: allExercises, landmarks } =
    await getUserBuildData(userId);

  const preview = buildProgramPreview({
    template,
    exercises: allExercises.map((e) => ({
      id: e.id,
      name: e.name,
      muscleGroups: e.muscleGroups as { primary: string[]; secondary: string[] },
      movementPattern: e.movementPattern,
      equipment: e.equipment,
      sfrRating: e.sfrRating,
      isStretchFocused: e.isStretchFocused,
      repRangeOptimal: e.repRangeOptimal as [number, number] | null,
      defaultRestSeconds: e.defaultRestSeconds,
    })),
    landmarks,
    equipmentAccess: user?.equipmentAccess ?? "commercial",
  });

  // End any active mesocycle (preserve history)
  const activeMeso = await db.query.mesocycles.findFirst({
    where: and(
      eq(mesocycles.userId, userId),
      eq(mesocycles.status, "active"),
    ),
  });

  if (activeMeso) {
    // Mark active meso as completed
    await db
      .update(mesocycles)
      .set({ status: "completed" })
      .where(eq(mesocycles.id, activeMeso.id));

    // Abandon planned/active sessions
    const sessionsToAbandon = await db.query.workoutSessions.findMany({
      where: and(
        eq(workoutSessions.mesocycleId, activeMeso.id),
      ),
    });
    for (const session of sessionsToAbandon) {
      if (session.status === "planned" || session.status === "active") {
        await db
          .update(workoutSessions)
          .set({ status: "abandoned" })
          .where(eq(workoutSessions.id, session.id));
      }
    }
  }

  // Create the SessionPlan
  const sessionPlan = previewToSessionPlan(preview);
  const volumePlan = buildVolumePlan(sessionPlan.weeks);

  // Map split type for DB — "custom" splits still need a valid enum value
  const dbSplitType = template.splitType === "custom"
    ? "custom" as const
    : template.splitType;

  // Create new mesocycle
  const [newMeso] = await db
    .insert(mesocycles)
    .values({
      userId,
      name: template.name,
      splitType: dbSplitType,
      status: "active",
      totalWeeks: template.weeks,
      currentWeek: 1,
      volumePlan,
      sessionPlan,
      startDate: new Date(),
    })
    .returning();

  // Materialize week 1 sessions
  await materializeWeekSessions({
    mesocycleId: newMeso.id,
    userId,
    sessionPlan,
    weekNumber: 1,
  });

  revalidatePath("/program", "page");
  revalidatePath("/workout", "page");

  return { success: true, mesocycleId: newMeso.id };
}

// ─── Get All Templates (for browse page) ─────────────────────────────

export async function getTemplatesForBrowse() {
  return PROGRAM_TEMPLATES.map((t) => ({
    slug: t.slug,
    name: t.name,
    subtitle: t.subtitle,
    description: t.description,
    daysPerWeek: t.daysPerWeek,
    weeks: t.weeks,
    targetLevel: t.targetLevel,
    tags: t.tags,
    sessionCount: t.sessions.length,
    sessionNames: t.sessions.map((s) => s.name),
  }));
}
