"use server";

import { db } from "@/lib/db";
import {
  mesocycles,
  workoutSessions,
  exerciseSets,
} from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { requireUserId } from "@/lib/auth-utils";
import { revalidatePath } from "next/cache";
import {
  buildVolumePlan,
  materializeWeekSessions,
  type SessionPlan,
  type SessionPlanExercise,
} from "@/lib/program-utils";

// ─── Create Deload Week ──────────────────────────────────────────────
// Creates a 1-week deload mesocycle with 50% volume and higher RIR.

export async function createDeloadWeek(
  sourceMesoId: number,
): Promise<{ success: boolean; mesocycleId?: number; error?: string }> {
  const userId = await requireUserId();

  const sourceMeso = await db.query.mesocycles.findFirst({
    where: and(
      eq(mesocycles.id, sourceMesoId),
      eq(mesocycles.userId, userId),
    ),
  });

  if (!sourceMeso) return { success: false, error: "Mesocycle not found." };

  const sourcePlan = sourceMeso.sessionPlan as SessionPlan | null;
  if (!sourcePlan || sourcePlan.weeks.length === 0) {
    return { success: false, error: "No session plan to base deload on." };
  }

  // Use the last week's sessions as the base
  const lastWeek = sourcePlan.weeks[sourcePlan.weeks.length - 1];

  // Build deload plan: 50% volume (halve sets, min 1), RIR 4
  const deloadWeek = {
    weekNumber: 1,
    isDeload: true,
    sessions: lastWeek.sessions.map((session) => ({
      ...session,
      exercises: session.exercises.map((ex) => ({
        ...ex,
        sets: Math.max(1, Math.round(ex.sets * 0.5)),
        rirTarget: 4,
      })),
    })),
  };

  const deloadPlan: SessionPlan = {
    templateSlug: sourcePlan.templateSlug,
    weeks: [deloadWeek],
  };

  const volumePlan = buildVolumePlan(deloadPlan.weeks);

  const [newMeso] = await db
    .insert(mesocycles)
    .values({
      userId,
      name: "Deload Week",
      splitType: sourceMeso.splitType,
      status: "active",
      totalWeeks: 1,
      currentWeek: 1,
      volumePlan,
      sessionPlan: deloadPlan,
      startDate: new Date(),
    })
    .returning();

  await materializeWeekSessions({
    mesocycleId: newMeso.id,
    userId,
    sessionPlan: deloadPlan,
    weekNumber: 1,
  });

  revalidatePath("/program", "page");
  revalidatePath("/workout", "page");

  return { success: true, mesocycleId: newMeso.id };
}

// ─── Re-run Mesocycle with Progression ───────────────────────────────
// Creates a new mesocycle using the same exercises (including swaps)
// from the most recent completed sessions. Sets stay the same — the
// progression is visible via previous performance in the workout UI.

export async function rerunMesocycle(
  sourceMesoId: number,
): Promise<{ success: boolean; mesocycleId?: number; error?: string }> {
  const userId = await requireUserId();

  const sourceMeso = await db.query.mesocycles.findFirst({
    where: and(
      eq(mesocycles.id, sourceMesoId),
      eq(mesocycles.userId, userId),
    ),
  });

  if (!sourceMeso) return { success: false, error: "Mesocycle not found." };

  const sourcePlan = sourceMeso.sessionPlan as SessionPlan | null;
  if (!sourcePlan) {
    return { success: false, error: "No session plan to rerun." };
  }

  // Get the last week's completed sessions to capture exercise swaps
  const lastWeekSessions = await db.query.workoutSessions.findMany({
    where: and(
      eq(workoutSessions.mesocycleId, sourceMesoId),
    ),
    orderBy: [desc(workoutSessions.mesocycleWeek), desc(workoutSessions.id)],
  });

  // Group by session name, take the most recent of each
  const latestByName = new Map<
    string,
    {
      sessionName: string;
      dayNumber: number | null;
      prescribedExercises: {
        exerciseId: number;
        exerciseName: string;
        targetSets: number;
        repRangeMin: number;
        repRangeMax: number;
        rirTarget: number;
        restSeconds: number;
      }[] | null;
    }
  >();

  for (const session of lastWeekSessions) {
    if (
      (session.status === "completed" || session.status === "abandoned") &&
      !latestByName.has(session.sessionName)
    ) {
      latestByName.set(session.sessionName, {
        sessionName: session.sessionName,
        dayNumber: session.dayNumber,
        prescribedExercises: session.prescribedExercises as typeof session.prescribedExercises,
      });
    }
  }

  // Fall back to the source plan if we can't find completed sessions
  const templateWeeks = sourcePlan.weeks.filter((w) => !w.isDeload);
  const baseWeek =
    templateWeeks.length > 0 ? templateWeeks[0] : sourcePlan.weeks[0];

  // Build new plan with same exercises but fresh RIR progression
  const totalWeeks = templateWeeks.length > 0 ? templateWeeks.length : sourcePlan.weeks.length;

  const newWeeks: SessionPlan["weeks"] = [];
  const rirProgression = [3, 2, 1, 0];

  for (let w = 1; w <= totalWeeks; w++) {
    const rir = rirProgression[Math.min(w - 1, rirProgression.length - 1)];

    const sessions = baseWeek.sessions.map((planSession) => {
      // Use the actual exercises from the latest completed session if available
      const actual = latestByName.get(planSession.sessionName);

      if (actual?.prescribedExercises) {
        return {
          dayNumber: actual.dayNumber ?? planSession.dayNumber,
          sessionName: planSession.sessionName,
          exercises: actual.prescribedExercises.map(
            (ex): SessionPlanExercise => ({
              exerciseName: ex.exerciseName,
              muscleGroup: "", // Not critical for materialization
              sets: ex.targetSets,
              repRangeMin: ex.repRangeMin,
              repRangeMax: ex.repRangeMax,
              rirTarget: rir,
              restSeconds: ex.restSeconds,
            }),
          ),
        };
      }

      // Fall back to plan exercises
      return {
        dayNumber: planSession.dayNumber,
        sessionName: planSession.sessionName,
        exercises: planSession.exercises.map(
          (ex): SessionPlanExercise => ({
            ...ex,
            rirTarget: rir,
          }),
        ),
      };
    });

    newWeeks.push({
      weekNumber: w,
      isDeload: false,
      sessions,
    });
  }

  const newPlan: SessionPlan = {
    templateSlug: sourcePlan.templateSlug,
    weeks: newWeeks,
  };

  const volumePlan = buildVolumePlan(newPlan.weeks);

  const [newMeso] = await db
    .insert(mesocycles)
    .values({
      userId,
      name: sourceMeso.name,
      splitType: sourceMeso.splitType,
      status: "active",
      totalWeeks,
      currentWeek: 1,
      volumePlan,
      sessionPlan: newPlan,
      startDate: new Date(),
    })
    .returning();

  await materializeWeekSessions({
    mesocycleId: newMeso.id,
    userId,
    sessionPlan: newPlan,
    weekNumber: 1,
  });

  revalidatePath("/program", "page");
  revalidatePath("/workout", "page");

  return { success: true, mesocycleId: newMeso.id };
}
