"use server";

import { db } from "@/lib/db";
import { mesocycles, workoutSessions } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { requireUserId } from "@/lib/auth-utils";
import { revalidatePath } from "next/cache";
import type { SessionPlan } from "@/lib/program-utils";

// ─── Types ────────────────────────────────────────────────────────────

export type ProgramData = {
  mesocycle: {
    id: number;
    name: string;
    splitType: string;
    status: string;
    totalWeeks: number;
    currentWeek: number;
    startDate: Date | null;
    volumePlan: Record<string, Record<string, number>> | null;
    sessionPlan: SessionPlan | null;
  };
  sessions: {
    id: number;
    sessionName: string;
    status: string;
    mesocycleWeek: number | null;
    dayNumber: number | null;
    isDeload: boolean | null;
    prescribedExercises: {
      exerciseId: number;
      exerciseName: string;
      targetSets: number;
      repRangeMin: number;
      repRangeMax: number;
      rirTarget: number;
      restSeconds: number;
    }[] | null;
    durationMinutes: number | null;
    date: Date;
  }[];
};

// ─── Get Active Program ───────────────────────────────────────────────

export async function getActiveProgramData(): Promise<ProgramData | null> {
  const userId = await requireUserId();

  const activeMeso = await db.query.mesocycles.findFirst({
    where: and(
      eq(mesocycles.userId, userId),
      eq(mesocycles.status, "active"),
    ),
  });

  if (!activeMeso) return null;

  const sessions = await db.query.workoutSessions.findMany({
    where: eq(workoutSessions.mesocycleId, activeMeso.id),
    orderBy: (ws, { asc }) => [asc(ws.mesocycleWeek), asc(ws.dayNumber)],
  });

  return {
    mesocycle: {
      id: activeMeso.id,
      name: activeMeso.name,
      splitType: activeMeso.splitType,
      status: activeMeso.status,
      totalWeeks: activeMeso.totalWeeks,
      currentWeek: activeMeso.currentWeek,
      startDate: activeMeso.startDate,
      volumePlan: activeMeso.volumePlan as Record<string, Record<string, number>> | null,
      sessionPlan: activeMeso.sessionPlan as SessionPlan | null,
    },
    sessions: sessions.map((s) => ({
      id: s.id,
      sessionName: s.sessionName,
      status: s.status,
      mesocycleWeek: s.mesocycleWeek,
      dayNumber: s.dayNumber,
      isDeload: s.isDeload,
      prescribedExercises: s.prescribedExercises as ProgramData["sessions"][number]["prescribedExercises"],
      durationMinutes: s.durationMinutes,
      date: s.date,
    })),
  };
}

// ─── Get Program by ID ────────────────────────────────────────────────

export async function getProgramDataById(mesoId: number): Promise<ProgramData | null> {
  const userId = await requireUserId();

  const meso = await db.query.mesocycles.findFirst({
    where: and(
      eq(mesocycles.id, mesoId),
      eq(mesocycles.userId, userId),
    ),
  });

  if (!meso) return null;

  const sessions = await db.query.workoutSessions.findMany({
    where: eq(workoutSessions.mesocycleId, meso.id),
    orderBy: (ws, { asc }) => [asc(ws.mesocycleWeek), asc(ws.dayNumber)],
  });

  return {
    mesocycle: {
      id: meso.id,
      name: meso.name,
      splitType: meso.splitType,
      status: meso.status,
      totalWeeks: meso.totalWeeks,
      currentWeek: meso.currentWeek,
      startDate: meso.startDate,
      volumePlan: meso.volumePlan as Record<string, Record<string, number>> | null,
      sessionPlan: meso.sessionPlan as SessionPlan | null,
    },
    sessions: sessions.map((s) => ({
      id: s.id,
      sessionName: s.sessionName,
      status: s.status,
      mesocycleWeek: s.mesocycleWeek,
      dayNumber: s.dayNumber,
      isDeload: s.isDeload,
      prescribedExercises: s.prescribedExercises as ProgramData["sessions"][number]["prescribedExercises"],
      durationMinutes: s.durationMinutes,
      date: s.date,
    })),
  };
}

// ─── Start Planned Session ────────────────────────────────────────────

export async function startPlannedSession(
  sessionId: number
): Promise<{ success: boolean; error?: string }> {
  const userId = await requireUserId();

  // Guard: check no other active session
  const existingActive = await db.query.workoutSessions.findFirst({
    where: and(
      eq(workoutSessions.userId, userId),
      eq(workoutSessions.status, "active"),
    ),
  });

  if (existingActive) {
    return {
      success: false,
      error: `You already have an active session: "${existingActive.sessionName}". Complete it first.`,
    };
  }

  // Verify the session is planned and belongs to this user
  const session = await db.query.workoutSessions.findFirst({
    where: and(
      eq(workoutSessions.id, sessionId),
      eq(workoutSessions.userId, userId),
      eq(workoutSessions.status, "planned"),
    ),
  });

  if (!session) {
    return { success: false, error: "Session not found or not in planned state." };
  }

  // Activate: set status to active and date to now
  await db
    .update(workoutSessions)
    .set({ status: "active", date: new Date() })
    .where(eq(workoutSessions.id, sessionId));

  revalidatePath("/workout", "page");
  revalidatePath("/program", "page");

  return { success: true };
}

// ─── Get Planned Sessions for Current Week ────────────────────────────

export async function getPlannedSessions(): Promise<{
  mesocycleName: string;
  currentWeek: number;
  totalWeeks: number;
  sessions: {
    id: number;
    sessionName: string;
    status: string;
    dayNumber: number | null;
    isDeload: boolean | null;
    exerciseCount: number;
    exercisePreview: string[];
  }[];
} | null> {
  const userId = await requireUserId();

  const activeMeso = await db.query.mesocycles.findFirst({
    where: and(
      eq(mesocycles.userId, userId),
      eq(mesocycles.status, "active"),
    ),
  });

  if (!activeMeso) return null;

  const weekSessions = await db.query.workoutSessions.findMany({
    where: and(
      eq(workoutSessions.mesocycleId, activeMeso.id),
      eq(workoutSessions.mesocycleWeek, activeMeso.currentWeek),
    ),
    orderBy: (ws, { asc }) => [asc(ws.dayNumber)],
  });

  if (weekSessions.length === 0) return null;

  return {
    mesocycleName: activeMeso.name,
    currentWeek: activeMeso.currentWeek,
    totalWeeks: activeMeso.totalWeeks,
    sessions: weekSessions.map((s) => {
      const prescribed = s.prescribedExercises as {
        exerciseName: string;
        targetSets: number;
      }[] | null;
      return {
        id: s.id,
        sessionName: s.sessionName,
        status: s.status,
        dayNumber: s.dayNumber,
        isDeload: s.isDeload,
        exerciseCount: prescribed?.length ?? 0,
        exercisePreview: prescribed?.slice(0, 3).map((e) => e.exerciseName) ?? [],
      };
    }),
  };
}
