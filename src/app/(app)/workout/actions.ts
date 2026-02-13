"use server";

import { db } from "@/lib/db";
import { workoutSessions, exerciseSets, exercises } from "@/lib/db/schema";
import { eq, asc } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { requireUserId } from "@/lib/auth-utils";
import { invalidateCache } from "@/lib/cache";

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
