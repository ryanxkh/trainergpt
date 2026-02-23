import { db } from "@/lib/db";
import {
  users,
  exercises,
  exerciseSets,
  workoutSessions,
  userVolumeLandmarks,
} from "@/lib/db/schema";
import { eq, and, gte, sql, isNotNull, lte } from "drizzle-orm";
import { setWeeklySummary, type WeeklySummary } from "@/lib/cache";

export async function GET(req: Request) {
  // Verify cron secret (Vercel sets this automatically for cron jobs)
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Get start of current week (Monday)
  const now = new Date();
  const dayOfWeek = now.getDay();
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((dayOfWeek + 6) % 7));
  monday.setHours(0, 0, 0, 0);

  // Get all users
  const allUsers = await db.query.users.findMany();
  let processed = 0;

  for (const user of allUsers) {
    // Get weekly sets grouped by exercise muscle groups
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
          eq(workoutSessions.userId, user.id),
          gte(workoutSessions.date, monday),
          eq(workoutSessions.status, "completed"),
          isNotNull(exerciseSets.rir),
          lte(exerciseSets.rir, 4),
        )
      )
      .groupBy(exercises.muscleGroups);

    // Aggregate volume by muscle group
    const volumeByGroup: Record<string, number> = {};
    for (const row of weeklySets) {
      const mg = row.muscleGroups as { primary: string[] };
      for (const group of mg.primary) {
        volumeByGroup[group] = (volumeByGroup[group] || 0) + row.setCount;
      }
    }

    // Get user's volume landmarks
    const landmarks = await db.query.userVolumeLandmarks.findMany({
      where: eq(userVolumeLandmarks.userId, user.id),
    });

    // Compare against landmarks
    const landmarkComparison: WeeklySummary["landmarkComparison"] = {};
    for (const l of landmarks) {
      const current = volumeByGroup[l.muscleGroup] || 0;
      let status: "below_mev" | "at_mev" | "in_range" | "above_mrv";
      if (current < l.mev) {
        status = "below_mev";
      } else if (current <= l.mev + 1) {
        status = "at_mev";
      } else if (current <= l.mrv) {
        status = "in_range";
      } else {
        status = "above_mrv";
      }

      landmarkComparison[l.muscleGroup] = {
        current,
        mev: l.mev,
        mav: l.mav,
        mrv: l.mrv,
        status,
      };
    }

    const totalSets = Object.values(volumeByGroup).reduce((s, v) => s + v, 0);

    const summary: WeeklySummary = {
      weekStart: monday.toISOString(),
      volumeByGroup,
      landmarkComparison,
      totalSets,
    };

    await setWeeklySummary(user.id, summary);
    processed++;
  }

  return Response.json({
    success: true,
    usersProcessed: processed,
    weekStart: monday.toISOString(),
  });
}
