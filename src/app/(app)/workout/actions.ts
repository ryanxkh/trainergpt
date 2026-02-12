"use server";

import { db } from "@/lib/db";
import { workoutSessions, exerciseSets, exercises } from "@/lib/db/schema";
import { eq, asc } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { invalidateCache } from "@/lib/cache";

async function getUserId(): Promise<number> {
  const session = await auth();
  return session?.user?.id ? parseInt(session.user.id as string) : 1;
}

export async function startWorkout(
  sessionName: string,
  preReadiness?: {
    energy: number;
    motivation: number;
    soreness: number;
    sleepQuality: number;
    sleepHours: number;
  }
) {
  const [session] = await db
    .insert(workoutSessions)
    .values({
      userId: await getUserId(),
      sessionName,
      date: new Date(),
      preReadiness: preReadiness ?? null,
    })
    .returning();

  revalidatePath("/workout");
  revalidatePath("/dashboard");
  return session;
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
) {
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
  // Bust volume cache so dashboard + chat tools see updated data
  await invalidateCache(await getUserId(), ["volume"]);
  return set;
}

export async function deleteSet(setId: number) {
  await db.delete(exerciseSets).where(eq(exerciseSets.id, setId));
  revalidatePath("/workout");
  await invalidateCache(await getUserId(), ["volume"]);
}

export async function completeWorkout(
  sessionId: number,
  data: {
    postNotes?: string;
    durationMinutes?: number;
  }
) {
  const [session] = await db
    .update(workoutSessions)
    .set({
      postNotes: data.postNotes ?? null,
      durationMinutes: data.durationMinutes ?? null,
    })
    .where(eq(workoutSessions.id, sessionId))
    .returning();

  revalidatePath("/workout");
  revalidatePath("/dashboard");
  revalidatePath("/history");
  await invalidateCache(await getUserId(), ["volume"]);
  return session;
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
  // Get the most recent session that has no duration (still in progress)
  const sessions = await db.query.workoutSessions.findMany({
    where: eq(workoutSessions.userId, await getUserId()),
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
    return null; // No active session
  }

  return session;
}
