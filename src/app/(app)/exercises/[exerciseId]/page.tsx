import { Suspense } from "react";
import { cacheLife } from "next/cache";
import { db } from "@/lib/db";
import { exercises, exerciseSets, workoutSessions } from "@/lib/db/schema";
import { eq, and, asc } from "drizzle-orm";
import { notFound } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import Link from "next/link";
import { ArrowLeft, Dumbbell, Zap, Timer, Target, Activity, User, TrendingUp } from "lucide-react";
import { auth } from "@/lib/auth";
import { DeleteExerciseButton } from "./_components/delete-exercise-button";
import { ExerciseHistoryChart, ExerciseHistoryTable } from "./_components/exercise-history";

// Cached data-fetching helper — shared by generateMetadata and ExerciseContent
async function getExercise(id: number) {
  "use cache";
  cacheLife("hours");
  return db.query.exercises.findFirst({ where: eq(exercises.id, id) });
}

// Pre-render all exercise pages at build time
export async function generateStaticParams() {
  const allExercises = await db.query.exercises.findMany();
  return allExercises.map((ex) => ({
    exerciseId: String(ex.id),
  }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ exerciseId: string }>;
}) {
  const { exerciseId } = await params;
  const id = parseInt(exerciseId);
  if (isNaN(id)) return { title: "Exercise Not Found" };

  const exercise = await getExercise(id);

  if (!exercise) return { title: "Exercise Not Found" };

  const mg = exercise.muscleGroups as { primary: string[] };

  return {
    title: `${exercise.name} | TrainerGPT`,
    description: `${exercise.name} — targets ${mg.primary.join(", ")}. ${exercise.movementPattern.replace(/_/g, " ")} movement using ${exercise.equipment}.`,
  };
}

// Cached data-fetching component — static shell streams instantly,
// exercise data fills in from cache (revalidated hourly)
async function ExerciseContent({ exerciseId }: { exerciseId: number }) {
  const [exercise, session] = await Promise.all([
    getExercise(exerciseId),
    auth(),
  ]);

  if (!exercise) notFound();

  const mg = exercise.muscleGroups as { primary: string[]; secondary: string[] };
  const repRange = exercise.repRangeOptimal as [number, number];
  const currentUserId = session?.user?.id ? parseInt(session.user.id as string) : null;
  const isOwnCustom = exercise.userId !== null && exercise.userId === currentUserId;

  const sfrMap = {
    low: { text: "Low SFR", color: "text-red-500", desc: "High fatigue relative to stimulus" },
    medium: { text: "Medium SFR", color: "text-yellow-500", desc: "Moderate fatigue-to-stimulus ratio" },
    high: { text: "High SFR", color: "text-green-500", desc: "Great stimulus with minimal fatigue" },
  } as const;
  const sfrLabel = sfrMap[(exercise.sfrRating as keyof typeof sfrMap) || "medium"] ?? sfrMap.medium;

  return (
    <>
      <div>
        <Link
          href="/exercises"
          className="text-sm text-muted-foreground hover:underline inline-flex items-center gap-1"
        >
          <ArrowLeft className="h-3 w-3" />
          Back to Exercise Library
        </Link>
        <div className="flex items-center justify-between mt-2">
          <h1 className="text-2xl font-semibold tracking-tight">{exercise.name}</h1>
          {isOwnCustom && (
            <DeleteExerciseButton exerciseId={exercise.id} exerciseName={exercise.name} />
          )}
        </div>
        <div className="flex flex-wrap gap-2 mt-3">
          {exercise.userId !== null && (
            <Badge variant="outline" className="gap-1">
              <User className="h-3 w-3" />
              Custom Exercise
            </Badge>
          )}
          {mg.primary.map((g) => (
            <Badge key={g} variant="default" className="capitalize">
              {g.replace(/_/g, " ")}
            </Badge>
          ))}
          {mg.secondary.map((g) => (
            <Badge key={g} variant="secondary" className="capitalize">
              {g.replace(/_/g, " ")}
            </Badge>
          ))}
          {exercise.isStretchFocused && (
            <Badge variant="outline" className="gap-1">
              <Dumbbell className="h-3 w-3" />
              Stretch-Focused
            </Badge>
          )}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Movement Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-3">
              <Activity className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Movement Pattern</p>
                <p className="text-sm text-muted-foreground capitalize">
                  {exercise.movementPattern.replace(/_/g, " ")}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Dumbbell className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Equipment</p>
                <p className="text-sm text-muted-foreground capitalize">
                  {exercise.equipment}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Training Parameters
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-3">
              <Target className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Optimal Rep Range</p>
                <p className="text-sm text-muted-foreground">
                  {repRange[0]} – {repRange[1]} reps
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Timer className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Default Rest</p>
                <p className="text-sm text-muted-foreground">
                  {exercise.defaultRestSeconds}s
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Stimulus-to-Fatigue Ratio (SFR)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3">
            <Zap className={`h-5 w-5 ${sfrLabel.color}`} />
            <div>
              <p className="font-semibold">{sfrLabel.text}</p>
              <p className="text-sm text-muted-foreground">{sfrLabel.desc}</p>
            </div>
          </div>
          <Separator className="my-4" />
          <div className="text-sm text-muted-foreground space-y-2">
            <p>
              <strong>What is SFR?</strong> The Stimulus-to-Fatigue Ratio measures how
              much muscle growth stimulus an exercise provides relative to the systemic
              and local fatigue it generates.
            </p>
            <p>
              High SFR exercises (like cable flies, leg extensions) give great stimulus
              with minimal recovery cost. Low SFR exercises (like barbell squats, deadlifts)
              are effective but generate significant fatigue — use them strategically.
            </p>
            {exercise.isStretchFocused && (
              <p>
                <strong>Stretch-focused:</strong> This exercise loads the muscle in its
                lengthened position, which research suggests may enhance hypertrophy
                through greater mechanical tension at long muscle lengths.
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Muscle Groups
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div>
              <p className="text-sm font-medium mb-1">Primary</p>
              <div className="flex flex-wrap gap-2">
                {mg.primary.map((g) => (
                  <Badge key={g} className="capitalize">
                    {g.replace(/_/g, " ")}
                  </Badge>
                ))}
              </div>
            </div>
            {mg.secondary.length > 0 && (
              <div>
                <p className="text-sm font-medium mb-1">Secondary</p>
                <div className="flex flex-wrap gap-2">
                  {mg.secondary.map((g) => (
                    <Badge key={g} variant="secondary" className="capitalize">
                      {g.replace(/_/g, " ")}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </>
  );
}

// ─── User's Performance History ───────────────────────────────────

async function PerformanceHistory({ exerciseId }: { exerciseId: number }) {
  const session = await auth();
  if (!session?.user?.id) return null;
  const userId = parseInt(session.user.id as string);

  // Get all sets for this exercise from completed sessions, ordered by date
  const sets = await db
    .select({
      weight: exerciseSets.weight,
      reps: exerciseSets.reps,
      rir: exerciseSets.rir,
      date: workoutSessions.date,
      sessionName: workoutSessions.sessionName,
      sessionId: workoutSessions.id,
    })
    .from(exerciseSets)
    .innerJoin(workoutSessions, eq(exerciseSets.sessionId, workoutSessions.id))
    .where(
      and(
        eq(exerciseSets.exerciseId, exerciseId),
        eq(workoutSessions.userId, userId),
        eq(workoutSessions.status, "completed")
      )
    )
    .orderBy(asc(workoutSessions.date), asc(exerciseSets.setNumber));

  if (sets.length === 0) return null;

  // Group by session
  const sessionMap: Record<
    number,
    {
      date: Date;
      sessionName: string;
      sets: { weight: number; reps: number; rir: number | null }[];
    }
  > = {};

  for (const set of sets) {
    if (!sessionMap[set.sessionId]) {
      sessionMap[set.sessionId] = {
        date: set.date,
        sessionName: set.sessionName,
        sets: [],
      };
    }
    sessionMap[set.sessionId].sets.push({
      weight: set.weight,
      reps: set.reps,
      rir: set.rir,
    });
  }

  const historyData = Object.values(sessionMap)
    .sort((a, b) => a.date.getTime() - b.date.getTime())
    .map((s) => {
      const topSet = s.sets.reduce(
        (best, curr) => (curr.weight > best.weight ? curr : best),
        s.sets[0]
      );
      const avgWeight =
        Math.round(
          (s.sets.reduce((sum, v) => sum + v.weight, 0) / s.sets.length) * 10
        ) / 10;
      const avgReps =
        Math.round(
          (s.sets.reduce((sum, v) => sum + v.reps, 0) / s.sets.length) * 10
        ) / 10;
      const rirsWithValues = s.sets.filter((v) => v.rir !== null);
      const avgRir =
        rirsWithValues.length > 0
          ? Math.round(
              (rirsWithValues.reduce((sum, v) => sum + v.rir!, 0) /
                rirsWithValues.length) *
                10
            ) / 10
          : null;

      return {
        date: s.date.toISOString(),
        sessionName: s.sessionName,
        topSetWeight: topSet.weight,
        topSetReps: topSet.reps,
        avgWeight,
        avgReps,
        avgRir,
        sets: s.sets.length,
      };
    });

  if (historyData.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <TrendingUp className="h-4 w-4" />
          Your Performance History
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <ExerciseHistoryChart data={historyData} />
        <ExerciseHistoryTable data={historyData} />
      </CardContent>
    </Card>
  );
}

function ExerciseDetailSkeleton() {
  return (
    <>
      <div>
        <Skeleton className="h-4 w-40 mb-2" />
        <Skeleton className="h-9 w-64 mb-3" />
        <div className="flex gap-2">
          <Skeleton className="h-6 w-20" />
          <Skeleton className="h-6 w-20" />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Card><CardContent className="py-6"><Skeleton className="h-24 w-full" /></CardContent></Card>
        <Card><CardContent className="py-6"><Skeleton className="h-24 w-full" /></CardContent></Card>
      </div>
      <Card><CardContent className="py-6"><Skeleton className="h-40 w-full" /></CardContent></Card>
    </>
  );
}

export default async function ExerciseDetailPage({
  params,
}: {
  params: Promise<{ exerciseId: string }>;
}) {
  const { exerciseId } = await params;
  const id = parseInt(exerciseId);
  if (isNaN(id)) notFound();

  return (
    <div className="space-y-6 max-w-3xl">
      <Suspense fallback={<ExerciseDetailSkeleton />}>
        <ExerciseContent exerciseId={id} />
      </Suspense>
      <Suspense
        fallback={
          <Card>
            <CardContent className="py-6">
              <Skeleton className="h-64 w-full" />
            </CardContent>
          </Card>
        }
      >
        <PerformanceHistory exerciseId={id} />
      </Suspense>
    </div>
  );
}
