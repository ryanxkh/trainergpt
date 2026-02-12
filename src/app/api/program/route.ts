import { generateObject } from "ai";
import { z } from "zod";
import { model } from "@/lib/ai";
import { db } from "@/lib/db";
import { users, exercises, mesocycles, userVolumeLandmarks } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";

// Zod schema for a complete mesocycle plan
const mesocycleSchema = z.object({
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

export async function POST(req: Request) {
  const session = await auth();
  const userId = session?.user?.id ? parseInt(session.user.id as string) : 1;

  const body = await req.json();
  const { splitType, focusAreas, trainingDays } = body as {
    splitType?: string;
    focusAreas?: string[];
    trainingDays?: number;
  };

  // Fetch user profile and volume landmarks
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
    with: { volumeLandmarks: true },
  });

  // Fetch available exercises
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
- Available training days: ${trainingDays || user?.availableTrainingDays || 4} days/week
- Preferred split: ${splitType || user?.preferredSplit || "upper_lower"}
${focusAreas?.length ? `- Focus areas: ${focusAreas.join(", ")}` : ""}

## Volume Landmarks (weekly sets per muscle group)
${Object.entries(landmarkMap)
  .map(([group, l]) => `- ${group}: MEV=${l.mev}, MAV=${l.mav}, MRV=${l.mrv}`)
  .join("\n")}

## Available Exercises
${exerciseList.map((e) => `- ${e.name} (${(e.muscleGroups as { primary: string[] }).primary.join(", ")}, ${e.movementPattern}, ${e.equipment})`).join("\n")}

## Rules
1. Design a 4-6 week mesocycle with the last week being a deload
2. Start week 1 volume near MEV for each muscle group
3. Progress volume by 1-2 sets per muscle group per week toward MAV
4. Deload week should be ~50% of peak volume with higher RIR (3-4)
5. Use a mix of compound and isolation exercises
6. Prioritize stretch-focused exercises where available
7. Each session should take 45-75 minutes (8-15 exercises total per session)
8. RIR targets: Week 1 = 3 RIR, progress to 1-2 RIR by peak week
9. ONLY use exercises from the available exercises list above
10. Ensure balanced volume across all major muscle groups
${focusAreas?.length ? `11. Give extra volume to focus areas: ${focusAreas.join(", ")}` : ""}`,
  });

  // Save the mesocycle to the database
  const [saved] = await db
    .insert(mesocycles)
    .values({
      userId,
      name: result.object.name,
      splitType: result.object.splitType,
      totalWeeks: result.object.totalWeeks,
      currentWeek: 1,
      status: "active",
      startDate: new Date(),
      volumePlan: result.object.weeks.reduce(
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
      ),
    })
    .returning();

  return Response.json({
    mesocycle: saved,
    plan: result.object,
  });
}
