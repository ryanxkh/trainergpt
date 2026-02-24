import { Suspense } from "react";
import { db } from "@/lib/db";
import { workoutSessions } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { Metadata } from "next";
import { SessionDetailClient } from "./_components/session-detail-client";

async function getWorkoutSession(id: number) {
  return db.query.workoutSessions.findFirst({
    where: eq(workoutSessions.id, id),
    with: {
      sets: {
        with: { exercise: true },
        orderBy: (es, { asc }) => [asc(es.createdAt)],
      },
    },
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
        muscleGroups: (set.exercise.muscleGroups as { primary: string[] })
          .primary,
        sets: [],
      };
    }
    grouped[name].sets.push(set);
  }

  const totalVolume = session.sets.reduce(
    (sum, s) => sum + s.weight * s.reps,
    0,
  );

  // Serialize for client component
  return (
    <SessionDetailClient
      session={{
        id: session.id,
        sessionName: session.sessionName,
        date: session.date.toISOString(),
        durationMinutes: session.durationMinutes,
        status: session.status,
        preReadiness: session.preReadiness as Record<string, number> | null,
        postNotes: session.postNotes,
        groups: Object.values(grouped).map((g) => ({
          exerciseName: g.exerciseName,
          muscleGroups: g.muscleGroups,
          sets: g.sets.map((s) => ({
            id: s.id,
            setNumber: s.setNumber,
            weight: s.weight,
            reps: s.reps,
            rir: s.rir,
            rpe: s.rpe,
          })),
        })),
        totalSets: session.sets.length,
        totalVolume,
      }}
    />
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
        <CardContent className="pt-6">
          <Skeleton className="h-32 w-full" />
        </CardContent>
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
