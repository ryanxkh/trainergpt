import { Suspense } from "react";
import { db } from "@/lib/db";
import {
  workoutSessions,
  exerciseSets,
  exercises,
} from "@/lib/db/schema";
import { eq, desc, and, asc } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import Link from "next/link";
import { Calendar, Timer, Dumbbell, TrendingUp } from "lucide-react";
import { VolumeChart } from "./_components/volume-chart";
import { ShareButton } from "./_components/share-button";
import { showProgressCharts } from "@/lib/flags";

async function getUserId() {
  const session = await auth();
  return session?.user?.id ? parseInt(session.user.id as string) : 1;
}

// ─── Session History List ──────────────────────────────────────────

async function SessionHistory() {
  const userId = await getUserId();

  const sessions = await db.query.workoutSessions.findMany({
    where: eq(workoutSessions.userId, userId),
    orderBy: [desc(workoutSessions.date)],
    limit: 20,
    with: {
      sets: {
        with: { exercise: true },
      },
    },
  });

  if (sessions.length === 0) {
    return (
      <Card>
        <CardContent className="py-8">
          <p className="text-center text-muted-foreground">
            No workouts logged yet. Complete your first workout to see your
            history here.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {sessions.map((session) => {
        const exerciseNames = [
          ...new Set(session.sets.map((s) => s.exercise.name)),
        ];
        const totalVolume = session.sets.reduce(
          (sum, s) => sum + s.weight * s.reps,
          0
        );
        const isComplete = session.durationMinutes !== null;

        return (
          <Link key={session.id} href={`/workout/${session.id}`}>
            <Card className="hover:bg-muted/50 transition-colors">
              <CardContent className="py-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold">{session.sessionName}</p>
                      {!isComplete && (
                        <Badge variant="secondary" className="text-xs">
                          In Progress
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {new Date(session.date).toLocaleDateString()}
                      </span>
                      {session.durationMinutes && (
                        <span className="flex items-center gap-1">
                          <Timer className="h-3 w-3" />
                          {session.durationMinutes}m
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Dumbbell className="h-3 w-3" />
                        {session.sets.length} sets
                      </span>
                      <span>
                        {totalVolume.toLocaleString()} lbs
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {exerciseNames.slice(0, 5).map((name) => (
                        <Badge key={name} variant="outline" className="text-xs">
                          {name}
                        </Badge>
                      ))}
                      {exerciseNames.length > 5 && (
                        <Badge variant="outline" className="text-xs">
                          +{exerciseNames.length - 5}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <ShareButton sessionId={session.id} />
                </div>
              </CardContent>
            </Card>
          </Link>
        );
      })}
    </div>
  );
}

// ─── Exercise Progression ──────────────────────────────────────────

async function ExerciseProgression() {
  const userId = await getUserId();

  // Get all completed sessions with sets
  const sessions = await db.query.workoutSessions.findMany({
    where: eq(workoutSessions.userId, userId),
    orderBy: [asc(workoutSessions.date)],
    with: {
      sets: {
        with: { exercise: true },
      },
    },
  });

  if (sessions.length === 0) return null;

  // Build per-exercise progression: { exerciseName: [{ date, avgWeight, avgReps, sets }] }
  const progressionMap: Record<
    string,
    {
      date: Date;
      avgWeight: number;
      avgReps: number;
      topSetWeight: number;
      topSetReps: number;
      sets: number;
    }[]
  > = {};

  for (const session of sessions) {
    // Group sets by exercise within this session
    const byExercise: Record<string, typeof session.sets> = {};
    for (const set of session.sets) {
      const name = set.exercise.name;
      if (!byExercise[name]) byExercise[name] = [];
      byExercise[name].push(set);
    }

    for (const [name, sets] of Object.entries(byExercise)) {
      if (!progressionMap[name]) progressionMap[name] = [];
      const avgWeight =
        sets.reduce((s, v) => s + v.weight, 0) / sets.length;
      const avgReps = sets.reduce((s, v) => s + v.reps, 0) / sets.length;
      // Top set = highest weight
      const topSet = sets.reduce(
        (best, s) => (s.weight > best.weight ? s : best),
        sets[0]
      );

      progressionMap[name].push({
        date: session.date,
        avgWeight: Math.round(avgWeight * 10) / 10,
        avgReps: Math.round(avgReps * 10) / 10,
        topSetWeight: topSet.weight,
        topSetReps: topSet.reps,
        sets: sets.length,
      });
    }
  }

  // Only show exercises with >= 2 data points
  const progressionEntries = Object.entries(progressionMap)
    .filter(([, data]) => data.length >= 2)
    .sort((a, b) => b[1].length - a[1].length)
    .slice(0, 6);

  if (progressionEntries.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Exercise Progression
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {progressionEntries.map(([name, data]) => {
            const latest = data[data.length - 1];
            const first = data[0];
            const weightChange = latest.topSetWeight - first.topSetWeight;

            return (
              <div key={name}>
                <div className="flex items-center justify-between mb-2">
                  <p className="font-medium">{name}</p>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant={weightChange > 0 ? "default" : weightChange < 0 ? "destructive" : "secondary"}
                      className="text-xs"
                    >
                      {weightChange > 0 ? "+" : ""}
                      {weightChange} lbs
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {data.length} sessions
                    </span>
                  </div>
                </div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">Date</TableHead>
                      <TableHead className="text-xs">Top Set</TableHead>
                      <TableHead className="text-xs">Avg W x R</TableHead>
                      <TableHead className="text-xs">Sets</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.slice(-5).map((entry, i) => (
                      <TableRow key={i}>
                        <TableCell className="text-xs">
                          {new Date(entry.date).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-xs font-medium">
                          {entry.topSetWeight} x {entry.topSetReps}
                        </TableCell>
                        <TableCell className="text-xs">
                          {entry.avgWeight} x {entry.avgReps}
                        </TableCell>
                        <TableCell className="text-xs">{entry.sets}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Volume Over Time ──────────────────────────────────────────────

async function VolumeOverTime() {
  const userId = await getUserId();

  const sessions = await db.query.workoutSessions.findMany({
    where: eq(workoutSessions.userId, userId),
    orderBy: [asc(workoutSessions.date)],
    limit: 30,
    with: {
      sets: {
        with: { exercise: true },
      },
    },
  });

  if (sessions.length < 2) return null;

  // Build chart data: { weekLabel, muscleGroup -> setCount }
  // Aggregate by week
  const weeklyData: Record<
    string,
    Record<string, string | number>
  > = {};

  for (const session of sessions) {
    // Get Monday of this session's week
    const d = new Date(session.date);
    const day = d.getDay();
    const monday = new Date(d);
    monday.setDate(d.getDate() - ((day + 6) % 7));
    const weekKey = monday.toISOString().slice(0, 10);

    if (!weeklyData[weekKey]) {
      weeklyData[weekKey] = {
        weekLabel: monday.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        }),
      };
    }

    for (const set of session.sets) {
      const mg = set.exercise.muscleGroups as { primary: string[] };
      for (const group of mg.primary) {
        weeklyData[weekKey][group] =
          ((weeklyData[weekKey][group] as number) || 0) + 1;
      }
    }
  }

  const chartData = Object.values(weeklyData);

  // Get all muscle groups in the data
  const allGroups = new Set<string>();
  for (const week of chartData) {
    for (const key of Object.keys(week)) {
      if (key !== "weekLabel") allGroups.add(key);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Weekly Volume by Muscle Group</CardTitle>
      </CardHeader>
      <CardContent>
        <VolumeChart
          data={chartData}
          muscleGroups={Array.from(allGroups).sort()}
        />
      </CardContent>
    </Card>
  );
}

// ─── Skeletons ─────────────────────────────────────────────────────

function ChartSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-6 w-64" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-64 w-full" />
      </CardContent>
    </Card>
  );
}

function ListSkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3, 4].map((i) => (
        <Card key={i}>
          <CardContent className="py-4">
            <Skeleton className="h-5 w-48 mb-2" />
            <Skeleton className="h-4 w-72" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ─── Charts Section (flag-gated) ──────────────────────────────────

async function ChartsSection() {
  const chartsEnabled = await showProgressCharts();

  if (!chartsEnabled) return null;

  return (
    <>
      <Suspense fallback={<ChartSkeleton />}>
        <VolumeOverTime />
      </Suspense>

      <Suspense fallback={<ChartSkeleton />}>
        <ExerciseProgression />
      </Suspense>
    </>
  );
}

// ─── History Page ──────────────────────────────────────────────────

export default function HistoryPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">History</h1>

      <Suspense fallback={null}>
        <ChartsSection />
      </Suspense>

      <h2 className="text-xl font-semibold">All Workouts</h2>
      <Suspense fallback={<ListSkeleton />}>
        <SessionHistory />
      </Suspense>
    </div>
  );
}
