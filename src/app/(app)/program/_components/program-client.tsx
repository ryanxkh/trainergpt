"use client";

import { useState, useMemo, useTransition } from "react";
import { Calendar, MessageSquare, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ProgramGrid, type GridCell, type WeekHeader } from "./program-grid";
import { WeekDetail } from "./session-detail";
import { VolumeOverview } from "./volume-overview";
import { GenerateMesocycleForm } from "./generate-form";
import type { ProgramData } from "../actions";
import { completeMesocycle } from "../actions";

type Props = {
  data: ProgramData;
  volumeLandmarks: Record<string, { mev: number; mav: number; mrv: number }>;
};

export function ProgramClient({ data, volumeLandmarks }: Props) {
  const { mesocycle, sessions } = data;
  const [selectedWeek, setSelectedWeek] = useState(mesocycle.currentWeek);
  const [isPending, startTransition] = useTransition();
  const [showCompleteDialog, setShowCompleteDialog] = useState(false);
  const router = useRouter();

  const handleCompleteMesocycle = () => {
    startTransition(async () => {
      const result = await completeMesocycle(mesocycle.id);
      if (result.success) {
        toast.success("Mesocycle completed");
        router.refresh();
      } else {
        toast.error(result.error ?? "Failed to complete mesocycle");
      }
      setShowCompleteDialog(false);
    });
  };

  // Build grid data from sessionPlan (all weeks) + actual sessions (materialized)
  const { weeks, dayNumbers, cells } = useMemo(() => {
    const plan = mesocycle.sessionPlan;
    if (!plan)
      return {
        weeks: [] as WeekHeader[],
        dayNumbers: [] as number[],
        cells: [] as GridCell[],
      };

    // Build week headers
    const weekHeaders: WeekHeader[] = plan.weeks.map((w) => {
      const weekSessions = sessions.filter(
        (s) => s.mesocycleWeek === w.weekNumber,
      );
      const isCompleted =
        weekSessions.length > 0 &&
        weekSessions.every(
          (s) => s.status === "completed" || s.status === "abandoned",
        );

      const rirs = w.sessions.flatMap((s) =>
        s.exercises.map((e) => e.rirTarget),
      );
      const avgRir =
        rirs.length > 0
          ? Math.round(rirs.reduce((a, b) => a + b, 0) / rirs.length)
          : 0;

      return {
        weekNumber: w.weekNumber,
        isDeload: w.isDeload,
        rirTarget: avgRir,
        isCompleted,
        isCurrent: w.weekNumber === mesocycle.currentWeek,
      };
    });

    // Collect all unique day numbers across the plan
    const daySet = new Set<number>();
    for (const w of plan.weeks) {
      for (const s of w.sessions) {
        daySet.add(s.dayNumber);
      }
    }
    const sortedDays = Array.from(daySet).sort((a, b) => a - b);

    // Build cells by merging plan data with materialized sessions
    const gridCells: GridCell[] = [];
    for (const w of plan.weeks) {
      for (const planSession of w.sessions) {
        const materialized = sessions.find(
          (ms) =>
            ms.mesocycleWeek === w.weekNumber &&
            ms.dayNumber === planSession.dayNumber,
        );

        if (materialized) {
          const exercises =
            materialized.prescribedExercises?.map((e) => {
              const planEx =
                planSession.exercises.find(
                  (pe) =>
                    pe.exerciseName.toLowerCase() ===
                    e.exerciseName.toLowerCase(),
                ) ??
                planSession.exercises.find(
                  (pe) =>
                    pe.exerciseName
                      .toLowerCase()
                      .includes(e.exerciseName.toLowerCase()) ||
                    e.exerciseName
                      .toLowerCase()
                      .includes(pe.exerciseName.toLowerCase()),
                );

              return {
                exerciseName: e.exerciseName,
                muscleGroup: planEx?.muscleGroup ?? "",
                sets: e.targetSets,
                repRangeMin: e.repRangeMin,
                repRangeMax: e.repRangeMax,
                rirTarget: e.rirTarget,
                restSeconds: e.restSeconds,
              };
            }) ?? [];

          gridCells.push({
            weekNumber: w.weekNumber,
            dayNumber: planSession.dayNumber,
            sessionName: materialized.sessionName,
            status: materialized.status as GridCell["status"],
            sessionId: materialized.id,
            isDeload: w.isDeload,
            exercises,
          });
        } else {
          gridCells.push({
            weekNumber: w.weekNumber,
            dayNumber: planSession.dayNumber,
            sessionName: planSession.sessionName,
            status: "future",
            isDeload: w.isDeload,
            exercises: planSession.exercises.map((e) => ({
              exerciseName: e.exerciseName,
              muscleGroup: e.muscleGroup,
              sets: e.sets,
              repRangeMin: e.repRangeMin,
              repRangeMax: e.repRangeMax,
              rirTarget: e.rirTarget,
              restSeconds: e.restSeconds,
            })),
          });
        }
      }
    }

    return { weeks: weekHeaders, dayNumbers: sortedDays, cells: gridCells };
  }, [mesocycle, sessions]);

  // Sessions for the selected week
  const weekCells = cells.filter((c) => c.weekNumber === selectedWeek);
  const weekHeader = weeks.find((w) => w.weekNumber === selectedWeek);

  // Volume for the selected week
  const actualVolume = useMemo(() => {
    const vol: Record<string, number> = {};
    const weekSessions = sessions.filter(
      (s) => s.mesocycleWeek === selectedWeek && s.status === "completed",
    );
    for (const session of weekSessions) {
      if (!session.prescribedExercises) continue;
      for (const ex of session.prescribedExercises) {
        vol[ex.exerciseName] = (vol[ex.exerciseName] || 0) + ex.targetSets;
      }
    }
    return vol;
  }, [sessions, selectedWeek]);

  // Legacy mesocycle without a session plan (created before Phase 3)
  if (!mesocycle.sessionPlan) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {mesocycle.name}
          </h1>
          <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
            <span className="capitalize">
              {mesocycle.splitType.replace(/_/g, " ")}
            </span>
            <span className="flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" />
              Week {mesocycle.currentWeek} / {mesocycle.totalWeeks}
            </span>
          </div>
        </div>

        {/* Existing sessions */}
        {sessions.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Sessions
            </h3>
            <div className="space-y-2">
              {sessions.map((s) => (
                <div
                  key={s.id}
                  className="flex items-center justify-between rounded-lg border bg-card px-4 py-3"
                >
                  <div>
                    <span className="text-sm font-medium">{s.sessionName}</span>
                    <span className="text-xs text-muted-foreground ml-2">
                      {s.prescribedExercises?.length ?? 0} exercises
                    </span>
                  </div>
                  <Badge
                    variant={s.status === "completed" ? "secondary" : "outline"}
                    className="text-[10px] capitalize"
                  >
                    {s.status}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* CTA to create a structured program */}
        <div className="rounded-lg border border-dashed p-6 text-center space-y-3">
          <p className="text-sm text-muted-foreground">
            This mesocycle was created without a structured session plan.
            Complete it and generate a new program to see the full grid with exercises, sets, and RIR targets.
          </p>
          <div className="flex justify-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowCompleteDialog(true)}
              disabled={isPending}
            >
              <CheckCircle2 className="mr-2 h-3.5 w-3.5" />
              Complete Mesocycle
            </Button>
            <Link href="/coach">
              <Button variant="outline" size="sm">
                <MessageSquare className="mr-2 h-3.5 w-3.5" />
                Ask Coach
              </Button>
            </Link>
            <GenerateMesocycleForm />
          </div>
        </div>

        {/* Complete Mesocycle Dialog */}
        <Dialog open={showCompleteDialog} onOpenChange={setShowCompleteDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Complete mesocycle?</DialogTitle>
              <DialogDescription>
                This will mark &ldquo;{mesocycle.name}&rdquo; as completed and
                abandon any remaining planned sessions. You can then generate a
                new program.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowCompleteDialog(false)}
                disabled={isPending}
              >
                Cancel
              </Button>
              <Button
                onClick={handleCompleteMesocycle}
                disabled={isPending}
              >
                {isPending ? "Completing..." : "Complete"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          {mesocycle.name}
        </h1>
        <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
          <span className="capitalize">
            {mesocycle.splitType.replace(/_/g, " ")}
          </span>
          <span className="flex items-center gap-1">
            <Calendar className="h-3.5 w-3.5" />
            Week {mesocycle.currentWeek} / {mesocycle.totalWeeks}
          </span>
          {mesocycle.startDate && (
            <span>
              Started {new Date(mesocycle.startDate).toLocaleDateString()}
            </span>
          )}
        </div>
      </div>

      {/* Grid legend */}
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-muted-foreground">
        <span className="flex items-center gap-1">
          <span className="h-2.5 w-2.5 rounded-sm bg-green-100 dark:bg-green-900/40 ring-1 ring-green-200 dark:ring-green-800" />
          Completed
        </span>
        <span className="flex items-center gap-1">
          <span className="h-2.5 w-2.5 rounded-sm bg-primary/15 ring-1 ring-primary/30" />
          Active
        </span>
        <span className="flex items-center gap-1">
          <span className="h-2.5 w-2.5 rounded-sm bg-muted/60 ring-1 ring-border" />
          Planned
        </span>
        <span className="flex items-center gap-1">
          <span className="h-2.5 w-2.5 rounded-sm bg-muted/30 ring-1 ring-border/50" />
          Upcoming
        </span>
      </div>

      {/* Program Grid — full mesocycle overview */}
      <ProgramGrid
        weeks={weeks}
        dayNumbers={dayNumbers}
        cells={cells}
        selectedWeek={selectedWeek}
        onWeekSelect={setSelectedWeek}
      />

      {/* Week Detail — all sessions with full exercise lists */}
      {weekCells.length > 0 && (
        <WeekDetail
          sessions={weekCells}
          weekNumber={selectedWeek}
          isDeload={weekHeader?.isDeload ?? false}
        />
      )}

      {weekCells.length === 0 && (
        <p className="text-sm text-muted-foreground py-4">
          {selectedWeek > mesocycle.currentWeek
            ? "Sessions will be created when this week starts."
            : "No sessions for this week."}
        </p>
      )}

      {/* Volume Overview */}
      <VolumeOverview
        volumePlan={mesocycle.volumePlan}
        weekNumber={selectedWeek}
        actualVolume={actualVolume}
        landmarks={volumeLandmarks}
      />
    </div>
  );
}
