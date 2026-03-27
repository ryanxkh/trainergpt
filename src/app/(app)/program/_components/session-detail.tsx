"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatusDot } from "@/components/ui/status-dot";
import { MuscleGroupBadge } from "@/app/(app)/workout/_components/muscle-group-badge";
import { Play, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { startPlannedSession } from "../actions";
import type { GridCell } from "./program-grid";

const DAY_LABELS: Record<number, string> = {
  1: "Monday",
  2: "Tuesday",
  3: "Wednesday",
  4: "Thursday",
  5: "Friday",
  6: "Saturday",
  7: "Sunday",
};

type Props = {
  sessions: GridCell[];
  weekNumber: number;
  isDeload: boolean;
};

export function WeekDetail({ sessions, weekNumber, isDeload }: Props) {
  const sorted = [...sessions].sort((a, b) => a.dayNumber - b.dayNumber);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <h3 className="text-sm font-semibold">
          Week {weekNumber}
        </h3>
        {isDeload && (
          <Badge
            variant="outline"
            className="text-amber-600 border-amber-300 dark:text-amber-400 dark:border-amber-700 text-[10px]"
          >
            Deload
          </Badge>
        )}
        <span className="text-xs text-muted-foreground">
          {sorted.length} sessions · {sorted.reduce((sum, s) => sum + s.exercises.length, 0)} exercises
        </span>
      </div>

      {sorted.map((session) => (
        <SessionCard key={`${session.weekNumber}-${session.dayNumber}`} session={session} />
      ))}
    </div>
  );
}

function SessionCard({ session }: { session: GridCell }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const handleStart = () => {
    if (!session.sessionId) return;
    startTransition(async () => {
      const result = await startPlannedSession(session.sessionId!);
      if (result.success) {
        toast.success(`Started: ${session.sessionName}`);
        router.push("/workout");
      } else {
        toast.error(result.error);
      }
    });
  };

  const totalSets = session.exercises.reduce((sum, ex) => sum + ex.sets, 0);

  return (
    <div className="rounded-xl border bg-card overflow-hidden">
      {/* Session header */}
      <div className="px-4 py-3 border-b bg-muted/30 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-xs font-medium text-muted-foreground uppercase shrink-0">
              {DAY_LABELS[session.dayNumber]?.slice(0, 3) ?? `D${session.dayNumber}`}
            </span>
            <span className="text-sm font-semibold truncate">
              {session.sessionName}
            </span>
            {session.status !== "planned" && session.status !== "future" && (
              <StatusDot
                state={session.status as "active" | "completed" | "abandoned"}
                label={session.status === "abandoned" ? "skipped" : session.status}
              />
            )}
          </div>
          <span className="text-xs text-muted-foreground tabular-nums shrink-0">
            {session.exercises.length} ex · {totalSets} sets
          </span>
        </div>
        {(session.status === "active" || session.status === "planned") && session.sessionId && (
          <div>
            {session.status === "active" ? (
              <Link href="/workout">
                <Button size="sm" variant="outline" className="w-full">
                  Continue
                  <ArrowRight className="ml-1.5 h-3 w-3" />
                </Button>
              </Link>
            ) : (
              <Button
                size="sm"
                className="w-full"
                onClick={handleStart}
                disabled={isPending}
              >
                <Play className="mr-1 h-3 w-3" />
                {isPending ? "Starting..." : "Start Workout"}
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Exercise list */}
      <div className="divide-y divide-border/50">
        {session.exercises.map((ex, i) => (
          <div
            key={i}
            className="flex items-center justify-between px-4 py-3 gap-2 min-h-[44px]"
          >
            <div className="min-w-0 flex-1">
              <span className="text-sm font-medium truncate block">{ex.exerciseName}</span>
              {ex.muscleGroup && (
                <div className="mt-0.5">
                  <MuscleGroupBadge group={ex.muscleGroup} />
                </div>
              )}
            </div>
            <span className="text-xs text-muted-foreground tabular-nums whitespace-nowrap shrink-0 font-medium">
              {ex.sets} &times; {ex.repRangeMin}–{ex.repRangeMax} @{ex.rirTarget}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

