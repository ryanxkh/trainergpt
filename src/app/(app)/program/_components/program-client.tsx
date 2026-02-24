"use client";

import { useState, useMemo } from "react";
import { Calendar } from "lucide-react";
import { WeekTimeline } from "./week-timeline";
import { SessionCard } from "./session-card";
import { VolumeOverview } from "./volume-overview";
import type { ProgramData } from "../actions";

type Props = {
  data: ProgramData;
  volumeLandmarks: Record<string, { mev: number; mav: number; mrv: number }>;
};

export function ProgramClient({ data, volumeLandmarks }: Props) {
  const { mesocycle, sessions } = data;
  const [selectedWeek, setSelectedWeek] = useState(mesocycle.currentWeek);

  // Compute completed weeks (all sessions in week are completed/abandoned)
  const completedWeeks = useMemo(() => {
    const result = new Set<number>();
    for (let w = 1; w < mesocycle.currentWeek; w++) {
      const weekSessions = sessions.filter((s) => s.mesocycleWeek === w);
      if (weekSessions.length > 0 && weekSessions.every((s) => s.status === "completed" || s.status === "abandoned")) {
        result.add(w);
      }
    }
    return result;
  }, [sessions, mesocycle.currentWeek]);

  // Sessions for selected week
  const weekSessions = sessions.filter((s) => s.mesocycleWeek === selectedWeek);

  // Compute actual volume for selected week from completed sessions
  const actualVolume = useMemo(() => {
    const vol: Record<string, number> = {};
    const completedSessions = weekSessions.filter((s) => s.status === "completed" || s.status === "active");
    for (const session of completedSessions) {
      if (!session.prescribedExercises) continue;
      for (const ex of session.prescribedExercises) {
        // Count prescribed sets as "actual" for completed sessions
        if (session.status === "completed") {
          vol[ex.exerciseName] = (vol[ex.exerciseName] || 0) + ex.targetSets;
        }
      }
    }
    return vol;
  }, [weekSessions]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{mesocycle.name}</h1>
        <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
          <span className="capitalize">{mesocycle.splitType.replace(/_/g, " ")}</span>
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

      {/* Week Timeline */}
      <div>
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
          Weeks
        </h3>
        <WeekTimeline
          totalWeeks={mesocycle.totalWeeks}
          currentWeek={mesocycle.currentWeek}
          selectedWeek={selectedWeek}
          onSelectWeek={setSelectedWeek}
          sessionPlan={mesocycle.sessionPlan}
          completedWeeks={completedWeeks}
        />
      </div>

      {/* Sessions for selected week */}
      <div>
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
          {selectedWeek === mesocycle.currentWeek ? "This Week" : `Week ${selectedWeek}`}
        </h3>
        {weekSessions.length > 0 ? (
          <div className="space-y-3">
            {weekSessions.map((session) => (
              <SessionCard
                key={session.id}
                session={{
                  ...session,
                  exerciseCount: session.prescribedExercises?.length ?? 0,
                  exercisePreview:
                    session.prescribedExercises
                      ?.slice(0, 3)
                      .map((e) => e.exerciseName) ?? [],
                }}
              />
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground py-4">
            {selectedWeek > mesocycle.currentWeek
              ? "Sessions will be created when this week starts."
              : "No sessions for this week."}
          </p>
        )}
      </div>

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
