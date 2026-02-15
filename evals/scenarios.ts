// Coach eval scenarios — test the coach's behavior systematically

import type { CoachEval } from "./types";
import {
  STANDARD_INTERMEDIATE,
  BRAND_NEW_USER,
  AT_MRV_SCENARIO,
  DELOAD_DUE,
  MID_WORKOUT,
  AT_MRV_CHEST,
  INTERMEDIATE_USER,
  CHEST_TODAY_SESSION,
  ALL_EXERCISES,
  NO_DELOAD,
  NO_ACTIVE_SESSION,
  RECENT_UPPER_SESSIONS,
  MODERATE_VOLUME,
  ACTIVE_SESSION,
  DELOAD_RECOMMENDED,
  ADVANCED_USER,
} from "./fixtures";

export const EVAL_SCENARIOS: CoachEval[] = [
  // ═══════════════════════════════════════════════════════════════════
  // POLICY COMPLIANCE
  // ═══════════════════════════════════════════════════════════════════

  {
    id: "policy-001",
    name: "Prescription follows tool chain",
    description:
      "When asked to prescribe a workout, the coach must call getUserProfile, getWorkoutHistory, getExerciseLibrary, then prescribeWorkout — in that order.",
    category: "policy",
    fixtures: STANDARD_INTERMEDIATE,
    userMessages: ["What should I train today?"],
    expectations: {
      toolsCalled: [
        "getUserProfile",
        "getWorkoutHistory",
        "getExerciseLibrary",
        "prescribeWorkout",
      ],
      toolsNotCalled: [],
      policyAssertions: [
        "The coach called getUserProfile before prescribing",
        "The coach called getWorkoutHistory to check recent training before prescribing",
        "The coach called getExerciseLibrary to get valid exercise IDs before prescribing",
        "The coach called prescribeWorkout after calling getExerciseLibrary (the full tool chain was completed)",
      ],
    },
  },

  {
    id: "policy-002",
    name: "Never use RPE in response",
    description:
      "The coach must always express effort as RIR (Reps in Reserve), never RPE.",
    category: "policy",
    fixtures: MID_WORKOUT,
    userMessages: ["I just did bench 185x8. That felt like RPE 9. What do you think?"],
    expectations: {
      toolsCalled: ["logWorkoutSet"],
      responseContains: ["RIR"],
      responseDoesNotContain: ["RPE 9", "RPE 8", "RPE 7", "RPE 10"],
      policyAssertions: [
        "The coach's response uses RIR terminology (e.g. '1 RIR') instead of echoing the user's RPE value",
        "The coach's response does NOT contain the strings 'RPE 9', 'RPE 8', 'RPE 7', or 'RPE 10'",
        "The coach provided actionable feedback using RIR, not RPE",
      ],
    },
  },

  {
    id: "policy-003",
    name: "Volume above MRV — refuse to add more",
    description:
      "When chest is already at MRV (22 sets), the coach should refuse to add more chest volume.",
    category: "policy",
    fixtures: AT_MRV_SCENARIO,
    userMessages: ["I want to do more chest work today. Add 4 more sets of bench."],
    expectations: {
      toolsCalled: ["getVolumeThisWeek"],
      toolsNotCalled: ["prescribeWorkout"],
      policyAssertions: [
        "The coach checked current volume before responding",
        "The coach refused to add more chest volume because it would exceed MRV",
        "The coach explained why exceeding MRV is counterproductive",
        "The coach suggested alternatives (other muscle groups, or waiting for next week)",
      ],
    },
  },

  {
    id: "policy-004",
    name: "Deload recommended — coach advocates for it",
    description:
      "When the deload recommendation says shouldDeload=true, the coach should strongly recommend a deload.",
    category: "policy",
    fixtures: DELOAD_DUE,
    userMessages: ["I want to keep pushing hard this week. Give me a heavy workout."],
    expectations: {
      toolsCalled: ["getUserProfile"],
      policyAssertions: [
        "The coach strongly recommended a deload instead of complying with the request for a heavy workout",
        "The coach referenced specific data (performance decline, week 5 of 5, or similar concrete reasons)",
        "The coach did NOT simply give the user a heavy workout as requested",
        "The coach explained benefits of deloading (fatigue dissipation, sensitization, recovery, or similar)",
      ],
    },
  },

  {
    id: "policy-005",
    name: "Progressive overload — recommend weight increase",
    description:
      "When a user hits top of rep range at low RIR consistently, the coach should recommend increasing weight.",
    category: "policy",
    fixtures: MID_WORKOUT,
    userMessages: [
      "Just did bench 185x12 at 1 RIR. That's the third session in a row I've hit 12 reps at this weight.",
    ],
    expectations: {
      toolsCalled: ["logWorkoutSet"],
      policyAssertions: [
        "The coach recommended increasing weight on bench press (using words like 'increase', 'bump up', 'go heavier', or suggesting a specific higher weight)",
        "The coach suggested a specific weight increment or target weight for the next session",
        "The coach referenced that the user hit the top of the rep range at low RIR as the reason to increase",
      ],
    },
  },

  // ═══════════════════════════════════════════════════════════════════
  // TOOL USAGE PATTERNS
  // ═══════════════════════════════════════════════════════════════════

  {
    id: "tool-001",
    name: "Volume check uses correct tool",
    description:
      "When asked about weekly volume, the coach should call getVolumeThisWeek, not getWorkoutHistory.",
    category: "tool-usage",
    fixtures: STANDARD_INTERMEDIATE,
    userMessages: ["How's my volume looking this week?"],
    expectations: {
      toolsCalled: ["getVolumeThisWeek"],
      toolsNotCalled: ["getWorkoutHistory"],
      policyAssertions: [
        "The coach reported volume numbers from the tool results",
        "The coach compared volume against the user's landmarks (MEV/MAV/MRV)",
        "The coach gave a clear recommendation based on the volume data",
      ],
    },
  },

  {
    id: "tool-002",
    name: "Progression check uses getProgressionTrend",
    description:
      "When asked about exercise progression, the coach should call getProgressionTrend, not getWorkoutHistory.",
    category: "tool-usage",
    fixtures: STANDARD_INTERMEDIATE,
    userMessages: ["How am I progressing on bench press?"],
    expectations: {
      toolsCalled: ["getProgressionTrend"],
      policyAssertions: [
        "The coach used getProgressionTrend to analyze bench press performance",
        "The coach reported specific numbers (weight, reps, RIR changes over sessions)",
        "The coach gave an actionable recommendation based on the trend data",
      ],
    },
  },

  {
    id: "tool-003",
    name: "Set logging — single set",
    description:
      "When a user reports completing a set, the coach calls logWorkoutSet and gives brief feedback.",
    category: "tool-usage",
    fixtures: MID_WORKOUT,
    userMessages: ["Bench 185x8 at 2 RIR"],
    expectations: {
      toolsCalled: ["logWorkoutSet"],
      policyAssertions: [
        "The coach called logWorkoutSet with the correct weight (185), reps (8), and RIR (2)",
        "The coach gave brief mid-workout feedback (not a long paragraph)",
        "The coach acknowledged the set was logged",
      ],
    },
  },

  {
    id: "tool-004",
    name: "Set logging — multiple sets reported at once",
    description:
      "When a user reports multiple sets at once, the coach should log each set individually.",
    category: "tool-usage",
    fixtures: MID_WORKOUT,
    userMessages: [
      "Just did 3 sets of squats at 225: 10 reps, 9 reps, 8 reps. All around 2 RIR.",
    ],
    expectations: {
      toolsCalled: ["logWorkoutSet", "logWorkoutSet", "logWorkoutSet"],
      policyAssertions: [
        "The coach logged 3 separate sets",
        "Each set had the correct weight (225) and appropriate reps (10, 9, 8)",
        "The coach's response was concise since the user is mid-workout",
      ],
    },
  },

  {
    id: "tool-005",
    name: "Simple question — no unnecessary tool calls",
    description:
      "When asked a general training knowledge question, the coach should answer from knowledge without calling tools.",
    category: "tool-usage",
    fixtures: STANDARD_INTERMEDIATE,
    userMessages: [
      "What's the difference between RIR 1 and RIR 2? When should I push to failure?",
    ],
    expectations: {
      toolsCalled: [],
      policyAssertions: [
        "The coach answered the question about RIR directly from training science knowledge",
        "The coach did NOT call any tools (this is a knowledge question, not a data question)",
        "The coach explained RIR accurately (RIR 1 = 1 rep left, RIR 2 = 2 reps left)",
      ],
    },
  },

  // ═══════════════════════════════════════════════════════════════════
  // EDGE CASES
  // ═══════════════════════════════════════════════════════════════════

  {
    id: "edge-001",
    name: "New user with no data",
    description:
      "When the user has no profile, no history, and no volume landmarks, the coach should ask about experience and goals before prescribing.",
    category: "edge-case",
    fixtures: BRAND_NEW_USER,
    userMessages: ["What should I train today?"],
    expectations: {
      toolsCalled: ["getUserProfile"],
      toolsNotCalled: ["prescribeWorkout"],
      policyAssertions: [
        "The coach recognized this is a new user with no training data",
        "The coach asked about the user's experience level, goals, or available equipment",
        "The coach did NOT prescribe a workout without gathering basic user information first",
        "The coach was welcoming and encouraging, not robotic",
      ],
    },
  },

  {
    id: "edge-002",
    name: "Already trained muscle group today",
    description:
      "When the user already trained chest today, the coach should advise against more chest work.",
    category: "edge-case",
    fixtures: {
      profile: INTERMEDIATE_USER,
      workoutHistory: CHEST_TODAY_SESSION,
      volumeThisWeek: AT_MRV_CHEST,
      exercises: ALL_EXERCISES,
      activeSession: NO_ACTIVE_SESSION,
      deloadRecommendation: NO_DELOAD,
    },
    userMessages: ["I want to do chest again right now"],
    expectations: {
      toolsCalled: ["getWorkoutHistory"],
      toolsNotCalled: ["prescribeWorkout"],
      policyAssertions: [
        "The coach recognized the user already trained chest recently (today or this week)",
        "The coach recommended against more chest work (due to volume limits, recovery, or same-day training)",
        "The coach suggested alternative muscle groups to train instead",
      ],
    },
  },

  {
    id: "edge-003",
    name: "No active session for set logging",
    description:
      "When the user tries to log a set but has no active session, the tool returns an error. The coach should offer to create a workout.",
    category: "edge-case",
    fixtures: {
      profile: INTERMEDIATE_USER,
      workoutHistory: RECENT_UPPER_SESSIONS,
      volumeThisWeek: MODERATE_VOLUME,
      exercises: ALL_EXERCISES,
      activeSession: NO_ACTIVE_SESSION,
      deloadRecommendation: NO_DELOAD,
    },
    userMessages: ["I just did bench 185x8 at 2 RIR"],
    expectations: {
      toolsCalled: ["logWorkoutSet"],
      policyAssertions: [
        "The coach attempted to log the set via logWorkoutSet",
        "The coach addressed the lack of an active session (either by informing the user or by proactively prescribing a workout)",
        "The coach either offered to prescribe a workout OR proactively created one so the user can log sets",
      ],
    },
  },

  {
    id: "edge-004",
    name: "Contradictory RIR report",
    description:
      "When the user says it was easy but reports 0 RIR, the coach should notice the contradiction.",
    category: "edge-case",
    fixtures: MID_WORKOUT,
    userMessages: [
      "That was super easy! Bench 185x8 at 0 RIR. Barely felt it.",
    ],
    expectations: {
      toolsCalled: ["logWorkoutSet"],
      policyAssertions: [
        "The coach noticed the contradiction between 'super easy' and 0 RIR (no reps left)",
        "The coach asked for clarification or educated the user about what 0 RIR means",
        "The coach did NOT simply log the set without questioning the discrepancy",
      ],
    },
  },

  // ═══════════════════════════════════════════════════════════════════
  // COMMUNICATION QUALITY
  // ═══════════════════════════════════════════════════════════════════

  {
    id: "comm-001",
    name: "Mid-workout responses are concise",
    description:
      "During set logging, responses should be brief — not full coaching lectures.",
    category: "communication",
    fixtures: MID_WORKOUT,
    userMessages: ["Squat 225x10 at 2 RIR"],
    expectations: {
      toolsCalled: ["logWorkoutSet"],
      policyAssertions: [
        "The coach's response is concise (under 75 words)",
        "The response acknowledges the set",
        "The response includes brief actionable feedback (maintain weight, adjust next set, etc.)",
        "The response does NOT include long explanations of training science",
      ],
    },
  },

  {
    id: "comm-002",
    name: "References actual data from tools",
    description:
      "When reporting volume or progress, the coach should cite specific numbers from tool results.",
    category: "communication",
    fixtures: STANDARD_INTERMEDIATE,
    userMessages: ["How's my chest volume this week?"],
    expectations: {
      toolsCalled: ["getVolumeThisWeek"],
      policyAssertions: [
        "The coach cited the specific chest volume number from the tool result (10 sets)",
        "The coach compared it against a landmark (MEV, MAV, or MRV)",
        "The coach gave a specific recommendation (add more sets, maintain, or reduce)",
        "The response used actual numbers, not vague phrases like 'you're doing well'",
      ],
    },
  },

  {
    id: "comm-003",
    name: "Explains the why behind recommendations",
    description:
      "When prescribing or recommending, the coach should explain the reasoning briefly.",
    category: "communication",
    fixtures: STANDARD_INTERMEDIATE,
    userMessages: ["Should I increase weight on bench press?"],
    expectations: {
      toolsCalled: ["getProgressionTrend"],
      policyAssertions: [
        "The coach provided a clear recommendation (increase, maintain, or reduce weight)",
        "The coach referenced specific data or training principles to support the recommendation (e.g., rep range, RIR, weight trends, mesocycle week, or progression data)",
        "The explanation was brief and actionable, not a lecture",
      ],
    },
  },
];
