// Coach evaluation framework types

export interface CoachEval {
  id: string;
  name: string;
  description: string;
  category: "policy" | "tool-usage" | "edge-case" | "communication";

  // Pre-existing state the tools will return
  fixtures: EvalFixtures;

  // The user message(s) to send
  userMessages: string[];

  // What we expect
  expectations: EvalExpectations;
}

export interface EvalFixtures {
  profile: MockProfile | null;
  workoutHistory: MockSession[];
  volumeThisWeek: MockVolume;
  exercises: MockExercise[];
  activeSession: MockActiveSession | null;
  deloadRecommendation: MockDeload | null;
}

export interface MockProfile {
  profile: {
    name: string;
    experienceLevel: "beginner" | "intermediate" | "advanced";
    trainingAgeMonths: number;
    availableTrainingDays: number;
    preferredSplit: string;
  };
  volumeLandmarks: Record<string, { mev: number; mav: number; mrv: number }>;
  activeMesocycle: {
    id: number;
    name: string;
    currentWeek: number;
    totalWeeks: number;
    splitType: string;
    status: string;
  } | null;
}

export interface MockSession {
  id: number;
  date: string;
  sessionName: string;
  preReadiness: { energy: number; motivation: number; soreness: number } | null;
  sets: {
    exercise: string;
    setNumber: number;
    weight: number;
    reps: number;
    rir: number | null;
  }[];
}

export interface MockVolume {
  volumeByGroup: Record<string, number>;
  totalSets: number;
  targetSets: number;
  weekStart: string;
}

export interface MockExercise {
  id: number;
  name: string;
  muscleGroups: { primary: string[]; secondary: string[] };
  equipment: string;
  movementPattern: string;
}

export interface MockActiveSession {
  id: number;
  date: string;
  sessionName: string;
  durationMinutes: number | null;
}

export interface MockDeload {
  shouldDeload: boolean;
  reason: string | null;
  currentWeek: number;
  totalWeeks: number;
  mesocycleName: string;
}

export interface EvalExpectations {
  // Tools that MUST be called
  toolsCalled: string[];
  // Tools that MUST NOT be called
  toolsNotCalled?: string[];
  // Strings that should appear in the final text response (case-insensitive)
  responseContains?: string[];
  // Strings that must NOT appear in the final text response
  responseDoesNotContain?: string[];
  // Natural language assertions — evaluated by a judge model
  policyAssertions: string[];
}

export interface EvalResult {
  evalId: string;
  evalName: string;
  passed: boolean;
  toolCallResults: {
    expected: string[];
    actual: string[];
    missingCalls: string[];
    unexpectedCalls: string[];
    passed: boolean;
  };
  responseContainsResults: {
    term: string;
    found: boolean;
  }[];
  responseDoesNotContainResults: {
    term: string;
    found: boolean; // true = violation (term was found when it shouldn't be)
  }[];
  policyResults: {
    assertion: string;
    passed: boolean;
    reasoning: string;
  }[];
  fullResponse: string;
  toolCallLog: { toolName: string; args: Record<string, unknown> }[];
  durationMs: number;
  error?: string;
}
