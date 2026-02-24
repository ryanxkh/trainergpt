"use client";

import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

const DAY_LABELS: Record<number, string> = {
  1: "Mon",
  2: "Tue",
  3: "Wed",
  4: "Thu",
  5: "Fri",
  6: "Sat",
  7: "Sun",
};

export type GridExercise = {
  exerciseName: string;
  muscleGroup: string;
  sets: number;
  repRangeMin: number;
  repRangeMax: number;
  rirTarget: number;
  restSeconds: number;
};

export type GridCell = {
  weekNumber: number;
  dayNumber: number;
  sessionName: string;
  status: "completed" | "active" | "planned" | "abandoned" | "future";
  sessionId?: number;
  isDeload: boolean;
  exercises: GridExercise[];
};

export type WeekHeader = {
  weekNumber: number;
  isDeload: boolean;
  rirTarget: number;
  isCompleted: boolean;
  isCurrent: boolean;
};

type Props = {
  weeks: WeekHeader[];
  dayNumbers: number[];
  cells: GridCell[];
  selectedWeek: number;
  onWeekSelect: (weekNumber: number) => void;
};

export function ProgramGrid({
  weeks,
  dayNumbers,
  cells,
  selectedWeek,
  onWeekSelect,
}: Props) {
  const getCell = (weekNumber: number, dayNumber: number) =>
    cells.find(
      (c) => c.weekNumber === weekNumber && c.dayNumber === dayNumber,
    );

  return (
    <div className="overflow-x-auto rounded-lg border bg-card">
      <table className="w-full border-collapse min-w-max">
        <thead>
          <tr>
            {/* Day label column */}
            <th className="sticky left-0 z-10 bg-card border-b border-r px-3 py-2.5 text-left text-[11px] font-medium text-muted-foreground w-12" />
            {weeks.map((week) => {
              const isSelected = week.weekNumber === selectedWeek;
              return (
                <th
                  key={week.weekNumber}
                  className={cn(
                    "border-b px-1.5 py-2.5 text-center min-w-[76px] cursor-pointer transition-colors",
                    week.isCompleted &&
                      "bg-green-50/80 dark:bg-green-950/20",
                    week.isCurrent &&
                      !week.isCompleted &&
                      "bg-primary/5",
                    week.isDeload &&
                      !week.isCompleted &&
                      !week.isCurrent &&
                      "bg-amber-50/80 dark:bg-amber-950/20",
                    isSelected &&
                      "bg-primary/10 dark:bg-primary/10",
                  )}
                  onClick={() => onWeekSelect(week.weekNumber)}
                >
                  <div
                    className={cn(
                      "text-xs font-semibold tabular-nums",
                      isSelected && "text-primary",
                    )}
                  >
                    {week.isDeload ? "DL" : week.weekNumber}
                  </div>
                  <div className="text-[10px] text-muted-foreground mt-0.5">
                    {week.isCompleted ? (
                      <span className="inline-flex items-center justify-center gap-0.5 text-green-600 dark:text-green-400">
                        <Check className="h-2.5 w-2.5" />
                      </span>
                    ) : (
                      <span>{week.rirTarget} RIR</span>
                    )}
                  </div>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {dayNumbers.map((dayNum, rowIdx) => (
            <tr key={dayNum}>
              <td
                className={cn(
                  "sticky left-0 z-10 bg-card border-r px-3 py-1.5 text-[11px] font-medium text-muted-foreground",
                  rowIdx < dayNumbers.length - 1 && "border-b",
                )}
              >
                {DAY_LABELS[dayNum] ?? `D${dayNum}`}
              </td>
              {weeks.map((week) => {
                const cell = getCell(week.weekNumber, dayNum);
                const isWeekSelected = week.weekNumber === selectedWeek;

                if (!cell) {
                  return (
                    <td
                      key={week.weekNumber}
                      className={cn(
                        "px-1 py-1",
                        rowIdx < dayNumbers.length - 1 && "border-b",
                        isWeekSelected && "bg-primary/5",
                      )}
                    >
                      <div className="h-9" />
                    </td>
                  );
                }

                return (
                  <td
                    key={week.weekNumber}
                    className={cn(
                      "px-1 py-1",
                      rowIdx < dayNumbers.length - 1 && "border-b",
                      isWeekSelected && "bg-primary/5",
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => onWeekSelect(week.weekNumber)}
                      className={cn(
                        "w-full rounded-md px-2 py-1.5 text-[11px] font-medium transition-all text-left leading-tight",
                        cell.status === "completed" &&
                          "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300",
                        cell.status === "active" &&
                          "bg-primary/15 text-primary ring-1 ring-primary/30",
                        cell.status === "planned" &&
                          "bg-muted/60 text-foreground hover:bg-muted",
                        cell.status === "abandoned" &&
                          "bg-muted/40 text-muted-foreground line-through",
                        cell.status === "future" &&
                          "bg-muted/30 text-muted-foreground hover:bg-muted/50",
                      )}
                    >
                      <span className="truncate block">
                        {cell.sessionName}
                      </span>
                    </button>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
