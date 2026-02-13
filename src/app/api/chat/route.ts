import { streamText, tool, stepCountIs, convertToModelMessages } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { z } from "zod";
import { COACH_SYSTEM_PROMPT, ADVANCED_COACHING_ADDENDUM } from "@/lib/ai";
import { db } from "@/lib/db";
import {
  exercises,
  exerciseSets,
  workoutSessions,
} from "@/lib/db/schema";
import { eq, desc, and, ilike, sql } from "drizzle-orm";
import { requireUserId } from "@/lib/auth-utils";
import {
  getCachedVolume,
  getCachedProfile,
  getCachedExercises,
  getDeloadRecommendation,
  invalidateCache,
} from "@/lib/cache";
import { aiModel, enableAdvancedCoaching } from "@/lib/flags";
import { revalidatePath } from "next/cache";

export async function POST(req: Request) {
  const userId = await requireUserId();

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

          const filtered = sessions.map((session) => ({
            id: session.id,
            date: session.date,
            sessionName: session.sessionName,
            preReadiness: session.preReadiness,
            sets: session.sets
              .filter((set) => {
                if (exerciseName) {
                  return set.exercise.name
                    .toLowerCase()
                    .includes(exerciseName.toLowerCase());
                }
                if (muscleGroup) {
                  const mg = set.exercise.muscleGroups as {
                    primary: string[];
                    secondary: string[];
                  };
                  return (
                    mg.primary.includes(muscleGroup.toLowerCase()) ||
                    mg.secondary.includes(muscleGroup.toLowerCase())
                  );
                }
                return true;
              })
              .map((set) => ({
                exercise: set.exercise.name,
                setNumber: set.setNumber,
                weight: set.weight,
                reps: set.reps,
                rir: set.rir,
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
          const profile = await getCachedProfile(userId);
          const landmarks = profile?.volumeLandmarks ?? {};

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
          "Analyze the progression trend for a specific exercise over recent sessions. Returns weight, reps, and RIR changes to determine if the user should increase load.",
        inputSchema: z.object({
          exerciseName: z.string().describe("Exercise name to analyze"),
          lastNSessions: z
            .number()
            .default(4)
            .describe("Number of sessions to analyze"),
        }),
        execute: async ({ exerciseName, lastNSessions }) => {
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

          const recentSets = await db
            .select({
              sessionId: workoutSessions.id,
              sessionDate: workoutSessions.date,
              setNumber: exerciseSets.setNumber,
              weight: exerciseSets.weight,
              reps: exerciseSets.reps,
              rir: exerciseSets.rir,
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

          const sessionMap = new Map<
            number,
            {
              date: Date;
              sets: {
                setNumber: number;
                weight: number;
                reps: number;
                rir: number | null;
              }[];
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
            });
          }

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
            } else if (latest.avgRir !== null && latest.avgRir >= 3) {
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

          const deload = await getDeloadRecommendation(userId);

          return {
            ...profile,
            deloadRecommendation: deload,
          };
        },
      }),

      getExerciseLibrary: tool({
        description:
          "Search the exercise library by muscle group, name, or equipment. Returns exercise IDs needed for prescribing workouts. Always call this before prescribeWorkout to get valid exercise IDs.",
        inputSchema: z.object({
          muscleGroup: z
            .string()
            .optional()
            .describe(
              "Filter by primary muscle group (e.g. chest, back, quads, hamstrings, glutes, biceps, triceps, side_delts, rear_delts, front_delts, calves, abs, traps, forearms)"
            ),
          searchTerm: z
            .string()
            .optional()
            .describe("Search by exercise name (partial match)"),
          equipment: z
            .string()
            .optional()
            .describe(
              "Filter by equipment (barbell, dumbbell, cable, machine, bodyweight)"
            ),
        }),
        execute: async ({ muscleGroup, searchTerm, equipment }) => {
          const allExercises = await getCachedExercises();

          let filtered = allExercises;

          if (muscleGroup) {
            const group = muscleGroup.toLowerCase();
            filtered = filtered.filter((e) =>
              e.muscleGroups.primary.includes(group)
            );
          }

          if (searchTerm) {
            const term = searchTerm.toLowerCase();
            filtered = filtered.filter((e) =>
              e.name.toLowerCase().includes(term)
            );
          }

          if (equipment) {
            const eq = equipment.toLowerCase();
            filtered = filtered.filter(
              (e) => e.equipment.toLowerCase() === eq
            );
          }

          return {
            exercises: filtered.map((e) => ({
              id: e.id,
              name: e.name,
              muscleGroups: e.muscleGroups,
              equipment: e.equipment,
              movementPattern: e.movementPattern,
            })),
            count: filtered.length,
          };
        },
      }),

      prescribeWorkout: tool({
        description:
          "Create a new workout session with prescribed exercises. Call getExerciseLibrary first to get valid exercise IDs. Returns the session ID.",
        inputSchema: z.object({
          sessionName: z
            .string()
            .describe(
              "Name for the workout session (e.g. 'Upper Body A', 'Push Day', 'Legs')"
            ),
          exercises: z
            .array(
              z.object({
                exerciseId: z
                  .number()
                  .describe("Exercise ID from the exercise library"),
                exerciseName: z
                  .string()
                  .describe("Exercise name for display"),
                targetSets: z
                  .number()
                  .describe("Number of sets to perform (typically 2-5)"),
                repRangeMin: z
                  .number()
                  .describe("Minimum reps per set"),
                repRangeMax: z
                  .number()
                  .describe("Maximum reps per set"),
                rirTarget: z
                  .number()
                  .describe("Target RIR (Reps in Reserve, typically 1-3)"),
                restSeconds: z
                  .number()
                  .describe(
                    "Rest between sets in seconds (60-300)"
                  ),
              })
            )
            .describe("Array of exercises to prescribe"),
        }),
        execute: async ({ sessionName, exercises: prescribedExercises }) => {
          const [session] = await db
            .insert(workoutSessions)
            .values({
              userId,
              sessionName,
              date: new Date(),
              prescribedExercises,
            })
            .returning();

          revalidatePath("/workout", "page");

          return {
            sessionId: session.id,
            sessionName: session.sessionName,
            exerciseCount: prescribedExercises.length,
            totalSets: prescribedExercises.reduce(
              (sum, e) => sum + e.targetSets,
              0
            ),
            message:
              "Workout created! Head to the Today tab to start logging sets.",
          };
        },
      }),

      logWorkoutSet: tool({
        description:
          "Log a completed set for an exercise in the user's active workout session. Finds the active session automatically. Use when the user reports completing a set.",
        inputSchema: z.object({
          exerciseName: z
            .string()
            .describe(
              "Exercise name (fuzzy match — e.g. 'bench' matches 'Barbell Bench Press')"
            ),
          weight: z.number().describe("Weight used in lbs"),
          reps: z.number().describe("Number of reps completed"),
          rir: z
            .number()
            .optional()
            .describe("Reps in Reserve (0-5)"),
        }),
        execute: async ({ exerciseName, weight, reps, rir }) => {
          // Find active session (no durationMinutes = still in progress)
          const activeSessions = await db.query.workoutSessions.findMany({
            where: eq(workoutSessions.userId, userId),
            orderBy: [desc(workoutSessions.date)],
            limit: 1,
          });

          const activeSession = activeSessions[0];
          if (!activeSession || activeSession.durationMinutes !== null) {
            return {
              success: false,
              error:
                "No active workout session. Ask me to prescribe a workout first.",
            };
          }

          // Find exercise by name (fuzzy match)
          const matchingExercises = await db.query.exercises.findMany({
            where: ilike(exercises.name, `%${exerciseName}%`),
            limit: 1,
          });

          if (matchingExercises.length === 0) {
            return {
              success: false,
              error: `No exercise found matching "${exerciseName}". Try a more specific name.`,
            };
          }

          const exercise = matchingExercises[0];

          // Calculate set number (count existing sets for this exercise in this session)
          const existingSets = await db
            .select({ count: sql<number>`count(*)::int` })
            .from(exerciseSets)
            .where(
              and(
                eq(exerciseSets.sessionId, activeSession.id),
                eq(exerciseSets.exerciseId, exercise.id)
              )
            );

          const setNumber = (existingSets[0]?.count ?? 0) + 1;

          const [newSet] = await db
            .insert(exerciseSets)
            .values({
              sessionId: activeSession.id,
              exerciseId: exercise.id,
              setNumber,
              weight,
              reps,
              rir: rir ?? null,
            })
            .returning();

          await invalidateCache(userId, ["volume"]);
          revalidatePath("/workout", "page");

          return {
            success: true,
            exercise: exercise.name,
            setNumber,
            weight,
            reps,
            rir: rir ?? null,
          };
        },
      }),
    },
    stopWhen: stepCountIs(5),
  });

  return result.toUIMessageStreamResponse();
}
