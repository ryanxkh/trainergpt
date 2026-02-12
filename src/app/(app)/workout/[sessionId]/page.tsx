import { Suspense } from "react";
import { db } from "@/lib/db";
import { workoutSessions } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
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
import { Calendar, Timer, Dumbbell } from "lucide-react";
import Link from "next/link";
import { cacheLife } from "next/cache";
import type { Metadata } from "next";

async function getWorkoutSession(id: number) {
  "use cache";
  cacheLife("minutes");
  return db.query.workoutSessions.findFirst({
    where: eq(workoutSessions.id, id),
    with: { sets: { with: { exercise: true }, orderBy: (es, { asc }) => [asc(es.createdAt)] } },
  });
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}): Promise<Metadata> {
  const { sessionId } = await params;
  const id = parseInt(sessionId);
  if (isNaN(id)) return { title: "Workout Not Found" };

  const session = await getWorkoutSession(id);

  if (!session) return { title: "Workout Not Found" };

  const title = `${session.sessionName} | TrainerGPT`;
  const description = `${session.sets.length} sets${session.durationMinutes ? ` in ${session.durationMinutes} min` : ""} — ${new Date(session.date).toLocaleDateString()}`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: [`/api/og?sessionId=${id}`],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [`/api/og?sessionId=${id}`],
    },
  };
}

async function WorkoutContent({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = await params;
  const id = parseInt(sessionId);
  if (isNaN(id)) notFound();

  const session = await getWorkoutSession(id);

  if (!session) notFound();

  // Group sets by exercise
  const grouped: Record<
    string,
    {
      exerciseName: string;
      muscleGroups: string[];
      sets: typeof session.sets;
    }
  > = {};

  for (const set of session.sets) {
    const name = set.exercise.name;
    if (!grouped[name]) {
      grouped[name] = {
        exerciseName: name,
        muscleGroups: (set.exercise.muscleGroups as { primary: string[] }).primary,
        sets: [],
      };
    }
    grouped[name].sets.push(set);
  }

  const totalVolume = session.sets.reduce((sum, s) => sum + s.weight * s.reps, 0);

  return (
    <>
      <div className="flex items-center justify-between">
        <div>
          <Link href="/workout" className="text-sm text-muted-foreground hover:underline">
            &larr; Back to Workout
          </Link>
          <h1 className="text-3xl font-bold mt-1">{session.sessionName}</h1>
          <div className="flex items-center gap-4 mt-2 text-muted-foreground">
            <div className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              <span>{new Date(session.date).toLocaleDateString()}</span>
            </div>
            {session.durationMinutes && (
              <div className="flex items-center gap-1">
                <Timer className="h-4 w-4" />
                <span>{session.durationMinutes} min</span>
              </div>
            )}
            <div className="flex items-center gap-1">
              <Dumbbell className="h-4 w-4" />
              <span>{session.sets.length} sets</span>
            </div>
          </div>
        </div>
      </div>

      {/* Readiness Metrics */}
      {session.preReadiness && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Pre-Workout Readiness</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-5 gap-4 text-center">
              {Object.entries(session.preReadiness as Record<string, number>).map(
                ([key, value]) => (
                  <div key={key}>
                    <p className="text-2xl font-bold">{value}</p>
                    <p className="text-xs text-muted-foreground capitalize">
                      {key.replace(/([A-Z])/g, " $1").trim()}
                    </p>
                  </div>
                )
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats Summary */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <p className="text-2xl font-bold">{session.sets.length}</p>
            <p className="text-sm text-muted-foreground">Total Sets</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-2xl font-bold">{Object.keys(grouped).length}</p>
            <p className="text-sm text-muted-foreground">Exercises</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-2xl font-bold">{totalVolume.toLocaleString()}</p>
            <p className="text-sm text-muted-foreground">Total Volume (lbs)</p>
          </CardContent>
        </Card>
      </div>

      {/* Exercise Sets */}
      {Object.values(grouped).map((group) => (
        <Card key={group.exerciseName}>
          <CardHeader>
            <div className="flex items-center gap-2">
              <CardTitle>{group.exerciseName}</CardTitle>
              <Badge variant="outline">{group.muscleGroups.join(", ")}</Badge>
              <Badge variant="secondary">{group.sets.length} sets</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16">Set</TableHead>
                  <TableHead>Weight</TableHead>
                  <TableHead>Reps</TableHead>
                  <TableHead>RIR</TableHead>
                  <TableHead>RPE</TableHead>
                  <TableHead>Volume</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {group.sets.map((set) => (
                  <TableRow key={set.id}>
                    <TableCell>{set.setNumber}</TableCell>
                    <TableCell>{set.weight} lbs</TableCell>
                    <TableCell>{set.reps}</TableCell>
                    <TableCell>{set.rir ?? "—"}</TableCell>
                    <TableCell>{set.rpe ?? "—"}</TableCell>
                    <TableCell>{(set.weight * set.reps).toLocaleString()} lbs</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ))}

      {/* Post Notes */}
      {session.postNotes && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Post-Workout Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">{session.postNotes}</p>
          </CardContent>
        </Card>
      )}
    </>
  );
}

function WorkoutDetailSkeleton() {
  return (
    <>
      <div>
        <Skeleton className="h-4 w-32 mb-2" />
        <Skeleton className="h-9 w-64 mb-2" />
        <Skeleton className="h-4 w-48" />
      </div>
      <div className="grid grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardContent className="pt-6">
              <Skeleton className="h-8 w-16 mb-1" />
              <Skeleton className="h-4 w-24" />
            </CardContent>
          </Card>
        ))}
      </div>
      <Card>
        <CardHeader><Skeleton className="h-6 w-48" /></CardHeader>
        <CardContent><Skeleton className="h-32 w-full" /></CardContent>
      </Card>
    </>
  );
}

export default function WorkoutDetailPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  return (
    <div className="space-y-6">
      <Suspense fallback={<WorkoutDetailSkeleton />}>
        <WorkoutContent params={params} />
      </Suspense>
    </div>
  );
}
