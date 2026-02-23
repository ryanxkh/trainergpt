import { redis } from "./redis";
import { db } from "./db";
import {
  users,
  exercises,
  exerciseSets,
  workoutSessions,
  userVolumeLandmarks,
  mesocycles,
} from "./db/schema";
import { eq, and, gte, sql, desc, isNotNull, lte } from "drizzle-orm";

// TTL constants (seconds)
const TTL = {
  volume: 300, // 5 minutes
  profile: 3600, // 1 hour
  exercises: 86400, // 24 hours
  weeklySummary: 3600, // 1 hour (set by cron)
  deloadCheck: 3600, // 1 hour (set by cron)
};

// ─── Cache Keys ────────────────────────────────────────────────────

function volumeKey(userId: number) {
  return `cache:volume:${userId}`;
}

function profileKey(userId: number) {
  return `cache:profile:${userId}`;
}

function exerciseListKey() {
  return `cache:exercises`;
}

function weeklySummaryKey(userId: number) {
  return `cache:weekly-summary:${userId}`;
}

function deloadKey(userId: number) {
  return `cache:deload:${userId}`;
}

// ─── Volume Cache ──────────────────────────────────────────────────

export type VolumeData = {
  volumeByGroup: Record<string, number>;
  totalSets: number;
  targetSets: number;
  weekStart: string;
};

export async function getCachedVolume(userId: number): Promise<VolumeData> {
  const cached = await redis.get<VolumeData>(volumeKey(userId));
  if (cached) return cached;

  // Cache miss — query DB
  const now = new Date();
  const dayOfWeek = now.getDay();
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((dayOfWeek + 6) % 7));
  monday.setHours(0, 0, 0, 0);

  const weeklySets = await db
    .select({
      muscleGroups: exercises.muscleGroups,
      setCount: sql<number>`count(*)::int`,
    })
    .from(exerciseSets)
    .innerJoin(workoutSessions, eq(exerciseSets.sessionId, workoutSessions.id))
    .innerJoin(exercises, eq(exerciseSets.exerciseId, exercises.id))
    .where(
      and(
        eq(workoutSessions.userId, userId),
        gte(workoutSessions.date, monday),
        eq(workoutSessions.status, "completed"),
        isNotNull(exerciseSets.rir),
        lte(exerciseSets.rir, 4),
      )
    )
    .groupBy(exercises.muscleGroups);

  const volumeByGroup: Record<string, number> = {};
  for (const row of weeklySets) {
    const mg = row.muscleGroups as { primary: string[] };
    for (const group of mg.primary) {
      volumeByGroup[group] = (volumeByGroup[group] || 0) + row.setCount;
    }
  }

  const totalSets = Object.values(volumeByGroup).reduce((s, v) => s + v, 0);

  const landmarks = await db.query.userVolumeLandmarks.findMany({
    where: eq(userVolumeLandmarks.userId, userId),
  });
  const targetSets = landmarks.reduce((sum, l) => sum + l.mav, 0);

  const data: VolumeData = {
    volumeByGroup,
    totalSets,
    targetSets,
    weekStart: monday.toISOString(),
  };

  await redis.set(volumeKey(userId), data, { ex: TTL.volume });
  return data;
}

// ─── Profile Cache ─────────────────────────────────────────────────

export type ProfileData = {
  profile: {
    name: string | null;
    experienceLevel: string | null;
    trainingAgeMonths: number | null;
    availableTrainingDays: number | null;
    preferredSplit: string | null;
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
};

export async function getCachedProfile(userId: number): Promise<ProfileData | null> {
  const cached = await redis.get<ProfileData>(profileKey(userId));
  if (cached) return cached;

  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
    with: {
      volumeLandmarks: true,
      mesocycles: {
        where: (meso, { eq }) => eq(meso.status, "active"),
        limit: 1,
      },
    },
  });

  if (!user) return null;

  const landmarkMap: Record<string, { mev: number; mav: number; mrv: number }> = {};
  for (const l of user.volumeLandmarks) {
    landmarkMap[l.muscleGroup] = { mev: l.mev, mav: l.mav, mrv: l.mrv };
  }

  const activeMeso = user.mesocycles[0];

  const data: ProfileData = {
    profile: {
      name: user.name,
      experienceLevel: user.experienceLevel,
      trainingAgeMonths: user.trainingAgeMonths,
      availableTrainingDays: user.availableTrainingDays,
      preferredSplit: user.preferredSplit,
    },
    volumeLandmarks: landmarkMap,
    activeMesocycle: activeMeso
      ? {
          id: activeMeso.id,
          name: activeMeso.name,
          currentWeek: activeMeso.currentWeek,
          totalWeeks: activeMeso.totalWeeks,
          splitType: activeMeso.splitType,
          status: activeMeso.status,
        }
      : null,
  };

  await redis.set(profileKey(userId), data, { ex: TTL.profile });
  return data;
}

// ─── Exercise List Cache ───────────────────────────────────────────

export async function getCachedExercises() {
  const cached = await redis.get<Array<{
    id: number;
    name: string;
    muscleGroups: { primary: string[]; secondary: string[] };
    movementPattern: string;
    equipment: string;
  }>>(exerciseListKey());
  if (cached) return cached;

  const allExercises = await db.query.exercises.findMany();
  const simplified = allExercises.map((e) => ({
    id: e.id,
    name: e.name,
    muscleGroups: e.muscleGroups as { primary: string[]; secondary: string[] },
    movementPattern: e.movementPattern,
    equipment: e.equipment,
  }));

  await redis.set(exerciseListKey(), simplified, { ex: TTL.exercises });
  return simplified;
}

// ─── Weekly Summary Cache (written by cron) ────────────────────────

export type WeeklySummary = {
  weekStart: string;
  volumeByGroup: Record<string, number>;
  landmarkComparison: Record<
    string,
    {
      current: number;
      mev: number;
      mav: number;
      mrv: number;
      status: "below_mev" | "at_mev" | "in_range" | "above_mrv";
    }
  >;
  totalSets: number;
};

export async function getWeeklySummary(userId: number): Promise<WeeklySummary | null> {
  return redis.get<WeeklySummary>(weeklySummaryKey(userId));
}

export async function setWeeklySummary(userId: number, data: WeeklySummary) {
  await redis.set(weeklySummaryKey(userId), data, { ex: TTL.weeklySummary });
}

// ─── Deload Check Cache (written by cron) ──────────────────────────

export type DeloadRecommendation = {
  shouldDeload: boolean;
  reason: string | null;
  currentWeek: number;
  totalWeeks: number;
  mesocycleName: string;
};

export async function getDeloadRecommendation(userId: number): Promise<DeloadRecommendation | null> {
  return redis.get<DeloadRecommendation>(deloadKey(userId));
}

export async function setDeloadRecommendation(userId: number, data: DeloadRecommendation) {
  await redis.set(deloadKey(userId), data, { ex: TTL.deloadCheck });
}

// ─── Cache Invalidation ────────────────────────────────────────────

export async function invalidateCache(
  userId: number,
  keys: ("volume" | "profile" | "exercises" | "weekly-summary" | "deload")[]
) {
  const keyMap = {
    volume: volumeKey(userId),
    profile: profileKey(userId),
    exercises: exerciseListKey(),
    "weekly-summary": weeklySummaryKey(userId),
    deload: deloadKey(userId),
  };

  const toDelete = keys.map((k) => keyMap[k]);
  if (toDelete.length > 0) {
    await redis.del(...toDelete);
  }
}
