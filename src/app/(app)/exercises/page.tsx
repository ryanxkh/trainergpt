import { Suspense } from "react";
import type { Metadata } from "next";
import { db } from "@/lib/db";

export const metadata: Metadata = {
  title: "Exercises",
  description: "Browse the exercise library by muscle group.",
};
import { exercises } from "@/lib/db/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { Dumbbell, ChevronRight, Zap, User } from "lucide-react";
import { ExerciseFilter } from "./_components/exercise-filter";
import { CreateExerciseSheet } from "./_components/create-exercise-sheet";
import { auth } from "@/lib/auth";
import { or, isNull, eq } from "drizzle-orm";

async function ExerciseLibrary() {
  const session = await auth();
  const userId = session?.user?.id ? parseInt(session.user.id as string) : null;

  const allExercises = await db.query.exercises.findMany({
    where: userId
      ? or(isNull(exercises.userId), eq(exercises.userId, userId))
      : isNull(exercises.userId),
  });

  // Group exercises by primary muscle group
  const grouped: Record<string, typeof allExercises> = {};
  for (const ex of allExercises) {
    const primary = (ex.muscleGroups as { primary: string[]; secondary: string[] }).primary;
    for (const group of primary) {
      if (!grouped[group]) grouped[group] = [];
      grouped[group].push(ex);
    }
  }

  const sortedGroups = Object.keys(grouped).sort();

  return (
    <>
      <ExerciseFilter exercises={allExercises} groups={sortedGroups} />

      {/* Server-rendered grouped list (visible when no client filter active) */}
      <noscript>
        <div className="space-y-8">
          {sortedGroups.map((group) => (
            <section key={group}>
              <h2 className="text-xl font-semibold capitalize mb-3">
                {group.replace(/_/g, " ")}
              </h2>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {grouped[group].map((ex) => (
                  <ExerciseCard key={`${group}-${ex.id}`} exercise={ex} />
                ))}
              </div>
            </section>
          ))}
        </div>
      </noscript>
    </>
  );
}

export default function ExercisesPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Exercise Library</h1>
          <p className="text-muted-foreground mt-1">
            Browse exercises or add your own.
          </p>
        </div>
        <CreateExerciseSheet />
      </div>

      <Suspense fallback={null}>
        <ExerciseLibrary />
      </Suspense>
    </div>
  );
}

export function ExerciseCard({
  exercise,
}: {
  exercise: {
    id: number;
    name: string;
    muscleGroups: unknown;
    movementPattern: string;
    equipment: string;
    sfrRating: string | null;
    isStretchFocused: boolean | null;
    repRangeOptimal: unknown;
    userId?: number | null;
  };
}) {
  const mg = exercise.muscleGroups as { primary: string[]; secondary: string[] };
  const repRange = exercise.repRangeOptimal as [number, number];

  return (
    <Link href={`/exercises/${exercise.id}`}>
      <Card className="hover:bg-muted/50 transition-colors h-full">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">{exercise.name}</CardTitle>
            <div className="flex items-center gap-1.5 shrink-0">
              {exercise.userId && (
                <Badge variant="outline" className="text-xs gap-1">
                  <User className="h-3 w-3" />
                  Custom
                </Badge>
              )}
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-1.5 mb-2">
            {mg.primary.map((g) => (
              <Badge key={g} variant="default" className="capitalize text-xs">
                {g.replace(/_/g, " ")}
              </Badge>
            ))}
            {mg.secondary.map((g) => (
              <Badge key={g} variant="secondary" className="capitalize text-xs">
                {g.replace(/_/g, " ")}
              </Badge>
            ))}
          </div>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="capitalize">{exercise.movementPattern.replace(/_/g, " ")}</span>
            <span>{exercise.equipment}</span>
            <span>{repRange[0]}-{repRange[1]} reps</span>
          </div>
          <div className="flex items-center gap-2 mt-2">
            {exercise.sfrRating === "high" && (
              <Badge variant="outline" className="text-xs gap-1">
                <Zap className="h-3 w-3" />
                High SFR
              </Badge>
            )}
            {exercise.isStretchFocused && (
              <Badge variant="outline" className="text-xs gap-1">
                <Dumbbell className="h-3 w-3" />
                Stretch
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
