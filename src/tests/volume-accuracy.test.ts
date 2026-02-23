import { describe, it, expect, afterAll } from "vitest";
import { db } from "@/lib/db";
import {
  users,
  exercises,
  workoutSessions,
  exerciseSets,
  userVolumeLandmarks,
} from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { getCachedVolume, invalidateCache } from "@/lib/cache";

const TEST_EMAIL = `test-volume-${Date.now()}@test.local`;

let testUserId: number;
let testExerciseId: number;
let completedSessionId: number;
let activeSessionId: number;
let abandonedSessionId: number;

describe("Volume accuracy", () => {
  // ── Seed test data ──

  it("seeds test user, exercise, and landmark", async () => {
    const [user] = await db
      .insert(users)
      .values({ email: TEST_EMAIL, name: "Test Volume User" })
      .returning();
    testUserId = user.id;

    // Create a test exercise (or reuse if seeder already created one)
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

    await db.insert(userVolumeLandmarks).values({
      userId: testUserId,
      muscleGroup: "chest",
      mev: 8,
      mav: 14,
      mrv: 22,
    });
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
    // Clear any cached volume for this user
    await invalidateCache(testUserId, ["volume"]);

    const volume = await getCachedVolume(testUserId);

    // Only 3 hard sets (RIR 0, 2, 4) from the completed session should count
    expect(volume.volumeByGroup["chest"]).toBe(3);
  });

  it("excludes active session sets", async () => {
    const volume = await getCachedVolume(testUserId);
    // If active sets were included, chest would be 5 (3 + 2)
    expect(volume.volumeByGroup["chest"]).toBe(3);
  });

  it("excludes abandoned session sets", async () => {
    const volume = await getCachedVolume(testUserId);
    // If abandoned sets were included, chest would be 4 (3 + 1)
    expect(volume.volumeByGroup["chest"]).toBe(3);
  });

  it("excludes junk sets (RIR > 4)", async () => {
    const volume = await getCachedVolume(testUserId);
    // Junk set at RIR 5 should be excluded
    expect(volume.volumeByGroup["chest"]).toBe(3);
  });

  it("excludes null RIR sets", async () => {
    const volume = await getCachedVolume(testUserId);
    // Null RIR set should be excluded
    expect(volume.volumeByGroup["chest"]).toBe(3);
  });

  // ── Cleanup ──

  afterAll(async () => {
    // Delete in reverse FK order
    if (completedSessionId) {
      await db.delete(exerciseSets).where(eq(exerciseSets.sessionId, completedSessionId));
    }
    if (activeSessionId) {
      await db.delete(exerciseSets).where(eq(exerciseSets.sessionId, activeSessionId));
    }
    if (abandonedSessionId) {
      await db.delete(exerciseSets).where(eq(exerciseSets.sessionId, abandonedSessionId));
    }
    if (completedSessionId) {
      await db.delete(workoutSessions).where(eq(workoutSessions.id, completedSessionId));
    }
    if (activeSessionId) {
      await db.delete(workoutSessions).where(eq(workoutSessions.id, activeSessionId));
    }
    if (abandonedSessionId) {
      await db.delete(workoutSessions).where(eq(workoutSessions.id, abandonedSessionId));
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

    // Clear cache
    await invalidateCache(testUserId, ["volume"]);
  });
});
