import { db } from "@/lib/db";
import { mesocycles, workoutSessions, exerciseSets } from "@/lib/db/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import { setDeloadRecommendation, type DeloadRecommendation } from "@/lib/cache";

export async function GET(req: Request) {
  // Verify cron secret
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Get all active mesocycles
  const activeMesos = await db.query.mesocycles.findMany({
    where: eq(mesocycles.status, "active"),
  });

  let processed = 0;

  for (const meso of activeMesos) {
    let shouldDeload = false;
    let reason: string | null = null;

    // Rule 1: Week >= 5 in a mesocycle → time for deload
    if (meso.currentWeek >= 5) {
      shouldDeload = true;
      reason = `Week ${meso.currentWeek} of ${meso.totalWeeks} — approaching end of mesocycle. Recommend scheduling deload.`;
    }

    // Rule 2: Check for performance decline (last 2 sessions)
    if (!shouldDeload) {
      const recentSessions = await db.query.workoutSessions.findMany({
        where: and(
          eq(workoutSessions.userId, meso.userId),
          eq(workoutSessions.mesocycleId, meso.id)
        ),
        orderBy: [desc(workoutSessions.date)],
        limit: 3,
        with: { sets: true },
      });

      if (recentSessions.length >= 2) {
        const latest = recentSessions[0];
        const previous = recentSessions[1];

        // Check if average RIR dropped (user struggling more)
        const latestRirs = latest.sets
          .filter((s) => s.rir !== null)
          .map((s) => s.rir!);
        const previousRirs = previous.sets
          .filter((s) => s.rir !== null)
          .map((s) => s.rir!);

        if (latestRirs.length > 0 && previousRirs.length > 0) {
          const avgLatestRir =
            latestRirs.reduce((s, v) => s + v, 0) / latestRirs.length;
          const avgPreviousRir =
            previousRirs.reduce((s, v) => s + v, 0) / previousRirs.length;

          // If average RIR dropped by more than 1 and is below 1, fatigue is high
          if (avgLatestRir < 1 && avgPreviousRir - avgLatestRir > 1) {
            shouldDeload = true;
            reason = `Performance declining: average RIR dropped from ${avgPreviousRir.toFixed(1)} to ${avgLatestRir.toFixed(1)}. High fatigue detected.`;
          }
        }

        // Check readiness scores
        if (!shouldDeload && latest.preReadiness) {
          const readiness = latest.preReadiness;
          const avgReadiness =
            (readiness.energy +
              readiness.motivation +
              readiness.sleepQuality) /
            3;

          if (avgReadiness <= 3 && readiness.soreness >= 8) {
            shouldDeload = true;
            reason = `Low readiness scores (avg ${avgReadiness.toFixed(1)}/10) with high soreness (${readiness.soreness}/10). Recovery deficit detected.`;
          }
        }
      }
    }

    const recommendation: DeloadRecommendation = {
      shouldDeload,
      reason,
      currentWeek: meso.currentWeek,
      totalWeeks: meso.totalWeeks,
      mesocycleName: meso.name,
    };

    await setDeloadRecommendation(meso.userId, recommendation);
    processed++;
  }

  return Response.json({
    success: true,
    mesocyclesChecked: processed,
  });
}
