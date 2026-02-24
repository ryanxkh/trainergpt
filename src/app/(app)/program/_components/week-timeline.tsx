"use client";

import { cn } from "@/lib/utils";
import { Check, Zap } from "lucide-react";
import type { SessionPlan } from "@/lib/program-utils";

type Props = {
  totalWeeks: number;
  currentWeek: number;
  selectedWeek: number;
  onSelectWeek: (week: number) => void;
  sessionPlan: SessionPlan | null;
  completedWeeks: Set<number>;
};

export function WeekTimeline({
  totalWeeks,
  currentWeek,
  selectedWeek,
  onSelectWeek,
  sessionPlan,
  completedWeeks,
}: Props) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-1">
      {Array.from({ length: totalWeeks }, (_, i) => i + 1).map((week) => {
        const isCompleted = completedWeeks.has(week);
        const isCurrent = week === currentWeek;
        const isFuture = week > currentWeek;
        const isSelected = week === selectedWeek;
        const weekData = sessionPlan?.weeks.find((w) => w.weekNumber === week);
        const isDeload = weekData?.isDeload ?? false;

        return (
          <button
            key={week}
            type="button"
            onClick={() => onSelectWeek(week)}
            className={cn(
              "relative flex items-center justify-center rounded-full h-10 min-w-10 px-3 text-sm font-semibold transition-all",
              isSelected && "ring-2 ring-primary ring-offset-2 ring-offset-background",
              isCompleted && "bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-400",
              isCurrent && !isCompleted && "bg-primary text-primary-foreground",
              isFuture && !isDeload && "bg-muted text-muted-foreground",
              isDeload && !isCompleted && !isCurrent && "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400",
              isDeload && isCurrent && "bg-amber-500 text-white dark:bg-amber-600",
            )}
          >
            {isCompleted ? (
              <Check className="h-4 w-4" />
            ) : isDeload ? (
              <Zap className="h-4 w-4" />
            ) : (
              week
            )}
          </button>
        );
      })}
    </div>
  );
}
