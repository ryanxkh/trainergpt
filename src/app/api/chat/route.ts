import { streamText, tool, stepCountIs, convertToModelMessages } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { z } from "zod";
import { COACH_SYSTEM_PROMPT, ADVANCED_COACHING_ADDENDUM } from "@/lib/ai";
import { db } from "@/lib/db";
import {
  exercises,
  exerciseSets,
  workoutSessions,
  users,
  userVolumeLandmarks,
} from "@/lib/db/schema";
import { eq, desc, sql, and, gte, ilike } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { getCachedVolume, getCachedProfile, getDeloadRecommendation } from "@/lib/cache";
import { aiModel, enableAdvancedCoaching } from "@/lib/flags";

export async function POST(req: Request) {
  const session = await auth();
  const userId = session?.user?.id ? parseInt(session.user.id as string) : 1;

  // Feature flags — resolved from Edge Config (no redeploy needed)
  const [modelId, advancedCoaching] = await Promise.all([
    aiModel(),
    enableAdvancedCoaching(),
  ]);

  const systemPrompt = advancedCoaching
    ? `${COACH_SYSTEM_PROMPT}\n\n${ADVANCED_COACHING_ADDENDUM}`
    : COACH_SYSTEM_PROMPT;

  const { messages } = await req.json();

  const result = streamText({
    model: anthropic(modelId),
    system: systemPrompt,
    messages: await convertToModelMessages(messages),
    tools: {
      getWorkoutHistory: tool({
        description:
          "Get recent workout history for a specific muscle group or exercise. Use this to check what the user did in previous sessions before making recommendations.",
        inputSchema: z.object({
          muscleGroup: z
            .string()
            .optional()
            .describe("Muscle group to filter by (e.g. chest, back, quads)"),
          exerciseName: z
            .string()
            .optional()
            .describe("Specific exercise name to look up"),
          lastNSessions: z
            .number()
            .default(3)
            .describe("Number of recent sessions to retrieve"),
        }),
        execute: async ({ muscleGroup, exerciseName, lastNSessions }) => {
          // Get recent workout sessions for this user
          const sessions = await db.query.workoutSessions.findMany({
            where: eq(workoutSessions.userId, userId),
            orderBy: [desc(workoutSessions.date)],
            limit: lastNSessions,
            with: {
              sets: {
                with: {
                  exercise: true,
                },
              },
            },
          });

          // Filter sets by muscle group or exercise name if specified
          const filtered = sessions.map((session) => ({
            id: session.id,
            date: session.date,
            sessionName: session.sessionName,
            preReadiness: session.preReadiness,
            sets: session.sets.filter((set) => {
              if (exerciseName) {
                return set.exercise.name
                  .toLowerCase()
                  .includes(exerciseName.toLowerCase());
              }
              if (muscleGroup) {
                const mg = set.exercise.muscleGroups;
                return (
                  mg.primary.includes(muscleGroup.toLowerCase()) ||
                  mg.secondary.includes(muscleGroup.toLowerCase())
                );
              }
              return true;
            }).map((set) => ({
              exercise: set.exercise.name,
              setNumber: set.setNumber,
              weight: set.weight,
              reps: set.reps,
              rir: set.rir,
              rpe: set.rpe,
              restSeconds: set.restSeconds,
            })),
          }));

          return {
            sessions: filtered,
            totalSessions: sessions.length,
          };
        },
      }),

      getVolumeThisWeek: tool({
        description:
          "Calculate the user's total volume (hard sets) per muscle group for the current week. Compare against their volume landmarks (MEV/MAV/MRV).",
        inputSchema: z.object({
          muscleGroup: z
            .string()
            .optional()
            .describe(
              "Specific muscle group to check, or omit for all groups"
            ),
        }),
        execute: async ({ muscleGroup }) => {
          const volume = await getCachedVolume(userId);

          // Also get landmarks for comparison
          const profile = await getCachedProfile(userId);
          const landmarks = profile?.volumeLandmarks ?? {};

          // Filter to specific muscle group if requested
          if (muscleGroup) {
            const group = muscleGroup.toLowerCase();
            return {
              volumeByGroup: { [group]: volume.volumeByGroup[group] || 0 },
              landmarks: landmarks[group]
                ? { [group]: landmarks[group] }
                : {},
              weekStart: volume.weekStart,
            };
          }

          return {
            volumeByGroup: volume.volumeByGroup,
            landmarks,
            weekStart: volume.weekStart,
          };
        },
      }),

      getProgressionTrend: tool({
        description:
          "Analyze the progression trend for a specific exercise over recent sessions. Returns weight, reps, and RPE changes to determine if the user should increase load.",
        inputSchema: z.object({
          exerciseName: z.string().describe("Exercise name to analyze"),
          lastNSessions: z
            .number()
            .default(4)
            .describe("Number of sessions to analyze"),
        }),
        execute: async ({ exerciseName, lastNSessions }) => {
          // Find the exercise by name (fuzzy match)
          const matchingExercises = await db.query.exercises.findMany({
            where: ilike(exercises.name, `%${exerciseName}%`),
            limit: 1,
          });

          if (matchingExercises.length === 0) {
            return {
              trend: [],
              recommendation: `No exercise found matching "${exerciseName}".`,
            };
          }

          const exercise = matchingExercises[0];

          // Get recent sets for this exercise, grouped by session
          const recentSets = await db
            .select({
              sessionId: workoutSessions.id,
              sessionDate: workoutSessions.date,
              setNumber: exerciseSets.setNumber,
              weight: exerciseSets.weight,
              reps: exerciseSets.reps,
              rir: exerciseSets.rir,
              rpe: exerciseSets.rpe,
            })
            .from(exerciseSets)
            .innerJoin(
              workoutSessions,
              eq(exerciseSets.sessionId, workoutSessions.id)
            )
            .where(
              and(
                eq(exerciseSets.exerciseId, exercise.id),
                eq(workoutSessions.userId, userId)
              )
            )
            .orderBy(desc(workoutSessions.date), exerciseSets.setNumber);

          // Group by session
          const sessionMap = new Map<
            number,
            {
              date: Date;
              sets: { setNumber: number; weight: number; reps: number; rir: number | null; rpe: number | null }[];
            }
          >();
          for (const row of recentSets) {
            if (!sessionMap.has(row.sessionId)) {
              sessionMap.set(row.sessionId, {
                date: row.sessionDate,
                sets: [],
              });
            }
            sessionMap.get(row.sessionId)!.sets.push({
              setNumber: row.setNumber,
              weight: row.weight,
              reps: row.reps,
              rir: row.rir,
              rpe: row.rpe,
            });
          }

          // Convert to array, limit to lastNSessions
          const trend = Array.from(sessionMap.values())
            .slice(0, lastNSessions)
            .map((session) => ({
              date: session.date,
              sets: session.sets,
              avgWeight:
                session.sets.reduce((sum, s) => sum + s.weight, 0) /
                session.sets.length,
              avgReps:
                session.sets.reduce((sum, s) => sum + s.reps, 0) /
                session.sets.length,
              avgRir:
                session.sets.filter((s) => s.rir !== null).length > 0
                  ? session.sets
                      .filter((s) => s.rir !== null)
                      .reduce((sum, s) => sum + s.rir!, 0) /
                    session.sets.filter((s) => s.rir !== null).length
                  : null,
            }));

          // Generate recommendation
          let recommendation: string | null = null;
          if (trend.length >= 2) {
            const latest = trend[0];
            const previous = trend[1];
            const repRange = exercise.repRangeOptimal as [number, number];

            if (
              latest.avgReps >= repRange[1] &&
              latest.avgRir !== null &&
              latest.avgRir <= 2
            ) {
              recommendation = `User hit top of rep range (${repRange[1]}) at ≤2 RIR. Recommend increasing weight by 2.5-5% next session.`;
            } else if (
              latest.avgRir !== null &&
              latest.avgRir >= 3
            ) {
              recommendation = `User at ${latest.avgRir.toFixed(1)} RIR — still has room. Maintain weight and push closer to failure.`;
            } else if (
              latest.avgReps < repRange[0] &&
              latest.avgRir !== null &&
              latest.avgRir <= 0
            ) {
              recommendation = `User missed bottom of rep range at 0 RIR. Consider reducing weight by 5-10%.`;
            } else if (latest.avgWeight > previous.avgWeight) {
              recommendation = `Weight increased from ${previous.avgWeight}lbs to ${latest.avgWeight}lbs — progressive overload on track.`;
            }
          }

          return {
            exercise: exercise.name,
            repRangeOptimal: exercise.repRangeOptimal,
            trend,
            recommendation,
          };
        },
      }),

      getUserProfile: tool({
        description:
          "Get the user's profile including experience level, training preferences, and personalized volume landmarks.",
        inputSchema: z.object({}),
        execute: async () => {
          const profile = await getCachedProfile(userId);

          if (!profile) {
            return {
              profile: null,
              volumeLandmarks: {},
              activeMesocycle: null,
            };
          }

          // Also include deload recommendation if available
          const deload = await getDeloadRecommendation(userId);

          return {
            ...profile,
            deloadRecommendation: deload,
          };
        },
      }),
    },
    stopWhen: stepCountIs(5),
  });

  return result.toUIMessageStreamResponse();
}
