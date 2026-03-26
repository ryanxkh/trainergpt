import { Suspense } from "react";
import { notFound } from "next/navigation";
import { cacheLife } from "next/cache";
import Link from "next/link";
import { eq, and, desc } from "drizzle-orm";
import { ArrowLeft, Sparkles, User } from "lucide-react";
import { db } from "@/lib/db";
import { exercises, exerciseSets, workoutSessions } from "@/lib/db/schema";
import { auth } from "@/lib/auth";
import { Card, CardContent } from "@/components/ui/card";
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
import { MuscleGroupBadge } from "@/app/(app)/workout/_components/muscle-group-badge";
import { PerformanceChart } from "./_components/performance-chart";
import { DeleteExerciseButton } from "./_components/delete-exercise-button";

type Props = {
  params: Promise<{ exerciseId: string }>;
};

async function getExercise(id: number) {
  "use cache";
  cacheLife("hours");
  return db.query.exercises.findFirst({ where: eq(exercises.id, id) });
}

export async function generateMetadata({ params }: Props) {
  const { exerciseId: id } = await params;
  const exercise = await getExercise(parseInt(id));

  return {
    title: exercise ? `${exercise.name} | TrainerGPT` : "Exercise | TrainerGPT",
    description: exercise
      ? `Details and performance history for ${exercise.name}`
      : "Exercise details",
  };
}

async function getPerformanceHistory(exerciseId: number, userId: number) {
  const sets = await db
    .select({
      sessionId: exerciseSets.sessionId,
      weight: exerciseSets.weight,
      reps: exerciseSets.reps,
      sessionDate: workoutSessions.date,
      sessionName: workoutSessions.sessionName,
    })
    .from(exerciseSets)
    .innerJoin(workoutSessions, eq(exerciseSets.sessionId, workoutSessions.id))
    .where(
      and(
        eq(exerciseSets.exerciseId, exerciseId),
        eq(workoutSessions.userId, userId)
      )
    )
    .orderBy(desc(workoutSessions.date));

  const sessionMap = new Map<
    number,
    {
      date: Date;
      sessionName: string;
      sets: { weight: number; reps: number }[];
    }
  >();

  sets.forEach((set) => {
    if (!sessionMap.has(set.sessionId)) {
      sessionMap.set(set.sessionId, {
        date: set.sessionDate,
        sessionName: set.sessionName,
        sets: [],
      });
    }
    sessionMap.get(set.sessionId)!.sets.push({
      weight: set.weight,
      reps: set.reps,
    });
  });

  const history = Array.from(sessionMap.entries())
    .map(([sessionId, data]) => {
      const topSet = data.sets.reduce(
        (max, s) => (s.weight > max.weight ? s : max),
        data.sets[0]
      );
      const avgWeight = Math.round(
        data.sets.reduce((sum, s) => sum + s.weight, 0) / data.sets.length
      );
      const avgReps = Math.round(
        data.sets.reduce((sum, s) => sum + s.reps, 0) / data.sets.length
      );

      return {
        sessionId,
        date: data.date,
        sessionName: data.sessionName,
        topSetWeight: topSet?.weight ?? 0,
        topSetReps: topSet?.reps ?? 0,
        avgWeight,
        avgReps,
        totalSets: data.sets.length,
      };
    })
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  return history;
}

function formatMovementPattern(pattern: string): string {
  return pattern.replace(/_/g, " ");
}

function PerformanceSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-6 w-48" />
      <Skeleton className="h-[280px] w-full rounded-lg" />
      <Skeleton className="h-40 w-full rounded-lg" />
    </div>
  );
}

function ExerciseDetailSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-4 w-32" />
      <Skeleton className="h-8 w-64" />
      <div className="flex gap-1.5">
        <Skeleton className="h-6 w-16" />
        <Skeleton className="h-6 w-16" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Skeleton className="h-16 rounded-lg" />
        <Skeleton className="h-16 rounded-lg" />
        <Skeleton className="h-16 rounded-lg" />
        <Skeleton className="h-16 rounded-lg" />
      </div>
    </div>
  );
}

export default function ExerciseDetailPage({ params }: Props) {
  return (
    <Suspense fallback={<ExerciseDetailSkeleton />}>
      <ExerciseContent params={params} />
    </Suspense>
  );
}

async function ExerciseContent({ params }: Props) {
  const { exerciseId: id } = await params;
  const exerciseId = parseInt(id);

  if (isNaN(exerciseId)) {
    notFound();
  }

  const session = await auth();
  const userId = session?.user?.id ? parseInt(session.user.id as string) : 0;

  const exercise = await getExercise(exerciseId);

  if (!exercise) {
    notFound();
  }

  const isCustom = exercise.userId !== null;
  const canDelete = isCustom && exercise.userId === userId;

  return (
    <div className="space-y-6">
      {/* Back link */}
      <Link
        href="/exercises"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Exercises
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl font-semibold tracking-tight">
              {exercise.name}
            </h1>
            {isCustom && (
              <Badge variant="secondary" className="text-xs">
                <User className="h-3 w-3 mr-1" />
                Custom
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground uppercase tracking-wide">
            {exercise.equipment}
          </p>
        </div>
        {canDelete && <DeleteExerciseButton exerciseId={exercise.id} />}
      </div>

      {/* Muscle badges */}
      <div className="space-y-2">
        <div className="flex flex-wrap gap-1.5">
          {exercise.muscleGroups.primary.map((mg) => (
            <MuscleGroupBadge key={mg} group={mg} />
          ))}
        </div>
        {exercise.muscleGroups.secondary.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            <span className="text-[11px] text-muted-foreground uppercase tracking-wide mr-1">
              Secondary:
            </span>
            {exercise.muscleGroups.secondary.map((mg) => (
              <MuscleGroupBadge key={mg} group={mg} />
            ))}
          </div>
        )}
      </div>

      {/* Info grid */}
      <div className="grid grid-cols-2 gap-3">
        <Card>
          <CardContent className="p-3">
            <p className="text-[11px] text-muted-foreground uppercase tracking-wide">
              Movement
            </p>
            <p className="text-sm font-medium capitalize mt-0.5">
              {formatMovementPattern(exercise.movementPattern)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <p className="text-[11px] text-muted-foreground uppercase tracking-wide">
              Optimal Reps
            </p>
            <p className="text-sm font-medium tabular-nums mt-0.5">
              {exercise.repRangeOptimal?.[0] ?? 8}–
              {exercise.repRangeOptimal?.[1] ?? 12}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <p className="text-[11px] text-muted-foreground uppercase tracking-wide">
              Rest Time
            </p>
            <p className="text-sm font-medium tabular-nums mt-0.5">
              {Math.floor((exercise.defaultRestSeconds ?? 120) / 60)}:
              {String((exercise.defaultRestSeconds ?? 120) % 60).padStart(
                2,
                "0"
              )}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <p className="text-[11px] text-muted-foreground uppercase tracking-wide">
              Equipment
            </p>
            <p className="text-sm font-medium capitalize mt-0.5">
              {exercise.equipment}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* SFR Rating card */}
      <Card>
        <CardContent className="p-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] text-muted-foreground uppercase tracking-wide">
                Stimulus-to-Fatigue Ratio
              </p>
              <p className="text-sm font-medium capitalize mt-0.5">
                {exercise.sfrRating ?? "Medium"}
              </p>
            </div>
            <div
              className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold ${
                exercise.sfrRating === "high"
                  ? "bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-400"
                  : exercise.sfrRating === "low"
                    ? "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400"
                    : "bg-muted text-muted-foreground"
              }`}
            >
              {exercise.sfrRating === "high"
                ? "H"
                : exercise.sfrRating === "low"
                  ? "L"
                  : "M"}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stretch-focused callout */}
      {exercise.isStretchFocused && (
        <Card className="border-blue-200 dark:border-blue-900 bg-blue-50/50 dark:bg-blue-950/20">
          <CardContent className="p-3 flex items-center gap-3">
            <Sparkles className="h-5 w-5 text-blue-600 dark:text-blue-400 shrink-0" />
            <div>
              <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                Stretch-Focused Exercise
              </p>
              <p className="text-xs text-blue-700 dark:text-blue-300">
                This exercise emphasizes the stretched position for enhanced
                muscle growth.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Performance history */}
      <Suspense fallback={<PerformanceSkeleton />}>
        <PerformanceHistory exerciseId={exerciseId} userId={userId} />
      </Suspense>
    </div>
  );
}

async function PerformanceHistory({
  exerciseId,
  userId,
}: {
  exerciseId: number;
  userId: number;
}) {
  const history = await getPerformanceHistory(exerciseId, userId);

  if (history.length === 0) {
    return (
      <div className="space-y-3">
        <h2 className="text-lg font-semibold">Performance History</h2>
        <Card>
          <CardContent className="py-8">
            <p className="text-center text-muted-foreground">
              No logged sets yet. Complete a workout with this exercise to see
              your progress.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const chartData = history.map((h) => ({
    date: new Date(h.date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    }),
    topWeight: h.topSetWeight,
    avgWeight: h.avgWeight,
  }));

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Performance History</h2>

      {history.length >= 2 && (
        <Card>
          <CardContent className="p-4">
            <PerformanceChart data={chartData} />
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">Date</TableHead>
                <TableHead className="text-xs">Top Set</TableHead>
                <TableHead className="text-xs">Avg</TableHead>
                <TableHead className="text-xs text-right">Sets</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {history.slice(-10).reverse().map((h) => (
                <TableRow key={h.sessionId}>
                  <TableCell className="text-xs tabular-nums">
                    {new Date(h.date).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-xs font-medium tabular-nums">
                    {h.topSetWeight} × {h.topSetReps}
                  </TableCell>
                  <TableCell className="text-xs tabular-nums text-muted-foreground">
                    {h.avgWeight} × {h.avgReps}
                  </TableCell>
                  <TableCell className="text-xs tabular-nums text-right">
                    {h.totalSets}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
