import { Suspense } from "react";
import type { Metadata } from "next";
import { db } from "@/lib/db";

export const metadata: Metadata = {
  title: "History",
  description: "View your workout history and progression.",
};
import { workoutSessions } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
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
import { TrendingUp } from "lucide-react";
import { VolumeChart } from "./_components/volume-chart";
import { HistorySessionCard } from "./_components/session-card";

async function getUserId() {
  const session = await auth();
  return session?.user?.id ? parseInt(session.user.id as string) : 1;
}

// Single shared query — avoids 3 separate DB hits for the same data
async function getAllSessions(userId: number) {
  return db.query.workoutSessions.findMany({
    where: eq(workoutSessions.userId, userId),
    orderBy: [desc(workoutSessions.date)],
    limit: 30,
    with: {
      sets: {
        with: { exercise: true },
      },
    },
  });
}

type SessionWithSets = Awaited<ReturnType<typeof getAllSessions>>[number];

// ─── Session History List ──────────────────────────────────────────

function SessionHistoryContent({ sessions }: { sessions: SessionWithSets[] }) {
  // Use the 20 most recent for the list
  const recentSessions = sessions.slice(0, 20);

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
      {recentSessions.map((session) => {
        const exerciseNames = [
          ...new Set(session.sets.map((s) => s.exercise.name)),
        ];
        const totalVolume = session.sets.reduce(
          (sum, s) => sum + s.weight * s.reps,
          0
        );

        return (
          <HistorySessionCard
            key={session.id}
            session={{
              id: session.id,
              sessionName: session.sessionName,
              date: session.date.toISOString(),
              durationMinutes: session.durationMinutes,
              setCount: session.sets.length,
              totalVolume,
              exerciseNames,
              status: session.status,
            }}
          />
        );
      })}
    </div>
  );
}

// ─── Exercise Progression ──────────────────────────────────────────

function ExerciseProgressionContent({ sessions }: { sessions: SessionWithSets[] }) {
  // Sort ascending for progression analysis
  const sorted = [...sessions].sort((a, b) => a.date.getTime() - b.date.getTime());

  if (sorted.length === 0) return null;

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

  for (const session of sorted) {
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
                <div className="overflow-x-auto -mx-2">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs whitespace-nowrap">Date</TableHead>
                      <TableHead className="text-xs whitespace-nowrap">Top Set</TableHead>
                      <TableHead className="text-xs whitespace-nowrap">Avg W x R</TableHead>
                      <TableHead className="text-xs whitespace-nowrap">Sets</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.slice(-5).map((entry, i) => (
                      <TableRow key={i}>
                        <TableCell className="text-xs tabular-nums">
                          {new Date(entry.date).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-xs font-medium tabular-nums">
                          {entry.topSetWeight} x {entry.topSetReps}
                        </TableCell>
                        <TableCell className="text-xs tabular-nums">
                          {entry.avgWeight} x {entry.avgReps}
                        </TableCell>
                        <TableCell className="text-xs tabular-nums">{entry.sets}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Volume Over Time ──────────────────────────────────────────────

function VolumeOverTimeContent({ sessions }: { sessions: SessionWithSets[] }) {
  // Sort ascending for chart
  const sorted = [...sessions].sort((a, b) => a.date.getTime() - b.date.getTime());

  if (sorted.length < 2) return null;

  // Build chart data: { weekLabel, muscleGroup -> setCount }
  // Aggregate by week
  const weeklyData: Record<
    string,
    Record<string, string | number>
  > = {};

  for (const session of sorted) {
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

// ─── Single data-fetching component — 1 query instead of 3 ──────────

async function HistoryContent() {
  const userId = await getUserId();
  const sessions = await getAllSessions(userId);

  return (
    <>
      <VolumeOverTimeContent sessions={sessions} />
      <ExerciseProgressionContent sessions={sessions} />
      <h2 className="text-xl font-semibold">All Workouts</h2>
      <SessionHistoryContent sessions={sessions} />
    </>
  );
}

// ─── History Page ──────────────────────────────────────────────────

export default function HistoryPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">History</h1>

      <Suspense fallback={<ListSkeleton />}>
        <HistoryContent />
      </Suspense>
    </div>
  );
}
