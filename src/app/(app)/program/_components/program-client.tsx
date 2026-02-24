"use client";

import { useState, useMemo } from "react";
import { Calendar } from "lucide-react";
import { ProgramGrid, type GridCell, type WeekHeader } from "./program-grid";
import { WeekDetail } from "./session-detail";
import { VolumeOverview } from "./volume-overview";
import type { ProgramData } from "../actions";

type Props = {
  data: ProgramData;
  volumeLandmarks: Record<string, { mev: number; mav: number; mrv: number }>;
};

export function ProgramClient({ data, volumeLandmarks }: Props) {
  const { mesocycle, sessions } = data;
  const [selectedWeek, setSelectedWeek] = useState(mesocycle.currentWeek);

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

  if (!mesocycle.sessionPlan) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p>No session plan available for this mesocycle.</p>
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
