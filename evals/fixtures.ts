// Reusable test fixtures for coach evals

import type {
  MockProfile,
  MockSession,
  MockVolume,
  MockExercise,
  MockDeload,
  MockActiveSession,
  EvalFixtures,
} from "./types";

// ─── User Profiles ──────────────────────────────────────────────────

export const INTERMEDIATE_USER: MockProfile = {
  profile: {
    name: "Alex",
    experienceLevel: "intermediate",
    trainingAgeMonths: 18,
    availableTrainingDays: 4,
    preferredSplit: "upper_lower",
  },
  volumeLandmarks: {
    chest: { mev: 8, mav: 14, mrv: 22 },
    back: { mev: 10, mav: 16, mrv: 26 },
    quads: { mev: 8, mav: 14, mrv: 22 },
    hamstrings: { mev: 6, mav: 12, mrv: 18 },
    shoulders: { mev: 6, mav: 12, mrv: 20 },
    biceps: { mev: 6, mav: 12, mrv: 20 },
    triceps: { mev: 6, mav: 10, mrv: 18 },
  },
  activeMesocycle: {
    id: 1,
    name: "Hypertrophy Block A",
    currentWeek: 3,
    totalWeeks: 5,
    splitType: "upper_lower",
    status: "active",
  },
};

export const NEW_USER: MockProfile | null = null;

export const ADVANCED_USER: MockProfile = {
  profile: {
    name: "Jordan",
    experienceLevel: "advanced",
    trainingAgeMonths: 48,
    availableTrainingDays: 5,
    preferredSplit: "push_pull_legs",
  },
  volumeLandmarks: {
    chest: { mev: 10, mav: 18, mrv: 24 },
    back: { mev: 12, mav: 20, mrv: 28 },
    quads: { mev: 10, mav: 18, mrv: 24 },
    hamstrings: { mev: 8, mav: 14, mrv: 20 },
    shoulders: { mev: 8, mav: 16, mrv: 24 },
    biceps: { mev: 8, mav: 16, mrv: 24 },
    triceps: { mev: 6, mav: 12, mrv: 20 },
  },
  activeMesocycle: {
    id: 2,
    name: "PPL Hypertrophy",
    currentWeek: 5,
    totalWeeks: 5,
    splitType: "push_pull_legs",
    status: "active",
  },
};

// ─── Workout History ──────────────────────────────────────────────────

export const RECENT_UPPER_SESSIONS: MockSession[] = [
  {
    id: 10,
    date: new Date(Date.now() - 2 * 86400000).toISOString(), // 2 days ago
    sessionName: "Upper A",
    preReadiness: { energy: 7, motivation: 8, soreness: 3 },
    sets: [
      { exercise: "Barbell Bench Press", setNumber: 1, weight: 185, reps: 8, rir: 2 },
      { exercise: "Barbell Bench Press", setNumber: 2, weight: 185, reps: 8, rir: 2 },
      { exercise: "Barbell Bench Press", setNumber: 3, weight: 185, reps: 7, rir: 1 },
      { exercise: "Barbell Row", setNumber: 1, weight: 155, reps: 10, rir: 2 },
      { exercise: "Barbell Row", setNumber: 2, weight: 155, reps: 9, rir: 2 },
      { exercise: "Barbell Row", setNumber: 3, weight: 155, reps: 8, rir: 1 },
      { exercise: "Lateral Raise", setNumber: 1, weight: 20, reps: 14, rir: 2 },
      { exercise: "Lateral Raise", setNumber: 2, weight: 20, reps: 12, rir: 1 },
    ],
  },
  {
    id: 8,
    date: new Date(Date.now() - 5 * 86400000).toISOString(), // 5 days ago
    sessionName: "Upper B",
    preReadiness: { energy: 6, motivation: 7, soreness: 4 },
    sets: [
      { exercise: "Barbell Bench Press", setNumber: 1, weight: 180, reps: 8, rir: 2 },
      { exercise: "Barbell Bench Press", setNumber: 2, weight: 180, reps: 7, rir: 2 },
      { exercise: "Barbell Bench Press", setNumber: 3, weight: 180, reps: 7, rir: 1 },
      { exercise: "Overhead Press", setNumber: 1, weight: 115, reps: 7, rir: 2 },
      { exercise: "Overhead Press", setNumber: 2, weight: 115, reps: 6, rir: 1 },
      { exercise: "Lat Pulldown", setNumber: 1, weight: 140, reps: 10, rir: 2 },
      { exercise: "Lat Pulldown", setNumber: 2, weight: 140, reps: 9, rir: 1 },
      { exercise: "Lat Pulldown", setNumber: 3, weight: 140, reps: 8, rir: 1 },
    ],
  },
];

export const EMPTY_HISTORY: MockSession[] = [];

export const CHEST_TODAY_SESSION: MockSession[] = [
  {
    id: 12,
    date: new Date().toISOString(), // today
    sessionName: "Push Day",
    preReadiness: { energy: 7, motivation: 7, soreness: 2 },
    sets: [
      { exercise: "Barbell Bench Press", setNumber: 1, weight: 185, reps: 8, rir: 2 },
      { exercise: "Barbell Bench Press", setNumber: 2, weight: 185, reps: 8, rir: 2 },
      { exercise: "Barbell Bench Press", setNumber: 3, weight: 185, reps: 7, rir: 1 },
      { exercise: "Incline Dumbbell Press", setNumber: 1, weight: 65, reps: 10, rir: 2 },
      { exercise: "Incline Dumbbell Press", setNumber: 2, weight: 65, reps: 9, rir: 2 },
      { exercise: "Cable Fly", setNumber: 1, weight: 30, reps: 14, rir: 2 },
      { exercise: "Cable Fly", setNumber: 2, weight: 30, reps: 12, rir: 1 },
    ],
  },
];

// ─── Volume Data ──────────────────────────────────────────────────

export const MODERATE_VOLUME: MockVolume = {
  volumeByGroup: {
    chest: 10,
    back: 12,
    shoulders: 8,
    biceps: 6,
    triceps: 6,
    quads: 0,
    hamstrings: 0,
  },
  totalSets: 42,
  targetSets: 90,
  weekStart: new Date(Date.now() - 3 * 86400000).toISOString(),
};

export const AT_MRV_CHEST: MockVolume = {
  volumeByGroup: {
    chest: 22, // AT MRV for intermediate user
    back: 14,
    shoulders: 10,
    biceps: 8,
    triceps: 8,
    quads: 14,
    hamstrings: 10,
  },
  totalSets: 86,
  targetSets: 90,
  weekStart: new Date(Date.now() - 5 * 86400000).toISOString(),
};

export const ZERO_VOLUME: MockVolume = {
  volumeByGroup: {},
  totalSets: 0,
  targetSets: 0,
  weekStart: new Date().toISOString(),
};

// ─── Exercises ──────────────────────────────────────────────────

export const CHEST_EXERCISES: MockExercise[] = [
  { id: 1, name: "Barbell Bench Press", muscleGroups: { primary: ["chest"], secondary: ["triceps", "front_delts"] }, equipment: "barbell", movementPattern: "horizontal_press" },
  { id: 2, name: "Incline Dumbbell Press", muscleGroups: { primary: ["chest"], secondary: ["triceps", "front_delts"] }, equipment: "dumbbell", movementPattern: "horizontal_press" },
  { id: 3, name: "Cable Fly", muscleGroups: { primary: ["chest"], secondary: [] }, equipment: "cable", movementPattern: "isolation" },
  { id: 4, name: "Dumbbell Fly", muscleGroups: { primary: ["chest"], secondary: [] }, equipment: "dumbbell", movementPattern: "isolation" },
  { id: 5, name: "Machine Chest Press", muscleGroups: { primary: ["chest"], secondary: ["triceps"] }, equipment: "machine", movementPattern: "horizontal_press" },
];

export const BACK_EXERCISES: MockExercise[] = [
  { id: 10, name: "Barbell Row", muscleGroups: { primary: ["back"], secondary: ["biceps"] }, equipment: "barbell", movementPattern: "horizontal_pull" },
  { id: 11, name: "Lat Pulldown", muscleGroups: { primary: ["back"], secondary: ["biceps"] }, equipment: "cable", movementPattern: "vertical_pull" },
  { id: 12, name: "Seated Cable Row", muscleGroups: { primary: ["back"], secondary: ["biceps"] }, equipment: "cable", movementPattern: "horizontal_pull" },
  { id: 13, name: "Pull-Up", muscleGroups: { primary: ["back"], secondary: ["biceps"] }, equipment: "bodyweight", movementPattern: "vertical_pull" },
];

export const ALL_EXERCISES: MockExercise[] = [...CHEST_EXERCISES, ...BACK_EXERCISES];

// ─── Deload Recommendations ──────────────────────────────────────

export const NO_DELOAD: MockDeload = {
  shouldDeload: false,
  reason: null,
  currentWeek: 3,
  totalWeeks: 5,
  mesocycleName: "Hypertrophy Block A",
};

export const DELOAD_RECOMMENDED: MockDeload = {
  shouldDeload: true,
  reason: "Performance declining for 2 consecutive sessions. Week 5 of 5 in mesocycle.",
  currentWeek: 5,
  totalWeeks: 5,
  mesocycleName: "Hypertrophy Block A",
};

// ─── Active Sessions ──────────────────────────────────────────────

export const ACTIVE_SESSION: MockActiveSession = {
  id: 15,
  date: new Date().toISOString(),
  sessionName: "Upper A",
  durationMinutes: null, // still active
};

export const NO_ACTIVE_SESSION: MockActiveSession | null = null;

// ─── Composite Fixtures ──────────────────────────────────────────

export const STANDARD_INTERMEDIATE: EvalFixtures = {
  profile: INTERMEDIATE_USER,
  workoutHistory: RECENT_UPPER_SESSIONS,
  volumeThisWeek: MODERATE_VOLUME,
  exercises: ALL_EXERCISES,
  activeSession: NO_ACTIVE_SESSION,
  deloadRecommendation: NO_DELOAD,
};

export const BRAND_NEW_USER: EvalFixtures = {
  profile: NEW_USER,
  workoutHistory: EMPTY_HISTORY,
  volumeThisWeek: ZERO_VOLUME,
  exercises: ALL_EXERCISES,
  activeSession: NO_ACTIVE_SESSION,
  deloadRecommendation: null,
};

export const AT_MRV_SCENARIO: EvalFixtures = {
  profile: INTERMEDIATE_USER,
  workoutHistory: CHEST_TODAY_SESSION,
  volumeThisWeek: AT_MRV_CHEST,
  exercises: ALL_EXERCISES,
  activeSession: NO_ACTIVE_SESSION,
  deloadRecommendation: NO_DELOAD,
};

export const DELOAD_DUE: EvalFixtures = {
  profile: ADVANCED_USER,
  workoutHistory: RECENT_UPPER_SESSIONS,
  volumeThisWeek: MODERATE_VOLUME,
  exercises: ALL_EXERCISES,
  activeSession: NO_ACTIVE_SESSION,
  deloadRecommendation: DELOAD_RECOMMENDED,
};

export const MID_WORKOUT: EvalFixtures = {
  profile: INTERMEDIATE_USER,
  workoutHistory: RECENT_UPPER_SESSIONS,
  volumeThisWeek: MODERATE_VOLUME,
  exercises: ALL_EXERCISES,
  activeSession: ACTIVE_SESSION,
  deloadRecommendation: NO_DELOAD,
};
