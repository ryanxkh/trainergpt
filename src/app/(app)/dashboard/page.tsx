import { Suspense } from "react";
import { db } from "@/lib/db";
import {
  mesocycles,
  workoutSessions,
  exerciseSets,
  exercises,
  userVolumeLandmarks,
} from "@/lib/db/schema";
import { eq, desc, and, gte, sql } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import Link from "next/link";
import { Calendar, Dumbbell, TrendingUp, Timer, AlertTriangle } from "lucide-react";
import { getCachedVolume, getDeloadRecommendation } from "@/lib/cache";

async function getUserId() {
  const session = await auth();
  return session?.user?.id ? parseInt(session.user.id as string) : 1;
}

// ─── Current Mesocycle Card ─────────────────────────────────────────

async function CurrentMesocycle() {
  const userId = await getUserId();

  const active = await db.query.mesocycles.findFirst({
    where: and(eq(mesocycles.userId, userId), eq(mesocycles.status, "active")),
  });

  if (!active) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Current Mesocycle
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-bold">No active program</p>
          <Link
            href="/program"
            className="text-sm text-primary hover:underline"
          >
            Generate one &rarr;
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <Link href={`/program/${active.id}`}>
      <Card className="hover:bg-muted/50 transition-colors">
        <CardHeader>
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Current Mesocycle
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-bold">
            Week {active.currentWeek} of {active.totalWeeks}
          </p>
          <p className="text-sm text-muted-foreground capitalize">
            {active.name} &middot; {active.splitType.replace(/_/g, " ")}
          </p>
        </CardContent>
      </Card>
    </Link>
  );
}

// ─── Weekly Volume Card ─────────────────────────────────────────────

async function WeeklyVolume() {
  const userId = await getUserId();
  const volume = await getCachedVolume(userId);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium text-muted-foreground">
          This Week&apos;s Volume
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-bold">{volume.totalSets} sets</p>
        <p className="text-sm text-muted-foreground">
          Target: ~{volume.targetSets} sets (MAV)
        </p>
      </CardContent>
    </Card>
  );
}

// ─── Last Workout Card ──────────────────────────────────────────────

async function LastWorkout() {
  const userId = await getUserId();

  const lastSession = await db.query.workoutSessions.findFirst({
    where: and(
      eq(workoutSessions.userId, userId),
      // Only completed workouts
      sql`${workoutSessions.durationMinutes} IS NOT NULL`
    ),
    orderBy: [desc(workoutSessions.date)],
    with: {
      sets: true,
    },
  });

  if (!lastSession) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Last Workout
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-bold">&mdash;</p>
          <p className="text-sm text-muted-foreground">No workouts logged yet</p>
        </CardContent>
      </Card>
    );
  }

  const daysSince = Math.floor(
    (Date.now() - new Date(lastSession.date).getTime()) / (1000 * 60 * 60 * 24)
  );

  return (
    <Link href={`/workout/${lastSession.id}`}>
      <Card className="hover:bg-muted/50 transition-colors">
        <CardHeader>
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Last Workout
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-bold">{lastSession.sessionName}</p>
          <p className="text-sm text-muted-foreground">
            {lastSession.sets.length} sets &middot;{" "}
            {lastSession.durationMinutes} min &middot;{" "}
            {daysSince === 0 ? "Today" : daysSince === 1 ? "Yesterday" : `${daysSince} days ago`}
          </p>
        </CardContent>
      </Card>
    </Link>
  );
}

// ─── Recent Activity ────────────────────────────────────────────────

async function RecentActivity() {
  const userId = await getUserId();

  const recentSessions = await db.query.workoutSessions.findMany({
    where: eq(workoutSessions.userId, userId),
    orderBy: [desc(workoutSessions.date)],
    limit: 5,
    with: {
      sets: true,
    },
  });

  if (recentSessions.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Start your first workout to see activity here.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Activity</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {recentSessions.map((session) => (
            <Link
              key={session.id}
              href={`/workout/${session.id}`}
              className="flex items-center justify-between p-3 rounded-md hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <Dumbbell className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">{session.sessionName}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(session.date).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <span>{session.sets.length} sets</span>
                {session.durationMinutes && (
                  <span className="flex items-center gap-1">
                    <Timer className="h-3 w-3" />
                    {session.durationMinutes}m
                  </span>
                )}
                {!session.durationMinutes && (
                  <Badge variant="secondary" className="text-xs">
                    In Progress
                  </Badge>
                )}
              </div>
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Deload Alert ──────────────────────────────────────────────────

async function DeloadAlert() {
  const userId = await getUserId();
  const recommendation = await getDeloadRecommendation(userId);

  if (!recommendation?.shouldDeload) return null;

  return (
    <Card className="border-yellow-500/50 bg-yellow-50 dark:bg-yellow-950/20">
      <CardContent className="flex items-start gap-3 py-4">
        <AlertTriangle className="h-5 w-5 text-yellow-600 shrink-0 mt-0.5" />
        <div>
          <p className="font-semibold text-yellow-800 dark:text-yellow-200">
            Deload Recommended
          </p>
          <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
            {recommendation.reason}
          </p>
          <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-1">
            {recommendation.mesocycleName} &middot; Week {recommendation.currentWeek} of{" "}
            {recommendation.totalWeeks}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Skeleton Loaders ───────────────────────────────────────────────

function StatCardSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-4 w-32" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-8 w-24 mb-1" />
        <Skeleton className="h-4 w-40" />
      </CardContent>
    </Card>
  );
}

function ActivitySkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-6 w-36" />
      </CardHeader>
      <CardContent className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-3 p-3">
            <Skeleton className="h-4 w-4 rounded" />
            <div className="flex-1">
              <Skeleton className="h-4 w-32 mb-1" />
              <Skeleton className="h-3 w-24" />
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

// ─── Dashboard Page ─────────────────────────────────────────────────

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Dashboard</h1>

      <Suspense fallback={null}>
        <DeloadAlert />
      </Suspense>

      <div className="grid gap-4 md:grid-cols-3">
        <Suspense fallback={<StatCardSkeleton />}>
          <CurrentMesocycle />
        </Suspense>
        <Suspense fallback={<StatCardSkeleton />}>
          <WeeklyVolume />
        </Suspense>
        <Suspense fallback={<StatCardSkeleton />}>
          <LastWorkout />
        </Suspense>
      </div>

      <Suspense fallback={<ActivitySkeleton />}>
        <RecentActivity />
      </Suspense>
    </div>
  );
}
