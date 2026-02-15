"use server";

import { db } from "@/lib/db";
import {
  workoutSessions,
  exerciseSets,
  exercises,
  mesocycles,
} from "@/lib/db/schema";
import { eq, asc, and, ne, isNotNull, inArray, desc } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { requireUserId } from "@/lib/auth-utils";
import { invalidateCache } from "@/lib/cache";
import type {
  PreviousSetData,
  ExerciseDetail,
  MesocycleContext,
} from "./_components/types";

type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

export async function startWorkout(
  sessionName: string,
  preReadiness?: {
    energy: number;
    motivation: number;
    soreness: number;
    sleepQuality: number;
    sleepHours: number;
  }
): Promise<ActionResult<typeof workoutSessions.$inferSelect>> {
  try {
    const userId = await requireUserId();
    const [session] = await db
      .insert(workoutSessions)
      .values({
        userId,
        sessionName,
        date: new Date(),
        preReadiness: preReadiness ?? null,
      })
      .returning();

    revalidatePath("/workout");
    return { success: true, data: session };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Failed to start workout" };
  }
}

export async function logSet(
  sessionId: number,
  exerciseId: number,
  data: {
    setNumber: number;
    weight: number;
    reps: number;
    rir?: number;
    rpe?: number;
    restSeconds?: number;
    notes?: string;
  }
): Promise<ActionResult<typeof exerciseSets.$inferSelect>> {
  try {
    const userId = await requireUserId();
    const [set] = await db
      .insert(exerciseSets)
      .values({
        sessionId,
        exerciseId,
        setNumber: data.setNumber,
        weight: data.weight,
        reps: data.reps,
        rir: data.rir ?? null,
        rpe: data.rpe ?? null,
        restSeconds: data.restSeconds ?? null,
        notes: data.notes ?? null,
      })
      .returning();

    revalidatePath("/workout");
    await invalidateCache(userId, ["volume"]);
    return { success: true, data: set };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Failed to log set" };
  }
}

export async function deleteSet(setId: number): Promise<ActionResult<null>> {
  try {
    const userId = await requireUserId();
    await db.delete(exerciseSets).where(eq(exerciseSets.id, setId));
    revalidatePath("/workout");
    await invalidateCache(userId, ["volume"]);
    return { success: true, data: null };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Failed to delete set" };
  }
}

export async function completeWorkout(
  sessionId: number,
  data: {
    postNotes?: string;
    durationMinutes?: number;
  }
): Promise<ActionResult<typeof workoutSessions.$inferSelect>> {
  try {
    const userId = await requireUserId();
    const [session] = await db
      .update(workoutSessions)
      .set({
        postNotes: data.postNotes ?? null,
        durationMinutes: data.durationMinutes ?? null,
      })
      .where(eq(workoutSessions.id, sessionId))
      .returning();

    revalidatePath("/workout");
    revalidatePath("/history");
    await invalidateCache(userId, ["volume"]);
    return { success: true, data: session };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Failed to complete workout" };
  }
}

export async function getExerciseList() {
  return db.query.exercises.findMany({
    orderBy: [asc(exercises.name)],
  });
}

export async function getSessionSets(sessionId: number) {
  return db.query.exerciseSets.findMany({
    where: eq(exerciseSets.sessionId, sessionId),
    with: {
      exercise: true,
    },
    orderBy: [asc(exerciseSets.createdAt)],
  });
}

export async function getActiveSession() {
  const userId = await requireUserId();
  const sessions = await db.query.workoutSessions.findMany({
    where: eq(workoutSessions.userId, userId),
    orderBy: (ws, { desc }) => [desc(ws.date)],
    limit: 1,
    with: {
      sets: {
        with: {
          exercise: true,
        },
        orderBy: (es, { asc }) => [asc(es.createdAt)],
      },
    },
  });

  const session = sessions[0];
  if (!session || session.durationMinutes !== null) {
    return null;
  }

  return session;
}

// ─── New: Previous performance for "last time" data ──────────────

export async function getPreviousPerformance(
  exerciseIds: number[],
  currentSessionId: number
): Promise<Record<number, PreviousSetData[]>> {
  if (exerciseIds.length === 0) return {};

  const userId = await requireUserId();

  // Get all sets from completed sessions (not the current one) for the given exercises,
  // ordered by date desc so the first sets per exercise are from the most recent session
  const allSets = await db
    .select({
      exerciseId: exerciseSets.exerciseId,
      setNumber: exerciseSets.setNumber,
      weight: exerciseSets.weight,
      reps: exerciseSets.reps,
      rir: exerciseSets.rir,
      sessionId: exerciseSets.sessionId,
    })
    .from(exerciseSets)
    .innerJoin(workoutSessions, eq(exerciseSets.sessionId, workoutSessions.id))
    .where(
      and(
        eq(workoutSessions.userId, userId),
        ne(workoutSessions.id, currentSessionId),
        isNotNull(workoutSessions.durationMinutes),
        inArray(exerciseSets.exerciseId, exerciseIds),
      )
    )
    .orderBy(desc(workoutSessions.date), asc(exerciseSets.setNumber));

  // Track the most recent sessionId per exercise (first one seen, since ordered by date desc)
  const mostRecentSession: Record<number, number> = {};
  for (const set of allSets) {
    if (!(set.exerciseId in mostRecentSession)) {
      mostRecentSession[set.exerciseId] = set.sessionId;
    }
  }

  // Collect only sets from the most recent session per exercise
  const result: Record<number, PreviousSetData[]> = {};
  for (const set of allSets) {
    if (set.sessionId === mostRecentSession[set.exerciseId]) {
      if (!result[set.exerciseId]) {
        result[set.exerciseId] = [];
      }
      result[set.exerciseId].push({
        weight: set.weight,
        reps: set.reps,
        rir: set.rir,
        setNumber: set.setNumber,
      });
    }
  }

  return result;
}

// ─── New: Session with mesocycle context and exercise details ────

export async function getExerciseDetails(
  exerciseIds: number[]
): Promise<Record<number, ExerciseDetail>> {
  if (exerciseIds.length === 0) return {};

  const rows = await db
    .select({
      id: exercises.id,
      muscleGroups: exercises.muscleGroups,
      equipment: exercises.equipment,
    })
    .from(exercises)
    .where(inArray(exercises.id, exerciseIds));

  const result: Record<number, ExerciseDetail> = {};
  for (const row of rows) {
    result[row.id] = {
      muscleGroups: row.muscleGroups,
      equipment: row.equipment,
    };
  }
  return result;
}

export async function getActiveMesocycleContext(): Promise<MesocycleContext | null> {
  const userId = await requireUserId();

  const activeMeso = await db.query.mesocycles.findFirst({
    where: and(
      eq(mesocycles.userId, userId),
      eq(mesocycles.status, "active")
    ),
  });

  if (!activeMeso) return null;

  return {
    name: activeMeso.name,
    currentWeek: activeMeso.currentWeek,
    totalWeeks: activeMeso.totalWeeks,
    splitType: activeMeso.splitType,
  };
}
