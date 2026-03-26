import { db } from "./db";
import { workoutSessions } from "./db/schema";
import { eq, desc, and } from "drizzle-orm";
import {
  getCachedVolume,
  getCachedProfile,
  getDeloadRecommendation,
} from "./cache";
import type { ProfileData, VolumeData, DeloadRecommendation } from "./cache";

// ─── Types ──────────────────────────────────────────────────────────

type VolumeStatus = {
  group: string;
  sets: number;
  mev: number;
  mav: number;
  mrv: number;
  status: "below_mev" | "at_mev" | "in_range" | "approaching_mrv" | "above_mrv";
};

type ProgressionFlag = {
  exercise: string;
  flag: "stall" | "overreach" | "ready_to_increase";
  detail: string;
};

type RecentSession = {
  id: number;
  sessionName: string;
  date: Date;
  exerciseNames: string[];
  totalSets: number;
};

export type SessionBriefing = {
  mesocycleStatus: string | null;
  daysSinceLastWorkout: number | null;
  lastSessionName: string | null;
  volumeStatuses: VolumeStatus[];
  muscleGroupsNeedingWork: string[];
  progressionFlags: ProgressionFlag[];
  deloadStatus: string;
  recommendation: string | null;
};

// ─── Main Briefing Generator ────────────────────────────────────────

export async function generateSessionBriefing(
  userId: number
): Promise<{ briefing: SessionBriefing; xml: string } | null> {
  try {
    // Gather data in parallel — all cached or lightweight queries
    const [profile, volume, deload, recentSessions] = await Promise.all([
      getCachedProfile(userId),
      getCachedVolume(userId),
      getDeloadRecommendation(userId),
      getRecentSessions(userId, 5),
    ]);

    // If no profile, this is a new user — skip briefing
    if (!profile) return null;

    // Compute each section
    const mesocycleStatus = computeMesocycleStatus(profile);
    const { daysSinceLastWorkout, lastSessionName } = computeLastWorkout(recentSessions);
    const volumeStatuses = computeVolumeStatuses(volume, profile);
    const muscleGroupsNeedingWork = computeGroupsNeedingWork(
      volumeStatuses,
      profile.profile.availableTrainingDays,
      daysSinceLastWorkout
    );

    // Get progression trends for exercises in recent sessions
    const recentExerciseNames = [
      ...new Set(recentSessions.flatMap((s) => s.exerciseNames)),
    ];
    const progressionFlags = await computeProgressionFlags(userId, recentExerciseNames);

    const deloadStatus = computeDeloadStatus(deload, profile);

    const recommendation = computeRecommendation({
      volumeStatuses,
      muscleGroupsNeedingWork,
      daysSinceLastWorkout,
      lastSessionName,
      progressionFlags,
      deloadStatus,
      profile,
    });

    const briefing: SessionBriefing = {
      mesocycleStatus,
      daysSinceLastWorkout,
      lastSessionName,
      volumeStatuses,
      muscleGroupsNeedingWork,
      progressionFlags,
      deloadStatus,
      recommendation,
    };

    const xml = formatBriefingXml(briefing);

    return { briefing, xml };
  } catch (error) {
    // Briefing is non-critical — if anything fails, return null and let the coach
    // work without it rather than breaking the chat endpoint
    console.error("[briefing] Failed to generate session briefing:", error);
    return null;
  }
}

// ─── Data Queries ───────────────────────────────────────────────────

async function getRecentSessions(
  userId: number,
  limit: number
): Promise<RecentSession[]> {
  const sessions = await db.query.workoutSessions.findMany({
    where: and(
      eq(workoutSessions.userId, userId),
      eq(workoutSessions.status, "completed")
    ),
    orderBy: [desc(workoutSessions.date)],
    limit,
    with: {
      sets: {
        with: {
          exercise: true,
        },
      },
    },
  });

  return sessions.map((s) => ({
    id: s.id,
    sessionName: s.sessionName,
    date: s.date,
    exerciseNames: [...new Set(s.sets.map((set) => set.exercise.name))],
    totalSets: s.sets.length,
  }));
}

async function getExerciseProgressionData(
  userId: number,
  exerciseNames: string[]
): Promise<
  Map<
    string,
    {
      sessions: {
        date: Date;
        avgWeight: number;
        avgReps: number;
        avgRir: number | null;
      }[];
    }
  >
> {
  if (exerciseNames.length === 0) return new Map();

  // Get all sets for these exercises across recent sessions
  const allSessions = await db.query.workoutSessions.findMany({
    where: and(
      eq(workoutSessions.userId, userId),
      eq(workoutSessions.status, "completed")
    ),
    orderBy: [desc(workoutSessions.date)],
    limit: 10, // Look back further for trend detection
    with: {
      sets: {
        with: {
          exercise: true,
        },
      },
    },
  });

  const exerciseData = new Map<
    string,
    {
      sessions: {
        date: Date;
        avgWeight: number;
        avgReps: number;
        avgRir: number | null;
      }[];
    }
  >();

  const nameSet = new Set(exerciseNames.map((n) => n.toLowerCase()));

  for (const session of allSessions) {
    // Group sets by exercise
    const exerciseGroups = new Map<
      string,
      { weights: number[]; reps: number[]; rirs: number[] }
    >();

    for (const set of session.sets) {
      const name = set.exercise.name;
      if (!nameSet.has(name.toLowerCase())) continue;

      if (!exerciseGroups.has(name)) {
        exerciseGroups.set(name, { weights: [], reps: [], rirs: [] });
      }
      const group = exerciseGroups.get(name)!;
      group.weights.push(set.weight);
      group.reps.push(set.reps);
      if (set.rir !== null) group.rirs.push(set.rir);
    }

    for (const [name, data] of exerciseGroups) {
      if (!exerciseData.has(name)) {
        exerciseData.set(name, { sessions: [] });
      }
      exerciseData.get(name)!.sessions.push({
        date: session.date,
        avgWeight: Math.round(
          data.weights.reduce((s, v) => s + v, 0) / data.weights.length
        ),
        avgReps: +(
          data.reps.reduce((s, v) => s + v, 0) / data.reps.length
        ).toFixed(1),
        avgRir:
          data.rirs.length > 0
            ? +(
                data.rirs.reduce((s, v) => s + v, 0) / data.rirs.length
              ).toFixed(1)
            : null,
      });
    }
  }

  return exerciseData;
}

// ─── Computation Functions ──────────────────────────────────────────

function computeMesocycleStatus(profile: ProfileData): string | null {
  const meso = profile.activeMesocycle;
  if (!meso) return null;

  return `Week ${meso.currentWeek} of ${meso.totalWeeks} — ${meso.name} (${formatSplitType(meso.splitType)})`;
}

function computeLastWorkout(recentSessions: RecentSession[]): {
  daysSinceLastWorkout: number | null;
  lastSessionName: string | null;
} {
  if (recentSessions.length === 0) {
    return { daysSinceLastWorkout: null, lastSessionName: null };
  }

  const last = recentSessions[0];
  const daysSince = Math.floor(
    (Date.now() - new Date(last.date).getTime()) / (1000 * 60 * 60 * 24)
  );

  return {
    daysSinceLastWorkout: daysSince,
    lastSessionName: last.sessionName,
  };
}

function computeVolumeStatuses(
  volume: VolumeData,
  profile: ProfileData
): VolumeStatus[] {
  const landmarks = profile.volumeLandmarks;
  const statuses: VolumeStatus[] = [];

  // Include all groups that have landmarks (even if 0 sets)
  const allGroups = new Set([
    ...Object.keys(volume.volumeByGroup),
    ...Object.keys(landmarks),
  ]);

  for (const group of allGroups) {
    const lm = landmarks[group];
    if (!lm) continue; // Skip groups without landmarks

    const sets = volume.volumeByGroup[group] || 0;
    let status: VolumeStatus["status"];

    if (sets < lm.mev) {
      status = "below_mev";
    } else if (sets < lm.mav) {
      status = "at_mev";
    } else if (sets <= lm.mrv * 0.85) {
      status = "in_range";
    } else if (sets <= lm.mrv) {
      status = "approaching_mrv";
    } else {
      status = "above_mrv";
    }

    statuses.push({
      group,
      sets,
      mev: lm.mev,
      mav: lm.mav,
      mrv: lm.mrv,
      status,
    });
  }

  // Sort: below_mev first (needs most attention), then by sets ascending
  const statusPriority: Record<string, number> = {
    below_mev: 0,
    at_mev: 1,
    in_range: 2,
    approaching_mrv: 3,
    above_mrv: 4,
  };

  statuses.sort(
    (a, b) =>
      statusPriority[a.status] - statusPriority[b.status] ||
      a.sets - b.sets
  );

  return statuses;
}

function computeGroupsNeedingWork(
  volumeStatuses: VolumeStatus[],
  _availableTrainingDays: number | null,
  _daysSinceLastWorkout: number | null
): string[] {
  // Groups below MEV need attention
  return volumeStatuses
    .filter((v) => v.status === "below_mev")
    .map((v) => v.group);
}

async function computeProgressionFlags(
  userId: number,
  exerciseNames: string[]
): Promise<ProgressionFlag[]> {
  if (exerciseNames.length === 0) return [];

  const exerciseData = await getExerciseProgressionData(userId, exerciseNames);
  const flags: ProgressionFlag[] = [];

  for (const [name, data] of exerciseData) {
    const sessions = data.sessions;
    if (sessions.length < 3) continue; // Need at least 3 sessions for trend detection

    const recent = sessions.slice(0, 4); // Most recent 4 sessions

    // Stall detection: weight hasn't increased in 3+ sessions while RIR <= 2
    const weights = recent.map((s) => s.avgWeight);
    const rirs = recent.map((s) => s.avgRir).filter((r): r is number => r !== null);
    const sameWeight =
      weights.length >= 3 &&
      weights.slice(0, 3).every((w) => w === weights[0]);
    const lowRir = rirs.length >= 2 && rirs.slice(0, 2).every((r) => r <= 2);

    if (sameWeight && lowRir) {
      const avgReps = recent[0].avgReps;
      const suggestedWeight = weights[0] <= 50
        ? weights[0] + 2.5
        : weights[0] + 5;

      flags.push({
        exercise: name,
        flag: "ready_to_increase",
        detail: `${weights[0]}lb x ${avgReps} reps @ ${rirs[0]} RIR for ${Math.min(weights.filter((w) => w === weights[0]).length, 3)}+ sessions — ready for weight increase (suggest ${suggestedWeight}lb)`,
      });
      continue;
    }

    // Overreach detection: reps declining session-over-session at same weight
    if (recent.length >= 3) {
      const sameWeightRecent =
        recent.slice(0, 3).every((s) => s.avgWeight === recent[0].avgWeight);
      const repsDeclining =
        recent[0].avgReps < recent[1].avgReps &&
        recent[1].avgReps < recent[2].avgReps;

      if (sameWeightRecent && repsDeclining) {
        flags.push({
          exercise: name,
          flag: "overreach",
          detail: `reps declining ${recent[2].avgReps} -> ${recent[1].avgReps} -> ${recent[0].avgReps} at ${recent[0].avgWeight}lb — possible fatigue accumulation`,
        });
      }
    }
  }

  return flags;
}

function computeDeloadStatus(
  deload: DeloadRecommendation | null,
  profile: ProfileData
): string {
  if (!deload) {
    const meso = profile.activeMesocycle;
    if (!meso) return "No active mesocycle";
    return `Not recommended (week ${meso.currentWeek}, no systemic performance decline detected)`;
  }

  if (deload.shouldDeload) {
    return `RECOMMENDED — ${deload.reason ?? "scheduled deload"} (week ${deload.currentWeek} of ${deload.totalWeeks})`;
  }

  return `Not recommended (week ${deload.currentWeek} of ${deload.totalWeeks}, no systemic performance decline)`;
}

function computeRecommendation(ctx: {
  volumeStatuses: VolumeStatus[];
  muscleGroupsNeedingWork: string[];
  daysSinceLastWorkout: number | null;
  lastSessionName: string | null;
  progressionFlags: ProgressionFlag[];
  deloadStatus: string;
  profile: ProfileData;
}): string | null {
  const {
    volumeStatuses,
    muscleGroupsNeedingWork,
    daysSinceLastWorkout,
    lastSessionName,
    progressionFlags,
    deloadStatus,
    profile,
  } = ctx;

  // Priority 1: Deload recommended
  if (deloadStatus.startsWith("RECOMMENDED")) {
    return "Deload is recommended. Consider a reduced-volume session at 50-60% of normal volume.";
  }

  // Priority 2: Significant muscle groups below MEV
  if (muscleGroupsNeedingWork.length > 0) {
    const groups = muscleGroupsNeedingWork.slice(0, 4).join(", ");
    return `${groups} ${muscleGroupsNeedingWork.length === 1 ? "is" : "are"} below MEV — prioritize ${muscleGroupsNeedingWork.length === 1 ? "this group" : "these groups"} today.`;
  }

  // Priority 3: Approaching MRV on many groups
  const approachingMrv = volumeStatuses.filter(
    (v) => v.status === "approaching_mrv" || v.status === "above_mrv"
  );
  if (approachingMrv.length >= 3) {
    return `Volume is high across multiple groups (${approachingMrv.map((v) => v.group).join(", ")}). Consider a lighter session or targeting lagging groups.`;
  }

  // Priority 4: Weight increase opportunities
  const readyToIncrease = progressionFlags.filter(
    (f) => f.flag === "ready_to_increase"
  );
  if (readyToIncrease.length > 0) {
    return `${readyToIncrease[0].exercise} is ready for a weight increase. Focus on progressive overload today.`;
  }

  // Priority 5: Based on what was trained last
  if (lastSessionName && daysSinceLastWorkout !== null) {
    const split = profile.profile.preferredSplit;
    if (split === "upper_lower") {
      const wasUpper = lastSessionName.toLowerCase().includes("upper");
      const wasLower = lastSessionName.toLowerCase().includes("lower");
      if (wasUpper) return "Lower body day — complement your last upper session.";
      if (wasLower) return "Upper body day — complement your last lower session.";
    }
    if (split === "push_pull_legs") {
      const wasPush = lastSessionName.toLowerCase().includes("push");
      const wasPull = lastSessionName.toLowerCase().includes("pull");
      const wasLegs = lastSessionName.toLowerCase().includes("leg");
      if (wasPush) return "Pull or legs day — keep the rotation going.";
      if (wasPull) return "Legs or push day — keep the rotation going.";
      if (wasLegs) return "Push or pull day — keep the rotation going.";
    }
  }

  return null;
}

// ─── XML Formatting ─────────────────────────────────────────────────

function formatBriefingXml(briefing: SessionBriefing): string {
  const lines: string[] = ["<session_briefing>"];

  // Mesocycle status
  if (briefing.mesocycleStatus) {
    lines.push(
      `<mesocycle_status>${briefing.mesocycleStatus}</mesocycle_status>`
    );
  }

  // Days since last workout
  if (briefing.daysSinceLastWorkout !== null) {
    const detail = briefing.lastSessionName
      ? ` (${briefing.lastSessionName})`
      : "";
    lines.push(
      `<days_since_last_workout>${briefing.daysSinceLastWorkout}${detail}</days_since_last_workout>`
    );
  }

  // Volume status — only include groups with landmarks
  if (briefing.volumeStatuses.length > 0) {
    lines.push("<volume_status>");
    for (const v of briefing.volumeStatuses) {
      const statusLabel = formatVolumeStatusLabel(v);
      lines.push(
        `  - ${v.group}: ${v.sets} sets (MEV=${v.mev}, MAV=${v.mav}, MRV=${v.mrv}) — ${statusLabel}`
      );
    }
    lines.push("</volume_status>");
  }

  // Progression flags
  if (briefing.progressionFlags.length > 0) {
    lines.push("<progression_flags>");
    for (const flag of briefing.progressionFlags) {
      const label =
        flag.flag === "ready_to_increase"
          ? "READY FOR WEIGHT INCREASE"
          : flag.flag === "overreach"
          ? "POSSIBLE OVERREACH"
          : "STALL DETECTED";
      lines.push(`  - ${flag.exercise}: ${flag.detail} [${label}]`);
    }
    lines.push("</progression_flags>");
  }

  // Deload status
  lines.push(`<deload_status>${briefing.deloadStatus}</deload_status>`);

  // Recommendation
  if (briefing.recommendation) {
    lines.push(
      `<recommendation>${briefing.recommendation}</recommendation>`
    );
  }

  lines.push("</session_briefing>");

  return lines.join("\n");
}

function formatVolumeStatusLabel(v: VolumeStatus): string {
  switch (v.status) {
    case "below_mev":
      return "needs attention, below MEV";
    case "at_mev":
      return "at MEV, room to grow";
    case "in_range":
      return "on track";
    case "approaching_mrv":
      return "approaching MRV, be cautious";
    case "above_mrv":
      return "ABOVE MRV, reduce volume";
  }
}

function formatSplitType(split: string): string {
  switch (split) {
    case "upper_lower":
      return "upper/lower split";
    case "push_pull_legs":
      return "push/pull/legs";
    case "full_body":
      return "full body";
    case "custom":
      return "custom split";
    default:
      return split;
  }
}
