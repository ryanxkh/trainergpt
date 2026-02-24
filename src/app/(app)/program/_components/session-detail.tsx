"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MuscleGroupBadge } from "@/app/(app)/workout/_components/muscle-group-badge";
import { Play, ArrowRight, Check, Clock } from "lucide-react";
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
    <div className="rounded-lg border bg-card overflow-hidden">
      {/* Session header */}
      <div className="flex items-center justify-between gap-3 px-4 py-2.5 border-b bg-muted/30">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-[11px] font-medium text-muted-foreground uppercase w-8 shrink-0">
            {DAY_LABELS[session.dayNumber]?.slice(0, 3) ?? `D${session.dayNumber}`}
          </span>
          <span className="text-sm font-semibold truncate">
            {session.sessionName}
          </span>
          <StatusBadge status={session.status} />
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-[10px] text-muted-foreground tabular-nums">
            {session.exercises.length} ex · {totalSets} sets
          </span>
          {session.status === "active" && session.sessionId && (
            <Link href="/workout">
              <Button size="sm" variant="outline" className="h-7 text-xs">
                Continue
                <ArrowRight className="ml-1 h-3 w-3" />
              </Button>
            </Link>
          )}
          {session.status === "planned" && session.sessionId && (
            <Button
              size="sm"
              className="h-7 text-xs"
              onClick={handleStart}
              disabled={isPending}
            >
              <Play className="mr-1 h-3 w-3" />
              {isPending ? "..." : "Start"}
            </Button>
          )}
        </div>
      </div>

      {/* Exercise list */}
      <div className="divide-y">
        {session.exercises.map((ex, i) => (
          <div
            key={i}
            className="flex items-center justify-between px-4 py-2 gap-2"
          >
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-sm truncate">{ex.exerciseName}</span>
              {ex.muscleGroup && (
                <MuscleGroupBadge group={ex.muscleGroup} />
              )}
            </div>
            <span className="text-xs text-muted-foreground tabular-nums whitespace-nowrap shrink-0">
              {ex.sets} &times; {ex.repRangeMin}–{ex.repRangeMax} @ {ex.rirTarget}R
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case "completed":
      return (
        <Badge
          variant="secondary"
          className="gap-0.5 text-green-700 dark:text-green-400 text-[10px] px-1.5"
        >
          <Check className="h-2.5 w-2.5" />
          Done
        </Badge>
      );
    case "active":
      return (
        <Badge className="gap-0.5 text-[10px] px-1.5">
          <Clock className="h-2.5 w-2.5" />
          Active
        </Badge>
      );
    case "abandoned":
      return (
        <Badge
          variant="secondary"
          className="text-muted-foreground text-[10px] px-1.5"
        >
          Skipped
        </Badge>
      );
    default:
      return null;
  }
}
