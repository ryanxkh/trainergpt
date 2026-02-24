import { db } from "@/lib/db";
import { mesocycles } from "@/lib/db/schema";
import { requireUserId } from "@/lib/auth-utils";
import {
  generateMesocyclePlan,
  buildVolumePlan,
  materializeWeekSessions,
} from "@/lib/program-utils";
import type { SessionPlan } from "@/lib/program-utils";
import { invalidateCache } from "@/lib/cache";

export async function POST(req: Request) {
  const userId = await requireUserId();

  const body = await req.json();
  const { splitType, focusAreas, trainingDays } = body as {
    splitType?: string;
    focusAreas?: string[];
    trainingDays?: number;
  };

  const plan = await generateMesocyclePlan({
    userId,
    splitType,
    trainingDays,
    focusAreas,
  });

  const sessionPlan: SessionPlan = { weeks: plan.weeks };

  const [saved] = await db
    .insert(mesocycles)
    .values({
      userId,
      name: plan.name,
      splitType: plan.splitType,
      totalWeeks: plan.totalWeeks,
      currentWeek: 1,
      status: "active",
      startDate: new Date(),
      volumePlan: buildVolumePlan(plan.weeks),
      sessionPlan,
    })
    .returning();

  // Materialize week 1 sessions as planned
  const week1Sessions = await materializeWeekSessions({
    mesocycleId: saved.id,
    userId,
    sessionPlan,
    weekNumber: 1,
  });

  await invalidateCache(userId, ["profile"]);

  return Response.json({
    mesocycle: saved,
    plan,
    week1Sessions,
  });
}
