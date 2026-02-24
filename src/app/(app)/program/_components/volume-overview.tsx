"use client";

import { cn } from "@/lib/utils";

type Props = {
  volumePlan: Record<string, Record<string, number>> | null;
  weekNumber: number;
  actualVolume: Record<string, number>;
  landmarks: Record<string, { mev: number; mav: number; mrv: number }>;
};

export function VolumeOverview({ volumePlan, weekNumber, actualVolume, landmarks }: Props) {
  const weekKey = `week_${weekNumber}`;
  const planned = volumePlan?.[weekKey] ?? {};

  // Merge all muscle groups from planned, actual, and landmarks
  const allGroups = new Set([
    ...Object.keys(planned),
    ...Object.keys(actualVolume),
    ...Object.keys(landmarks),
  ]);

  if (allGroups.size === 0) return null;

  // Sort by planned volume descending
  const sorted = Array.from(allGroups).sort(
    (a, b) => (planned[b] ?? 0) - (planned[a] ?? 0)
  );

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold">Volume — Week {weekNumber}</h3>
      <div className="space-y-2">
        {sorted.map((group) => {
          const actual = actualVolume[group] ?? 0;
          const target = planned[group] ?? 0;
          const lm = landmarks[group];
          const maxBar = lm?.mrv ?? Math.max(target, actual, 20);

          // Color based on landmark comparison
          let barColor = "bg-primary"; // default
          if (lm) {
            if (actual < lm.mev) barColor = "bg-red-400 dark:bg-red-500";
            else if (actual <= lm.mav) barColor = "bg-yellow-400 dark:bg-yellow-500";
            else if (actual <= lm.mrv) barColor = "bg-green-500 dark:bg-green-500";
            else barColor = "bg-red-500 dark:bg-red-600";
          }

          const percentage = maxBar > 0 ? Math.min((actual / maxBar) * 100, 100) : 0;
          const targetPercentage = maxBar > 0 ? Math.min((target / maxBar) * 100, 100) : 0;

          return (
            <div key={group} className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="capitalize text-muted-foreground">
                  {group.replace(/_/g, " ")}
                </span>
                <span className="tabular-nums font-medium">
                  {actual}/{target}
                  {lm && (
                    <span className="text-muted-foreground ml-1">
                      ({lm.mev}-{lm.mrv})
                    </span>
                  )}
                </span>
              </div>
              <div className="relative h-2 w-full rounded-full bg-muted overflow-hidden">
                {/* Target indicator */}
                {target > 0 && (
                  <div
                    className="absolute top-0 h-full w-px bg-foreground/30"
                    style={{ left: `${targetPercentage}%` }}
                  />
                )}
                {/* Actual bar */}
                <div
                  className={cn("h-full rounded-full transition-all duration-500", barColor)}
                  style={{ width: `${percentage}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
      <div className="flex gap-4 text-[10px] text-muted-foreground">
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-red-400" /> Below MEV
        </span>
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-yellow-400" /> MEV–MAV
        </span>
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-green-500" /> MAV–MRV
        </span>
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-red-500" /> Above MRV
        </span>
      </div>
    </div>
  );
}
