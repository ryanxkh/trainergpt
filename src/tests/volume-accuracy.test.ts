import { describe, it, expect, afterAll, beforeAll } from "vitest";
import { db } from "@/lib/db";
import {
  users,
  exercises,
  workoutSessions,
  exerciseSets,
  userVolumeLandmarks,
} from "@/lib/db/schema";
import { eq, inArray } from "drizzle-orm";
import { getCachedVolume, invalidateCache } from "@/lib/cache";

const TEST_EMAIL = `test-volume-${Date.now()}@test.local`;

let testUserId: number;
let testExerciseId: number; // chest (primary), triceps (secondary)
let completedSessionId: number;
let activeSessionId: number;
let abandonedSessionId: number;

describe("Volume accuracy — core", () => {
  // ── Seed test data ──

  it("seeds test user, exercise, and landmark", async () => {
    const [user] = await db
      .insert(users)
      .values({ email: TEST_EMAIL, name: "Test Volume User" })
      .returning();
    testUserId = user.id;

    const [exercise] = await db
      .insert(exercises)
      .values({
        name: `Test Bench Press ${Date.now()}`,
        muscleGroups: { primary: ["chest"], secondary: ["triceps"] },
        movementPattern: "horizontal_press",
        equipment: "barbell",
      })
      .returning();
    testExerciseId = exercise.id;

    await db.insert(userVolumeLandmarks).values([
      { userId: testUserId, muscleGroup: "chest", mev: 8, mav: 14, mrv: 22 },
      { userId: testUserId, muscleGroup: "back", mev: 10, mav: 16, mrv: 24 },
      { userId: testUserId, muscleGroup: "biceps", mev: 6, mav: 10, mrv: 16 },
    ]);
  });

  it("seeds completed session with mixed sets", async () => {
    const [session] = await db
      .insert(workoutSessions)
      .values({
        userId: testUserId,
        sessionName: "Test Completed Session",
        date: new Date(),
        durationMinutes: 60,
        status: "completed",
      })
      .returning();
    completedSessionId = session.id;

    // 3 hard sets (RIR 0, 2, 4) — should count
    // 1 junk set (RIR 5) — should NOT count
    // 1 null RIR set — should NOT count
    await db.insert(exerciseSets).values([
      { sessionId: completedSessionId, exerciseId: testExerciseId, setNumber: 1, weight: 135, reps: 10, rir: 0 },
      { sessionId: completedSessionId, exerciseId: testExerciseId, setNumber: 2, weight: 135, reps: 8, rir: 2 },
      { sessionId: completedSessionId, exerciseId: testExerciseId, setNumber: 3, weight: 135, reps: 6, rir: 4 },
      { sessionId: completedSessionId, exerciseId: testExerciseId, setNumber: 4, weight: 100, reps: 15, rir: 5 },
      { sessionId: completedSessionId, exerciseId: testExerciseId, setNumber: 5, weight: 100, reps: 12, rir: null },
    ]);
  });

  it("seeds active session with hard sets (should be excluded)", async () => {
    const [session] = await db
      .insert(workoutSessions)
      .values({
        userId: testUserId,
        sessionName: "Test Active Session",
        date: new Date(),
        status: "active",
      })
      .returning();
    activeSessionId = session.id;

    await db.insert(exerciseSets).values([
      { sessionId: activeSessionId, exerciseId: testExerciseId, setNumber: 1, weight: 135, reps: 10, rir: 1 },
      { sessionId: activeSessionId, exerciseId: testExerciseId, setNumber: 2, weight: 135, reps: 8, rir: 2 },
    ]);
  });

  it("seeds abandoned session with hard sets (should be excluded)", async () => {
    const [session] = await db
      .insert(workoutSessions)
      .values({
        userId: testUserId,
        sessionName: "Test Abandoned Session",
        date: new Date(),
        status: "abandoned",
      })
      .returning();
    abandonedSessionId = session.id;

    await db.insert(exerciseSets).values([
      { sessionId: abandonedSessionId, exerciseId: testExerciseId, setNumber: 1, weight: 135, reps: 10, rir: 0 },
    ]);
  });

  // ── Assertions ──

  it("counts only hard sets from completed sessions", async () => {
    await invalidateCache(testUserId, ["volume"]);
    const volume = await getCachedVolume(testUserId);
    // Only 3 hard sets (RIR 0, 2, 4) from the completed session
    expect(volume.volumeByGroup["chest"]).toBe(3);
  });

  it("excludes active session sets", async () => {
    const volume = await getCachedVolume(testUserId);
    expect(volume.volumeByGroup["chest"]).toBe(3);
  });

  it("excludes abandoned session sets", async () => {
    const volume = await getCachedVolume(testUserId);
    expect(volume.volumeByGroup["chest"]).toBe(3);
  });

  it("excludes junk sets (RIR > 4)", async () => {
    const volume = await getCachedVolume(testUserId);
    expect(volume.volumeByGroup["chest"]).toBe(3);
  });

  it("excludes null RIR sets", async () => {
    const volume = await getCachedVolume(testUserId);
    expect(volume.volumeByGroup["chest"]).toBe(3);
  });

  // ── Cleanup ──

  afterAll(async () => {
    const sessionIds = [completedSessionId, activeSessionId, abandonedSessionId].filter(Boolean);
    if (sessionIds.length > 0) {
      await db.delete(exerciseSets).where(inArray(exerciseSets.sessionId, sessionIds));
      await db.delete(workoutSessions).where(inArray(workoutSessions.id, sessionIds));
    }
    if (testUserId) {
      await db.delete(userVolumeLandmarks).where(eq(userVolumeLandmarks.userId, testUserId));
    }
    if (testExerciseId) {
      await db.delete(exercises).where(eq(exercises.id, testExerciseId));
    }
    if (testUserId) {
      await db.delete(users).where(eq(users.id, testUserId));
    }
    await invalidateCache(testUserId, ["volume"]);
  });
});

// ─── Multi-muscle compound exercise ────────────────────────────────

const COMPOUND_EMAIL = `test-compound-${Date.now()}@test.local`;
let compoundUserId: number;
let compoundExId: number;
let compoundSessionId: number;

describe("Volume accuracy — compound exercises", () => {
  beforeAll(async () => {
    const [user] = await db
      .insert(users)
      .values({ email: COMPOUND_EMAIL, name: "Test Compound User" })
      .returning();
    compoundUserId = user.id;

    // Exercise with TWO primary muscle groups
    const [exercise] = await db
      .insert(exercises)
      .values({
        name: `Test Barbell Row ${Date.now()}`,
        muscleGroups: { primary: ["back", "biceps"], secondary: ["rear_delts"] },
        movementPattern: "horizontal_pull",
        equipment: "barbell",
      })
      .returning();
    compoundExId = exercise.id;

    await db.insert(userVolumeLandmarks).values([
      { userId: compoundUserId, muscleGroup: "back", mev: 10, mav: 16, mrv: 24 },
      { userId: compoundUserId, muscleGroup: "biceps", mev: 6, mav: 10, mrv: 16 },
    ]);

    const [session] = await db
      .insert(workoutSessions)
      .values({
        userId: compoundUserId,
        sessionName: "Compound Test Session",
        date: new Date(),
        durationMinutes: 45,
        status: "completed",
      })
      .returning();
    compoundSessionId = session.id;

    await db.insert(exerciseSets).values([
      { sessionId: compoundSessionId, exerciseId: compoundExId, setNumber: 1, weight: 185, reps: 8, rir: 2 },
      { sessionId: compoundSessionId, exerciseId: compoundExId, setNumber: 2, weight: 185, reps: 7, rir: 1 },
    ]);
  });

  it("counts sets for each primary muscle group independently", async () => {
    await invalidateCache(compoundUserId, ["volume"]);
    const volume = await getCachedVolume(compoundUserId);

    // Both back AND biceps should get 2 sets each
    expect(volume.volumeByGroup["back"]).toBe(2);
    expect(volume.volumeByGroup["biceps"]).toBe(2);
  });

  it("does not count secondary muscle groups in volume", async () => {
    const volume = await getCachedVolume(compoundUserId);
    // rear_delts is secondary — should not appear
    expect(volume.volumeByGroup["rear_delts"]).toBeUndefined();
  });

  it("totalSets reflects sum across all muscle groups", async () => {
    const volume = await getCachedVolume(compoundUserId);
    // 2 sets × 2 primary groups = 4 total
    expect(volume.totalSets).toBe(4);
  });

  it("targetSets derives from MAV landmarks", async () => {
    const volume = await getCachedVolume(compoundUserId);
    // back MAV (16) + biceps MAV (10) = 26
    expect(volume.targetSets).toBe(26);
  });

  afterAll(async () => {
    if (compoundSessionId) {
      await db.delete(exerciseSets).where(eq(exerciseSets.sessionId, compoundSessionId));
      await db.delete(workoutSessions).where(eq(workoutSessions.id, compoundSessionId));
    }
    if (compoundUserId) {
      await db.delete(userVolumeLandmarks).where(eq(userVolumeLandmarks.userId, compoundUserId));
    }
    if (compoundExId) {
      await db.delete(exercises).where(eq(exercises.id, compoundExId));
    }
    if (compoundUserId) {
      await db.delete(users).where(eq(users.id, compoundUserId));
    }
    await invalidateCache(compoundUserId, ["volume"]);
  });
});

// ─── Cross-week boundary ───────────────────────────────────────────

const WEEK_EMAIL = `test-week-${Date.now()}@test.local`;
let weekUserId: number;
let weekExerciseId: number;
let lastWeekSessionId: number;
let thisWeekSessionId: number;

describe("Volume accuracy — cross-week boundary", () => {
  beforeAll(async () => {
    const [user] = await db
      .insert(users)
      .values({ email: WEEK_EMAIL, name: "Test Week User" })
      .returning();
    weekUserId = user.id;

    const [exercise] = await db
      .insert(exercises)
      .values({
        name: `Test Squat ${Date.now()}`,
        muscleGroups: { primary: ["quads"], secondary: ["glutes"] },
        movementPattern: "squat",
        equipment: "barbell",
      })
      .returning();
    weekExerciseId = exercise.id;

    await db.insert(userVolumeLandmarks).values({
      userId: weekUserId,
      muscleGroup: "quads",
      mev: 8,
      mav: 14,
      mrv: 20,
    });

    // Session from last week (7 days ago) — should NOT count
    const lastWeek = new Date();
    lastWeek.setDate(lastWeek.getDate() - 7);
    const [oldSession] = await db
      .insert(workoutSessions)
      .values({
        userId: weekUserId,
        sessionName: "Last Week Squat",
        date: lastWeek,
        durationMinutes: 50,
        status: "completed",
      })
      .returning();
    lastWeekSessionId = oldSession.id;

    await db.insert(exerciseSets).values([
      { sessionId: lastWeekSessionId, exerciseId: weekExerciseId, setNumber: 1, weight: 225, reps: 8, rir: 2 },
      { sessionId: lastWeekSessionId, exerciseId: weekExerciseId, setNumber: 2, weight: 225, reps: 7, rir: 1 },
      { sessionId: lastWeekSessionId, exerciseId: weekExerciseId, setNumber: 3, weight: 225, reps: 6, rir: 0 },
    ]);

    // Session from today — should count
    const [newSession] = await db
      .insert(workoutSessions)
      .values({
        userId: weekUserId,
        sessionName: "This Week Squat",
        date: new Date(),
        durationMinutes: 50,
        status: "completed",
      })
      .returning();
    thisWeekSessionId = newSession.id;

    await db.insert(exerciseSets).values([
      { sessionId: thisWeekSessionId, exerciseId: weekExerciseId, setNumber: 1, weight: 230, reps: 8, rir: 2 },
      { sessionId: thisWeekSessionId, exerciseId: weekExerciseId, setNumber: 2, weight: 230, reps: 7, rir: 1 },
    ]);
  });

  it("only counts sets from the current week (Monday-based)", async () => {
    await invalidateCache(weekUserId, ["volume"]);
    const volume = await getCachedVolume(weekUserId);

    // Only 2 sets from this week's session; last week's 3 excluded
    expect(volume.volumeByGroup["quads"]).toBe(2);
  });

  it("weekStart is a Monday", async () => {
    const volume = await getCachedVolume(weekUserId);
    const weekStart = new Date(volume.weekStart);
    // getDay() === 1 = Monday
    expect(weekStart.getDay()).toBe(1);
  });

  afterAll(async () => {
    const sessionIds = [lastWeekSessionId, thisWeekSessionId].filter(Boolean);
    if (sessionIds.length > 0) {
      await db.delete(exerciseSets).where(inArray(exerciseSets.sessionId, sessionIds));
      await db.delete(workoutSessions).where(inArray(workoutSessions.id, sessionIds));
    }
    if (weekUserId) {
      await db.delete(userVolumeLandmarks).where(eq(userVolumeLandmarks.userId, weekUserId));
    }
    if (weekExerciseId) {
      await db.delete(exercises).where(eq(exercises.id, weekExerciseId));
    }
    if (weekUserId) {
      await db.delete(users).where(eq(users.id, weekUserId));
    }
    await invalidateCache(weekUserId, ["volume"]);
  });
});

// ─── Multi-session aggregation ─────────────────────────────────────

const MULTI_EMAIL = `test-multi-${Date.now()}@test.local`;
let multiUserId: number;
let multiExerciseId: number;
const multiSessionIds: number[] = [];

describe("Volume accuracy — multi-session aggregation", () => {
  beforeAll(async () => {
    const [user] = await db
      .insert(users)
      .values({ email: MULTI_EMAIL, name: "Test Multi User" })
      .returning();
    multiUserId = user.id;

    const [exercise] = await db
      .insert(exercises)
      .values({
        name: `Test Lateral Raise ${Date.now()}`,
        muscleGroups: { primary: ["side_delts"], secondary: [] },
        movementPattern: "isolation",
        equipment: "dumbbell",
      })
      .returning();
    multiExerciseId = exercise.id;

    await db.insert(userVolumeLandmarks).values({
      userId: multiUserId,
      muscleGroup: "side_delts",
      mev: 10,
      mav: 18,
      mrv: 26,
    });

    // Three completed sessions this week, each with 3 hard sets
    for (let i = 0; i < 3; i++) {
      const sessionDate = new Date();
      // Spread across this week (today, yesterday, day before)
      sessionDate.setDate(sessionDate.getDate() - i);
      // Make sure it's not before Monday
      const dayOfWeek = sessionDate.getDay();
      const monday = new Date(sessionDate);
      monday.setDate(sessionDate.getDate() - ((dayOfWeek + 6) % 7));
      monday.setHours(0, 0, 0, 0);
      if (sessionDate < monday) break; // Don't seed sessions before this Monday

      const [session] = await db
        .insert(workoutSessions)
        .values({
          userId: multiUserId,
          sessionName: `Session ${i + 1}`,
          date: sessionDate,
          durationMinutes: 30,
          status: "completed",
        })
        .returning();
      multiSessionIds.push(session.id);

      await db.insert(exerciseSets).values([
        { sessionId: session.id, exerciseId: multiExerciseId, setNumber: 1, weight: 20, reps: 15, rir: 2 },
        { sessionId: session.id, exerciseId: multiExerciseId, setNumber: 2, weight: 20, reps: 13, rir: 1 },
        { sessionId: session.id, exerciseId: multiExerciseId, setNumber: 3, weight: 20, reps: 11, rir: 0 },
      ]);
    }
  });

  it("aggregates sets across multiple completed sessions", async () => {
    await invalidateCache(multiUserId, ["volume"]);
    const volume = await getCachedVolume(multiUserId);

    // 3 hard sets per session × number of sessions seeded this week
    expect(volume.volumeByGroup["side_delts"]).toBe(3 * multiSessionIds.length);
  });

  it("totalSets matches the sum of all counted sets", async () => {
    const volume = await getCachedVolume(multiUserId);
    expect(volume.totalSets).toBe(3 * multiSessionIds.length);
  });

  afterAll(async () => {
    if (multiSessionIds.length > 0) {
      await db.delete(exerciseSets).where(inArray(exerciseSets.sessionId, multiSessionIds));
      await db.delete(workoutSessions).where(inArray(workoutSessions.id, multiSessionIds));
    }
    if (multiUserId) {
      await db.delete(userVolumeLandmarks).where(eq(userVolumeLandmarks.userId, multiUserId));
    }
    if (multiExerciseId) {
      await db.delete(exercises).where(eq(exercises.id, multiExerciseId));
    }
    if (multiUserId) {
      await db.delete(users).where(eq(users.id, multiUserId));
    }
    await invalidateCache(multiUserId, ["volume"]);
  });
});

// ─── Deload sessions still count in volume ─────────────────────────

const DELOAD_EMAIL = `test-deload-${Date.now()}@test.local`;
let deloadUserId: number;
let deloadExerciseId: number;
let deloadSessionId: number;

describe("Volume accuracy — deload sessions", () => {
  beforeAll(async () => {
    const [user] = await db
      .insert(users)
      .values({ email: DELOAD_EMAIL, name: "Test Deload User" })
      .returning();
    deloadUserId = user.id;

    const [exercise] = await db
      .insert(exercises)
      .values({
        name: `Test Deload Press ${Date.now()}`,
        muscleGroups: { primary: ["chest"], secondary: ["triceps"] },
        movementPattern: "horizontal_press",
        equipment: "barbell",
      })
      .returning();
    deloadExerciseId = exercise.id;

    await db.insert(userVolumeLandmarks).values({
      userId: deloadUserId,
      muscleGroup: "chest",
      mev: 8,
      mav: 14,
      mrv: 22,
    });

    // Completed deload session
    const [session] = await db
      .insert(workoutSessions)
      .values({
        userId: deloadUserId,
        sessionName: "Deload Chest Day",
        date: new Date(),
        durationMinutes: 30,
        status: "completed",
        isDeload: true,
      })
      .returning();
    deloadSessionId = session.id;

    // 2 easy sets at RIR 3 — hard sets, should count
    await db.insert(exerciseSets).values([
      { sessionId: deloadSessionId, exerciseId: deloadExerciseId, setNumber: 1, weight: 95, reps: 12, rir: 3 },
      { sessionId: deloadSessionId, exerciseId: deloadExerciseId, setNumber: 2, weight: 95, reps: 12, rir: 3 },
    ]);
  });

  it("counts completed deload session sets in weekly volume", async () => {
    await invalidateCache(deloadUserId, ["volume"]);
    const volume = await getCachedVolume(deloadUserId);

    // Deload sessions are completed — their hard sets still count
    expect(volume.volumeByGroup["chest"]).toBe(2);
  });

  afterAll(async () => {
    if (deloadSessionId) {
      await db.delete(exerciseSets).where(eq(exerciseSets.sessionId, deloadSessionId));
      await db.delete(workoutSessions).where(eq(workoutSessions.id, deloadSessionId));
    }
    if (deloadUserId) {
      await db.delete(userVolumeLandmarks).where(eq(userVolumeLandmarks.userId, deloadUserId));
    }
    if (deloadExerciseId) {
      await db.delete(exercises).where(eq(exercises.id, deloadExerciseId));
    }
    if (deloadUserId) {
      await db.delete(users).where(eq(users.id, deloadUserId));
    }
    await invalidateCache(deloadUserId, ["volume"]);
  });
});

// ─── Empty state — no sessions ─────────────────────────────────────

const EMPTY_EMAIL = `test-empty-${Date.now()}@test.local`;
let emptyUserId: number;

describe("Volume accuracy — empty state", () => {
  beforeAll(async () => {
    const [user] = await db
      .insert(users)
      .values({ email: EMPTY_EMAIL, name: "Test Empty User" })
      .returning();
    emptyUserId = user.id;

    await db.insert(userVolumeLandmarks).values({
      userId: emptyUserId,
      muscleGroup: "chest",
      mev: 8,
      mav: 14,
      mrv: 22,
    });
  });

  it("returns empty volumeByGroup for user with no sessions", async () => {
    await invalidateCache(emptyUserId, ["volume"]);
    const volume = await getCachedVolume(emptyUserId);

    expect(volume.volumeByGroup).toEqual({});
    expect(volume.totalSets).toBe(0);
  });

  it("still returns correct targetSets from landmarks", async () => {
    const volume = await getCachedVolume(emptyUserId);
    expect(volume.targetSets).toBe(14); // MAV for chest
  });

  afterAll(async () => {
    if (emptyUserId) {
      await db.delete(userVolumeLandmarks).where(eq(userVolumeLandmarks.userId, emptyUserId));
      await db.delete(users).where(eq(users.id, emptyUserId));
    }
    await invalidateCache(emptyUserId, ["volume"]);
  });
});
