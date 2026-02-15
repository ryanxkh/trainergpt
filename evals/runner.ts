// Coach eval runner — executes scenarios against the real model with mock tools
//
// Usage:
//   npx tsx evals/runner.ts                    # run all evals
//   npx tsx evals/runner.ts policy-001         # run specific eval
//   npx tsx evals/runner.ts --category policy  # run category

import { generateText, tool, stepCountIs } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { z } from "zod";
import { config } from "dotenv";
import { COACH_SYSTEM_PROMPT, ADVANCED_COACHING_ADDENDUM } from "../src/lib/ai";
import { EVAL_SCENARIOS } from "./scenarios";
import type { CoachEval, EvalFixtures, EvalResult } from "./types";

config({ path: ".env.local" });

// ─── Mock Tool Factory ──────────────────────────────────────────────

function createMockTools(fixtures: EvalFixtures, toolCallLog: { toolName: string; args: Record<string, unknown> }[]) {
  return {
    getWorkoutHistory: tool({
      description:
        "Get recent workout history for a specific muscle group or exercise. Use this to check what the user did in previous sessions before making recommendations.",
      inputSchema: z.object({
        muscleGroup: z.string().optional().describe("Muscle group to filter by"),
        exerciseName: z.string().optional().describe("Specific exercise name"),
        lastNSessions: z.number().default(3).describe("Number of sessions to retrieve"),
      }),
      execute: async (args) => {
        toolCallLog.push({ toolName: "getWorkoutHistory", args });
        const sessions = fixtures.workoutHistory.slice(0, args.lastNSessions);
        // Return per-session summaries (matches new route.ts format)
        const summaries = sessions.map((s) => {
          const relevantSets = s.sets.filter((set) => {
            if (args.exerciseName) return set.exercise.toLowerCase().includes(args.exerciseName.toLowerCase());
            return true;
          });
          const exerciseMap = new Map<string, { weights: number[]; reps: number[]; rirs: number[] }>();
          for (const set of relevantSets) {
            if (!exerciseMap.has(set.exercise)) {
              exerciseMap.set(set.exercise, { weights: [], reps: [], rirs: [] });
            }
            const entry = exerciseMap.get(set.exercise)!;
            entry.weights.push(set.weight);
            entry.reps.push(set.reps);
            if (set.rir !== null) entry.rirs.push(set.rir!);
          }
          return {
            id: s.id,
            date: s.date,
            sessionName: s.sessionName,
            preReadiness: s.preReadiness,
            exerciseCount: exerciseMap.size,
            totalSets: relevantSets.length,
            exercises: Array.from(exerciseMap.entries()).map(([name, data]) => ({
              exercise: name,
              sets: data.weights.length,
              avgWeight: Math.round(data.weights.reduce((a, b) => a + b, 0) / data.weights.length),
              avgReps: +(data.reps.reduce((a, b) => a + b, 0) / data.reps.length).toFixed(1),
              avgRir: data.rirs.length > 0 ? +(data.rirs.reduce((a, b) => a + b, 0) / data.rirs.length).toFixed(1) : null,
            })),
          };
        });
        return { sessions: summaries, totalSessions: sessions.length };
      },
    }),

    getVolumeThisWeek: tool({
      description:
        "Calculate the user's total volume (hard sets) per muscle group for the current week. Compare against their volume landmarks (MEV/MAV/MRV).",
      inputSchema: z.object({
        muscleGroup: z.string().optional().describe("Specific muscle group, or omit for all"),
      }),
      execute: async (args) => {
        toolCallLog.push({ toolName: "getVolumeThisWeek", args });
        const landmarks = fixtures.profile?.volumeLandmarks ?? {};

        function buildComparison(group: string, sets: number) {
          const lm = landmarks[group];
          if (!lm) return { sets, status: "no_landmarks" as const, setsRemaining: null };
          const status =
            sets < lm.mev ? "below_mev" as const :
            sets < lm.mav ? "at_mev" as const :
            sets <= lm.mrv ? "in_range" as const :
            "above_mrv" as const;
          return { sets, mev: lm.mev, mav: lm.mav, mrv: lm.mrv, status, setsRemaining: Math.max(0, lm.mrv - sets) };
        }

        if (args.muscleGroup) {
          const g = args.muscleGroup.toLowerCase();
          const sets = fixtures.volumeThisWeek.volumeByGroup[g] || 0;
          return { weekStart: fixtures.volumeThisWeek.weekStart, muscleGroups: { [g]: buildComparison(g, sets) } };
        }

        const muscleGroups: Record<string, ReturnType<typeof buildComparison>> = {};
        const allGroups = new Set([
          ...Object.keys(fixtures.volumeThisWeek.volumeByGroup),
          ...Object.keys(landmarks),
        ]);
        for (const group of allGroups) {
          muscleGroups[group] = buildComparison(group, fixtures.volumeThisWeek.volumeByGroup[group] || 0);
        }
        return { weekStart: fixtures.volumeThisWeek.weekStart, muscleGroups };
      },
    }),

    getProgressionTrend: tool({
      description:
        "Analyze the progression trend for a specific exercise over recent sessions.",
      inputSchema: z.object({
        exerciseName: z.string().describe("Exercise name to analyze"),
        lastNSessions: z.number().default(4).describe("Number of sessions to analyze"),
      }),
      execute: async (args) => {
        toolCallLog.push({ toolName: "getProgressionTrend", args });
        // Group matching sets by session to create per-session trend entries
        const sessionsWithExercise = fixtures.workoutHistory
          .map((s) => ({
            date: s.date,
            sets: s.sets.filter((set) => set.exercise.toLowerCase().includes(args.exerciseName.toLowerCase())),
          }))
          .filter((s) => s.sets.length > 0);

        if (sessionsWithExercise.length === 0) {
          return { trend: [], recommendation: `No data found for "${args.exerciseName}".` };
        }

        const trend = sessionsWithExercise.slice(0, args.lastNSessions).map((s) => {
          const avgWeight = Math.round(s.sets.reduce((a, v) => a + v.weight, 0) / s.sets.length);
          const avgReps = +(s.sets.reduce((a, v) => a + v.reps, 0) / s.sets.length).toFixed(1);
          const rirsOnly = s.sets.filter((x) => x.rir !== null);
          const avgRir = rirsOnly.length > 0 ? +(rirsOnly.reduce((a, v) => a + v.rir!, 0) / rirsOnly.length).toFixed(1) : null;
          return { date: s.date, setCount: s.sets.length, avgWeight, avgReps, avgRir };
        });

        const latest = trend[0];
        let recommendation: string | null = null;
        if (latest.avgReps >= 10 && latest.avgRir !== null && latest.avgRir <= 2) {
          recommendation = `User hitting top of rep range at ≤2 RIR. Recommend increasing weight by 2.5-5%.`;
        } else if (latest.avgRir !== null && latest.avgRir >= 3) {
          recommendation = `User at ${latest.avgRir} RIR — still has room. Maintain weight and push closer to failure.`;
        }

        return {
          exercise: sessionsWithExercise[0].sets[0].exercise,
          repRangeOptimal: [8, 12],
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
        toolCallLog.push({ toolName: "getUserProfile", args: {} });
        if (!fixtures.profile) {
          return { profile: null, volumeLandmarks: {}, activeMesocycle: null, deloadRecommendation: null };
        }
        return { ...fixtures.profile, deloadRecommendation: fixtures.deloadRecommendation };
      },
    }),

    getExerciseLibrary: tool({
      description:
        "Search the exercise library by muscle group, name, or equipment. Returns exercise IDs needed for prescribing workouts. Always call this before prescribeWorkout.",
      inputSchema: z.object({
        muscleGroup: z.string().optional().describe("Filter by primary muscle group"),
        searchTerm: z.string().optional().describe("Search by exercise name"),
        equipment: z.string().optional().describe("Filter by equipment"),
      }),
      execute: async (args) => {
        toolCallLog.push({ toolName: "getExerciseLibrary", args });
        let filtered = fixtures.exercises;
        if (args.muscleGroup) {
          const g = args.muscleGroup.toLowerCase();
          filtered = filtered.filter((e) => e.muscleGroups.primary.includes(g));
        }
        if (args.searchTerm) {
          const t = args.searchTerm.toLowerCase();
          filtered = filtered.filter((e) => e.name.toLowerCase().includes(t));
        }
        if (args.equipment) {
          const eq = args.equipment.toLowerCase();
          filtered = filtered.filter((e) => e.equipment.toLowerCase() === eq);
        }
        // Return only id, name, equipment (matches new route.ts format)
        return {
          exercises: filtered.map((e) => ({ id: e.id, name: e.name, equipment: e.equipment })),
          count: filtered.length,
        };
      },
    }),

    prescribeWorkout: tool({
      description:
        "Create a new workout session with prescribed exercises. Call getExerciseLibrary first to get valid exercise IDs.",
      inputSchema: z.object({
        sessionName: z.string().describe("Name for the workout session"),
        exercises: z.array(
          z.object({
            exerciseId: z.number().describe("Exercise ID from the library"),
            exerciseName: z.string().describe("Exercise name for display"),
            targetSets: z.number().describe("Number of sets (2-5)"),
            repRangeMin: z.number().describe("Minimum reps"),
            repRangeMax: z.number().describe("Maximum reps"),
            rirTarget: z.number().describe("Target RIR (0-4)"),
            restSeconds: z.number().describe("Rest between sets in seconds"),
          })
        ),
      }),
      execute: async (args) => {
        toolCallLog.push({ toolName: "prescribeWorkout", args });
        return {
          success: true,
          sessionId: 99,
          sessionName: args.sessionName,
          exerciseCount: args.exercises.length,
          totalSets: args.exercises.reduce((s, e) => s + e.targetSets, 0),
          message: "Workout created! Head to the Today tab to start logging sets.",
        };
      },
    }),

    logWorkoutSet: tool({
      description:
        "Log a completed set for an exercise in the user's active workout session.",
      inputSchema: z.object({
        exerciseName: z.string().describe("Exercise name (fuzzy match)"),
        weight: z.number().describe("Weight used in lbs"),
        reps: z.number().describe("Number of reps completed"),
        rir: z.number().optional().describe("Reps in Reserve (0-5)"),
      }),
      execute: async (args) => {
        toolCallLog.push({ toolName: "logWorkoutSet", args });
        if (!fixtures.activeSession) {
          return { success: false, error: "No active workout session. Ask me to prescribe a workout first." };
        }
        return {
          success: true,
          exercise: args.exerciseName,
          setNumber: toolCallLog.filter((c) => c.toolName === "logWorkoutSet").length,
          weight: args.weight,
          reps: args.reps,
          rir: args.rir ?? null,
        };
      },
    }),
  };
}

// ─── Policy Assertion Judge ──────────────────────────────────────────

async function judgePolicyAssertions(
  assertion: string,
  fullResponse: string,
  toolCallLog: { toolName: string; args: Record<string, unknown> }[]
): Promise<{ passed: boolean; reasoning: string }> {
  const { text } = await generateText({
    model: anthropic("claude-haiku-4-5-20251001"),
    prompt: `You are a strict evaluator for an AI fitness coaching agent. Evaluate whether the following assertion is TRUE or FALSE based on the agent's actual behavior.

ASSERTION: "${assertion}"

AGENT'S TEXT RESPONSE:
"""
${fullResponse}
"""

TOOL CALLS MADE (in order):
${toolCallLog.map((c, i) => `${i + 1}. ${c.toolName}(${JSON.stringify(c.args)})`).join("\n")}

Respond with EXACTLY this format (no other text):
VERDICT: TRUE or FALSE
REASONING: one sentence explaining why`,
  });

  const verdict = text.includes("VERDICT: TRUE");
  const reasoning = text.split("REASONING:")[1]?.trim() || text;
  return { passed: verdict, reasoning };
}

// ─── Run Single Eval ──────────────────────────────────────────────

async function runEval(scenario: CoachEval): Promise<EvalResult> {
  const startTime = Date.now();
  const toolCallLog: { toolName: string; args: Record<string, unknown> }[] = [];

  const systemPrompt = `${COACH_SYSTEM_PROMPT}\n\n${ADVANCED_COACHING_ADDENDUM}`;

  try {
    const result = await generateText({
      model: anthropic("claude-sonnet-4-5-20250929"),
      system: systemPrompt,
      messages: scenario.userMessages.map((text) => ({
        role: "user" as const,
        content: text,
      })),
      tools: createMockTools(scenario.fixtures, toolCallLog),
      stopWhen: stepCountIs(7),
    });

    const fullResponse = result.text;
    const actualToolNames = toolCallLog.map((c) => c.toolName);

    // Check tool calls
    const expectedTools = scenario.expectations.toolsCalled;
    const missingCalls = expectedTools.filter(
      (t) => actualToolNames.filter((a) => a === t).length < expectedTools.filter((e) => e === t).length
    );
    const unexpectedCalls = scenario.expectations.toolsNotCalled
      ? actualToolNames.filter((t) => scenario.expectations.toolsNotCalled!.includes(t))
      : [];
    const toolsPassed = missingCalls.length === 0 && unexpectedCalls.length === 0;

    // Check response contains
    const responseContainsResults = (scenario.expectations.responseContains || []).map(
      (term) => ({
        term,
        found: fullResponse.toLowerCase().includes(term.toLowerCase()),
      })
    );

    // Check response does NOT contain
    const responseDoesNotContainResults = (
      scenario.expectations.responseDoesNotContain || []
    ).map((term) => ({
      term,
      found: fullResponse.toLowerCase().includes(term.toLowerCase()),
    }));

    // Judge policy assertions
    const policyResults = await Promise.all(
      scenario.expectations.policyAssertions.map(async (assertion) => {
        const result = await judgePolicyAssertions(assertion, fullResponse, toolCallLog);
        return { assertion, ...result };
      })
    );

    const allPassed =
      toolsPassed &&
      responseContainsResults.every((r) => r.found) &&
      responseDoesNotContainResults.every((r) => !r.found) &&
      policyResults.every((r) => r.passed);

    return {
      evalId: scenario.id,
      evalName: scenario.name,
      passed: allPassed,
      toolCallResults: {
        expected: expectedTools,
        actual: actualToolNames,
        missingCalls,
        unexpectedCalls,
        passed: toolsPassed,
      },
      responseContainsResults,
      responseDoesNotContainResults,
      fullResponse,
      toolCallLog,
      policyResults,
      durationMs: Date.now() - startTime,
    };
  } catch (error) {
    return {
      evalId: scenario.id,
      evalName: scenario.name,
      passed: false,
      toolCallResults: {
        expected: scenario.expectations.toolsCalled,
        actual: [],
        missingCalls: scenario.expectations.toolsCalled,
        unexpectedCalls: [],
        passed: false,
      },
      responseContainsResults: [],
      responseDoesNotContainResults: [],
      policyResults: [],
      fullResponse: "",
      toolCallLog: [],
      durationMs: Date.now() - startTime,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

// ─── Reporter ──────────────────────────────────────────────────────

function printResult(result: EvalResult) {
  const icon = result.passed ? "\x1b[32m PASS \x1b[0m" : "\x1b[31m FAIL \x1b[0m";
  console.log(`\n${icon} [${result.evalId}] ${result.evalName} (${result.durationMs}ms)`);

  if (result.error) {
    console.log(`  ERROR: ${result.error}`);
    return;
  }

  // Tool calls
  if (!result.toolCallResults.passed) {
    if (result.toolCallResults.missingCalls.length > 0) {
      console.log(`  Missing tool calls: ${result.toolCallResults.missingCalls.join(", ")}`);
    }
    if (result.toolCallResults.unexpectedCalls.length > 0) {
      console.log(`  Unexpected tool calls: ${result.toolCallResults.unexpectedCalls.join(", ")}`);
    }
  }
  console.log(`  Tools called: ${result.toolCallResults.actual.join(" -> ") || "(none)"}`);

  // Response contains/not-contains
  for (const r of result.responseContainsResults) {
    if (!r.found) console.log(`  Missing in response: "${r.term}"`);
  }
  for (const r of result.responseDoesNotContainResults) {
    if (r.found) console.log(`  Should NOT be in response: "${r.term}"`);
  }

  // Policy assertions
  for (const p of result.policyResults) {
    const pIcon = p.passed ? "\x1b[32m+\x1b[0m" : "\x1b[31m-\x1b[0m";
    console.log(`  ${pIcon} ${p.assertion}`);
    if (!p.passed) console.log(`    Reason: ${p.reasoning}`);
  }
}

function printSummary(results: EvalResult[]) {
  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;
  const total = results.length;
  const avgDuration = Math.round(results.reduce((s, r) => s + r.durationMs, 0) / total);

  console.log("\n" + "═".repeat(60));
  console.log(`RESULTS: ${passed}/${total} passed, ${failed} failed`);
  console.log(`Average duration: ${avgDuration}ms per eval`);

  // By category
  const categories = ["policy", "tool-usage", "edge-case", "communication"] as const;
  for (const cat of categories) {
    const catResults = results.filter((r) => {
      const scenario = EVAL_SCENARIOS.find((s) => s.id === r.evalId);
      return scenario?.category === cat;
    });
    if (catResults.length === 0) continue;
    const catPassed = catResults.filter((r) => r.passed).length;
    console.log(`  ${cat}: ${catPassed}/${catResults.length}`);
  }

  // Policy assertion pass rate
  const allPolicyResults = results.flatMap((r) => r.policyResults);
  if (allPolicyResults.length > 0) {
    const policyPassed = allPolicyResults.filter((p) => p.passed).length;
    console.log(`\nPolicy assertion pass rate: ${policyPassed}/${allPolicyResults.length} (${Math.round((policyPassed / allPolicyResults.length) * 100)}%)`);
  }
  console.log("═".repeat(60));
}

// ─── Main ──────────────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2);

  let scenarios = EVAL_SCENARIOS;

  // Filter by ID
  if (args.length > 0 && !args[0].startsWith("--")) {
    scenarios = scenarios.filter((s) => s.id === args[0]);
    if (scenarios.length === 0) {
      console.error(`No scenario found with id "${args[0]}"`);
      process.exit(1);
    }
  }

  // Filter by category
  const categoryIdx = args.indexOf("--category");
  if (categoryIdx !== -1 && args[categoryIdx + 1]) {
    const cat = args[categoryIdx + 1];
    scenarios = scenarios.filter((s) => s.category === cat);
    if (scenarios.length === 0) {
      console.error(`No scenarios found for category "${cat}"`);
      process.exit(1);
    }
  }

  console.log(`Running ${scenarios.length} eval(s)...\n`);

  const results: EvalResult[] = [];
  for (const scenario of scenarios) {
    const result = await runEval(scenario);
    printResult(result);
    results.push(result);
  }

  printSummary(results);

  // Write results to file
  const outputPath = `evals/results-${new Date().toISOString().slice(0, 19).replace(/:/g, "-")}.json`;
  const fs = await import("fs");
  fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));
  console.log(`\nResults saved to ${outputPath}`);

  // Exit with failure code if any evals failed
  if (results.some((r) => !r.passed)) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
