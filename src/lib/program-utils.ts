import { generateObject } from "ai";
import { z } from "zod";
import { model } from "@/lib/ai";
import { db } from "@/lib/db";
import {
  users,
  workoutSessions,
} from "@/lib/db/schema";
import { eq } from "drizzle-orm";

// ─── Types ───────────────────────────────────────────────────────────

export type SessionPlanExercise = {
  exerciseName: string;
  muscleGroup: string;
  sets: number;
  repRangeMin: number;
  repRangeMax: number;
  rirTarget: number;
  restSeconds: number;
};

export type SessionPlanSession = {
  dayNumber: number;
  sessionName: string;
  exercises: SessionPlanExercise[];
};

export type SessionPlanWeek = {
  weekNumber: number;
  isDeload: boolean;
  sessions: SessionPlanSession[];
};

export type SessionPlan = {
  weeks: SessionPlanWeek[];
};

// ─── Zod schema for AI generation ────────────────────────────────────

export const mesocycleSchema = z.object({
  name: z.string().describe("Descriptive name for this mesocycle, e.g. 'Hypertrophy Block A'"),
  splitType: z.enum(["full_body", "upper_lower", "push_pull_legs", "custom"])
    .describe("Training split type"),
  totalWeeks: z.number()
    .describe("Total weeks in this mesocycle including deload (3-8 weeks)"),
  weeks: z.array(
    z.object({
      weekNumber: z.number(),
      isDeload: z.boolean().describe("Whether this is a deload week"),
      sessions: z.array(
        z.object({
          dayNumber: z.number().describe("Day of the week (1=Monday, 7=Sunday)"),
          sessionName: z.string().describe("e.g. 'Upper A', 'Push', 'Full Body 1'"),
          exercises: z.array(
            z.object({
              exerciseName: z.string().describe("Name of the exercise"),
              muscleGroup: z.string().describe("Primary muscle group targeted"),
              sets: z.number().describe("Number of working sets (1-6)"),
              repRangeMin: z.number().describe("Bottom of rep range"),
              repRangeMax: z.number().describe("Top of rep range"),
              rirTarget: z.number().describe("Target Reps in Reserve (0-5)"),
              restSeconds: z.number().describe("Rest between sets in seconds"),
            })
          ),
        })
      ),
    })
  ),
});

// ─── Generate mesocycle plan via AI ──────────────────────────────────

export async function generateMesocyclePlan(opts: {
  userId: number;
  splitType?: string;
  trainingDays?: number;
  focusAreas?: string[];
  totalWeeks?: number;
}) {
  const user = await db.query.users.findFirst({
    where: eq(users.id, opts.userId),
    with: { volumeLandmarks: true },
  });

  const exerciseList = await db.query.exercises.findMany();

  const landmarkMap: Record<string, { mev: number; mav: number; mrv: number }> = {};
  if (user) {
    for (const l of user.volumeLandmarks) {
      landmarkMap[l.muscleGroup] = { mev: l.mev, mav: l.mav, mrv: l.mrv };
    }
  }

  const result = await generateObject({
    model,
    schema: mesocycleSchema,
    prompt: `Generate a hypertrophy mesocycle training program for the following user:

## User Profile
- Name: ${user?.name || "User"}
- Experience: ${user?.experienceLevel || "intermediate"}
- Training age: ${user?.trainingAgeMonths || 12} months
- Available training days: ${opts.trainingDays || user?.availableTrainingDays || 4} days/week
- Preferred split: ${opts.splitType || user?.preferredSplit || "upper_lower"}
${opts.focusAreas?.length ? `- Focus areas: ${opts.focusAreas.join(", ")}` : ""}
${opts.totalWeeks ? `- Target mesocycle length: ${opts.totalWeeks} weeks` : ""}

## Volume Landmarks (weekly sets per muscle group)
${Object.entries(landmarkMap)
  .map(([group, l]) => `- ${group}: MEV=${l.mev}, MAV=${l.mav}, MRV=${l.mrv}`)
  .join("\n")}

## Available Exercises
${exerciseList.map((e) => `- ${e.name} (${(e.muscleGroups as { primary: string[] }).primary.join(", ")}, ${e.movementPattern}, ${e.equipment})`).join("\n")}

## Rules
1. Design a ${opts.totalWeeks || "4-6"} week mesocycle with the last week being a deload
2. Start week 1 volume near MEV for each muscle group
3. Progress volume by 1-2 sets per muscle group per week toward MAV
4. Deload week should be ~50% of peak volume with higher RIR (3-4)
5. Use a mix of compound and isolation exercises
6. Prioritize stretch-focused exercises where available
7. Each session should take 45-75 minutes (8-15 exercises total per session)
8. RIR targets: Week 1 = 3 RIR, progress to 1-2 RIR by peak week
9. ONLY use exercises from the available exercises list above
10. Ensure balanced volume across all major muscle groups
${opts.focusAreas?.length ? `11. Give extra volume to focus areas: ${opts.focusAreas.join(", ")}` : ""}`,
  });

  return result.object;
}

// ─── Build volume plan from session plan ──────────────────────────────

export function buildVolumePlan(
  weeks: SessionPlan["weeks"]
): Record<string, Record<string, number>> {
  return weeks.reduce(
    (acc, week) => {
      const weekKey = `week_${week.weekNumber}`;
      acc[weekKey] = {};
      for (const session of week.sessions) {
        for (const ex of session.exercises) {
          acc[weekKey][ex.muscleGroup] =
            (acc[weekKey][ex.muscleGroup] || 0) + ex.sets;
        }
      }
      return acc;
    },
    {} as Record<string, Record<string, number>>
  );
}

// ─── Materialize week sessions ───────────────────────────────────────
// Resolve exercise names → IDs and insert planned workout sessions

export async function materializeWeekSessions(opts: {
  mesocycleId: number;
  userId: number;
  sessionPlan: SessionPlan;
  weekNumber: number;
}): Promise<{ sessionId: number; sessionName: string; dayNumber: number }[]> {
  const week = opts.sessionPlan.weeks.find(
    (w) => w.weekNumber === opts.weekNumber
  );
  if (!week) return [];

  // Load all exercises for name resolution
  const allExercises = await db.query.exercises.findMany();

  const created: { sessionId: number; sessionName: string; dayNumber: number }[] = [];

  for (const session of week.sessions) {
    // Resolve each exercise name to an exercise ID
    const prescribedExercises: {
      exerciseId: number;
      exerciseName: string;
      targetSets: number;
      repRangeMin: number;
      repRangeMax: number;
      rirTarget: number;
      restSeconds: number;
    }[] = [];

    for (const ex of session.exercises) {
      // Try exact match first, then case-insensitive partial match
      let match = allExercises.find(
        (e) => e.name.toLowerCase() === ex.exerciseName.toLowerCase()
      );
      if (!match) {
        match = allExercises.find((e) =>
          e.name.toLowerCase().includes(ex.exerciseName.toLowerCase()) ||
          ex.exerciseName.toLowerCase().includes(e.name.toLowerCase())
        );
      }
      if (match) {
        prescribedExercises.push({
          exerciseId: match.id,
          exerciseName: match.name,
          targetSets: ex.sets,
          repRangeMin: ex.repRangeMin,
          repRangeMax: ex.repRangeMax,
          rirTarget: ex.rirTarget,
          restSeconds: ex.restSeconds,
        });
      }
    }

    if (prescribedExercises.length === 0) continue;

    const [inserted] = await db
      .insert(workoutSessions)
      .values({
        userId: opts.userId,
        mesocycleId: opts.mesocycleId,
        sessionName: session.sessionName,
        date: new Date(),
        mesocycleWeek: opts.weekNumber,
        dayNumber: session.dayNumber,
        isDeload: week.isDeload,
        prescribedExercises,
        status: "planned",
      })
      .returning();

    created.push({
      sessionId: inserted.id,
      sessionName: inserted.sessionName,
      dayNumber: session.dayNumber,
    });
  }

  return created;
}
