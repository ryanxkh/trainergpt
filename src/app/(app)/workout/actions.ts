"use server";

import { db } from "@/lib/db";
import {
  workoutSessions,
  exerciseSets,
  exercises,
  mesocycles,
} from "@/lib/db/schema";
import { eq, asc, and, ne, inArray, desc } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { requireUserId } from "@/lib/auth-utils";
import { invalidateCache } from "@/lib/cache";
import type {
  PrescribedExercise,
  PreviousSetData,
  ExerciseDetail,
  MesocycleContext,
  SetType,
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
    setType?: SetType;
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
        setType: data.setType ?? "normal",
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
        status: "completed",
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
    where: and(
      eq(workoutSessions.userId, userId),
      eq(workoutSessions.status, "active"),
    ),
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

  return sessions[0] ?? null;
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
      setType: exerciseSets.setType,
      sessionId: exerciseSets.sessionId,
    })
    .from(exerciseSets)
    .innerJoin(workoutSessions, eq(exerciseSets.sessionId, workoutSessions.id))
    .where(
      and(
        eq(workoutSessions.userId, userId),
        ne(workoutSessions.id, currentSessionId),
        eq(workoutSessions.status, "completed"),
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
        setType: (set.setType as SetType) ?? "normal",
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
      movementPattern: exercises.movementPattern,
      sfrRating: exercises.sfrRating,
      isStretchFocused: exercises.isStretchFocused,
      repRangeOptimal: exercises.repRangeOptimal,
      defaultRestSeconds: exercises.defaultRestSeconds,
    })
    .from(exercises)
    .where(inArray(exercises.id, exerciseIds));

  const result: Record<number, ExerciseDetail> = {};
  for (const row of rows) {
    result[row.id] = {
      muscleGroups: row.muscleGroups,
      equipment: row.equipment,
      movementPattern: row.movementPattern,
      sfrRating: row.sfrRating ?? "medium",
      isStretchFocused: row.isStretchFocused ?? false,
      repRangeOptimal: (row.repRangeOptimal as [number, number]) ?? [8, 12],
      defaultRestSeconds: row.defaultRestSeconds ?? 120,
    };
  }
  return result;
}

// ─── Exercise Swap ──────────────────────────────────────────────────

export async function getAlternativeExercises(
  exerciseId: number,
  excludeIds: number[]
): Promise<{ id: number; name: string; equipment: string; muscleGroups: { primary: string[]; secondary: string[] } }[]> {
  // Look up the exercise's primary muscle groups
  const current = await db.query.exercises.findFirst({
    where: eq(exercises.id, exerciseId),
  });
  if (!current) return [];

  const primaryMuscles = current.muscleGroups.primary;
  if (primaryMuscles.length === 0) return [];

  // Get all exercises and filter to those sharing at least one primary muscle group
  const allExercises = await db.query.exercises.findMany();
  const excluded = new Set([exerciseId, ...excludeIds]);

  return allExercises
    .filter((ex) => {
      if (excluded.has(ex.id)) return false;
      return ex.muscleGroups.primary.some((mg) => primaryMuscles.includes(mg));
    })
    .map((ex) => ({
      id: ex.id,
      name: ex.name,
      equipment: ex.equipment,
      muscleGroups: ex.muscleGroups,
    }));
}

export async function replaceExercise(
  sessionId: number,
  oldExerciseId: number,
  newExerciseId: number
): Promise<ActionResult<{ exerciseName: string }>> {
  try {
    const userId = await requireUserId();

    // Fetch new exercise for name
    const newExercise = await db.query.exercises.findFirst({
      where: eq(exercises.id, newExerciseId),
    });
    if (!newExercise) {
      return { success: false, error: "Exercise not found" };
    }

    // Fetch session to get prescribed exercises
    const session = await db.query.workoutSessions.findFirst({
      where: eq(workoutSessions.id, sessionId),
    });
    if (!session || !session.prescribedExercises) {
      return { success: false, error: "Session not found" };
    }

    // Swap exercise in prescription (keep all other params)
    const updatedPrescription = (session.prescribedExercises as PrescribedExercise[]).map((ex) => {
      if (ex.exerciseId === oldExerciseId) {
        return { ...ex, exerciseId: newExerciseId, exerciseName: newExercise.name };
      }
      return ex;
    });

    // Delete logged sets for old exercise in this session
    await db
      .delete(exerciseSets)
      .where(
        and(
          eq(exerciseSets.sessionId, sessionId),
          eq(exerciseSets.exerciseId, oldExerciseId)
        )
      );

    // Update session with new prescription
    await db
      .update(workoutSessions)
      .set({ prescribedExercises: updatedPrescription })
      .where(eq(workoutSessions.id, sessionId));

    revalidatePath("/workout");
    await invalidateCache(userId, ["volume"]);

    return { success: true, data: { exerciseName: newExercise.name } };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Failed to replace exercise" };
  }
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
