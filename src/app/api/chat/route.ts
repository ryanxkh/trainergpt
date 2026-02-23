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

          // Return per-session summaries instead of raw sets (reduces tokens ~60%)
          const summaries = sessions.map((session) => {
            const relevantSets = session.sets.filter((set) => {
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
            });

            // Group sets by exercise for summary
            const exerciseMap = new Map<string, { weights: number[]; reps: number[]; rirs: number[] }>();
            for (const set of relevantSets) {
              const name = set.exercise.name;
              if (!exerciseMap.has(name)) {
                exerciseMap.set(name, { weights: [], reps: [], rirs: [] });
              }
              const entry = exerciseMap.get(name)!;
              entry.weights.push(set.weight);
              entry.reps.push(set.reps);
              if (set.rir !== null) entry.rirs.push(set.rir);
            }

            const exerciseSummaries = Array.from(exerciseMap.entries()).map(
              ([name, data]) => ({
                exercise: name,
                sets: data.weights.length,
                avgWeight: Math.round(data.weights.reduce((s, v) => s + v, 0) / data.weights.length),
                avgReps: +(data.reps.reduce((s, v) => s + v, 0) / data.reps.length).toFixed(1),
                avgRir: data.rirs.length > 0
                  ? +(data.rirs.reduce((s, v) => s + v, 0) / data.rirs.length).toFixed(1)
                  : null,
              })
            );

            return {
              id: session.id,
              date: session.date,
              sessionName: session.sessionName,
              preReadiness: session.preReadiness,
              exerciseCount: exerciseSummaries.length,
              totalSets: relevantSets.length,
              exercises: exerciseSummaries,
            };
          });

          return {
            sessions: summaries,
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

          // Build comparison with computed status and setsRemaining
          function buildComparison(group: string, sets: number) {
            const lm = landmarks[group];
            if (!lm) return { sets, status: "no_landmarks" as const, setsRemaining: null };
            const status =
              sets < lm.mev ? "below_mev" as const :
              sets < lm.mav ? "at_mev" as const :
              sets <= lm.mrv ? "in_range" as const :
              "above_mrv" as const;
            return {
              sets,
              mev: lm.mev,
              mav: lm.mav,
              mrv: lm.mrv,
              status,
              setsRemaining: Math.max(0, lm.mrv - sets),
            };
          }

          if (muscleGroup) {
            const group = muscleGroup.toLowerCase();
            const sets = volume.volumeByGroup[group] || 0;
            return {
              weekStart: volume.weekStart,
              muscleGroups: { [group]: buildComparison(group, sets) },
            };
          }

          const muscleGroups: Record<string, ReturnType<typeof buildComparison>> = {};
          // Include all groups that have volume or landmarks
          const allGroups = new Set([
            ...Object.keys(volume.volumeByGroup),
            ...Object.keys(landmarks),
          ]);
          for (const group of allGroups) {
            muscleGroups[group] = buildComparison(group, volume.volumeByGroup[group] || 0);
          }

          return { weekStart: volume.weekStart, muscleGroups };
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

          // Return only per-session averages, not raw sets (reduces context pollution)
          const trend = Array.from(sessionMap.values())
            .slice(0, lastNSessions)
            .map((session) => ({
              date: session.date,
              setCount: session.sets.length,
              avgWeight: Math.round(
                session.sets.reduce((sum, s) => sum + s.weight, 0) /
                session.sets.length
              ),
              avgReps: +(
                session.sets.reduce((sum, s) => sum + s.reps, 0) /
                session.sets.length
              ).toFixed(1),
              avgRir:
                session.sets.filter((s) => s.rir !== null).length > 0
                  ? +(session.sets
                      .filter((s) => s.rir !== null)
                      .reduce((sum, s) => sum + s.rir!, 0) /
                    session.sets.filter((s) => s.rir !== null).length).toFixed(1)
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

          // Return only id, name, equipment — coach already knows muscle groups
          // from the search filter (~58% token reduction)
          return {
            exercises: filtered.map((e) => ({
              id: e.id,
              name: e.name,
              equipment: e.equipment,
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
          // ── Guard: check for existing active session ──
          const existingActive = await db.query.workoutSessions.findFirst({
            where: and(
              eq(workoutSessions.userId, userId),
              eq(workoutSessions.status, "active"),
            ),
          });
          if (existingActive) {
            return {
              success: false,
              error: `You already have an active session: "${existingActive.sessionName}". Complete or abandon it before starting a new one.`,
            };
          }

          // ── Verification step: validate before inserting ──

          // 1. Validate exercise IDs exist
          const exerciseIds = prescribedExercises.map((e) => e.exerciseId);
          const validExercises = await db.query.exercises.findMany({
            where: sql`${exercises.id} = ANY(ARRAY[${sql.raw(exerciseIds.join(","))}]::int[])`,
          });
          const validIds = new Set(validExercises.map((e) => e.id));
          const invalidIds = exerciseIds.filter((id) => !validIds.has(id));
          if (invalidIds.length > 0) {
            return {
              success: false,
              error: `Invalid exercise IDs: ${invalidIds.join(", ")}. Call getExerciseLibrary to get valid IDs.`,
            };
          }

          // 2. Check volume vs MRV — compute new volume per muscle group
          const volume = await getCachedVolume(userId);
          const profile = await getCachedProfile(userId);
          const landmarks = profile?.volumeLandmarks ?? {};

          const newVolume: Record<string, number> = {};
          for (const prescribed of prescribedExercises) {
            const ex = validExercises.find((e) => e.id === prescribed.exerciseId);
            if (!ex) continue;
            const mg = ex.muscleGroups as { primary: string[]; secondary: string[] };
            for (const group of mg.primary) {
              newVolume[group] = (newVolume[group] || 0) + prescribed.targetSets;
            }
            // Compound secondary counts 50%
            for (const group of mg.secondary) {
              newVolume[group] = (newVolume[group] || 0) + Math.ceil(prescribed.targetSets * 0.5);
            }
          }

          const violations: string[] = [];
          for (const [group, newSets] of Object.entries(newVolume)) {
            const lm = landmarks[group];
            if (!lm) continue;
            const currentSets = volume.volumeByGroup[group] || 0;
            const totalSets = currentSets + newSets;
            if (totalSets > lm.mrv) {
              violations.push(
                `${group}: ${currentSets} existing + ${newSets} new = ${totalSets} sets (MRV: ${lm.mrv})`
              );
            }
          }

          if (violations.length > 0) {
            return {
              success: false,
              error: `This workout would exceed MRV for: ${violations.join("; ")}. Reduce sets or choose different muscle groups.`,
            };
          }

          // ── All checks passed — create the session ──
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
            success: true,
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
          setType: z
            .enum(["normal", "myorep", "dropset"])
            .optional()
            .describe("Set type: normal (default), myorep (myo-rep match set), or dropset"),
        }),
        execute: async ({ exerciseName, weight, reps, rir, setType }) => {
          // Find active session
          const activeSession = await db.query.workoutSessions.findFirst({
            where: and(
              eq(workoutSessions.userId, userId),
              eq(workoutSessions.status, "active"),
            ),
            orderBy: [desc(workoutSessions.date)],
          });

          if (!activeSession) {
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
              setType: setType ?? "normal",
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

      completeWorkoutSession: tool({
        description:
          "Mark the user's active workout session as completed or abandoned. Use when the user says they're done or wants to stop early.",
        inputSchema: z.object({
          abandoned: z
            .boolean()
            .default(false)
            .describe("True if the user is stopping early without finishing"),
          postNotes: z
            .string()
            .optional()
            .describe("Optional notes about the session"),
        }),
        execute: async ({ abandoned, postNotes }) => {
          const activeSession = await db.query.workoutSessions.findFirst({
            where: and(
              eq(workoutSessions.userId, userId),
              eq(workoutSessions.status, "active"),
            ),
            with: {
              sets: {
                with: { exercise: true },
              },
            },
          });

          if (!activeSession) {
            return {
              success: false,
              error: "No active workout session to complete.",
            };
          }

          const newStatus = abandoned ? "abandoned" : "completed";
          const durationMinutes = abandoned
            ? null
            : Math.round(
                (Date.now() - new Date(activeSession.date).getTime()) / 60000
              );

          await db
            .update(workoutSessions)
            .set({
              status: newStatus,
              durationMinutes,
              postNotes: postNotes ?? null,
            })
            .where(eq(workoutSessions.id, activeSession.id));

          await invalidateCache(userId, ["volume"]);
          revalidatePath("/workout", "page");

          // Build summary
          const exerciseMap = new Map<string, number>();
          for (const set of activeSession.sets) {
            const name = set.exercise.name;
            exerciseMap.set(name, (exerciseMap.get(name) ?? 0) + 1);
          }

          return {
            success: true,
            sessionName: activeSession.sessionName,
            status: newStatus,
            durationMinutes,
            totalSets: activeSession.sets.length,
            exercises: Array.from(exerciseMap.entries()).map(
              ([name, sets]) => ({ exercise: name, sets })
            ),
          };
        },
      }),
    },
    stopWhen: stepCountIs(7),
  });

  return result.toUIMessageStreamResponse();
}
