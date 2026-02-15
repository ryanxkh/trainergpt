"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Timer, X } from "lucide-react";

export function RestTimerBanner({
  restTimer,
  restDisplay,
  onDismiss,
}: {
  restTimer: number;
  restDisplay: string;
  onDismiss: () => void;
}) {
  const isDone = restTimer <= 0;
  const isLow = restTimer > 0 && restTimer <= 10;

  return (
    <div
      className={cn(
        "sticky top-0 z-10 flex items-center justify-between rounded-lg px-4 py-3.5 transition-colors",
        isDone
          ? "bg-green-500/15 border border-green-500/30 dark:bg-green-500/10"
          : "bg-blue-500/10 border border-blue-500/20 dark:bg-blue-500/[0.07]"
      )}
    >
      <div className="flex items-center gap-2.5">
        <div
          className={cn(
            "rounded-full p-1.5",
            isDone
              ? "bg-green-500/20 text-green-600 dark:text-green-400"
              : "bg-blue-500/15 text-blue-600 dark:text-blue-400"
          )}
        >
          <Timer className="h-4 w-4" />
        </div>
        <span
          className={cn(
            "text-sm font-semibold",
            isDone
              ? "text-green-700 dark:text-green-400"
              : "text-blue-700 dark:text-blue-400"
          )}
        >
          {isDone ? "Rest Complete" : "Rest"}
        </span>
      </div>
      <span
        className={cn(
          "text-3xl font-mono font-black tabular-nums tracking-tight",
          isDone && "text-green-600 dark:text-green-400 animate-pulse",
          isLow && "text-amber-600 dark:text-amber-400",
          !isDone && !isLow && "text-blue-600 dark:text-blue-400"
        )}
      >
        {restDisplay}
      </span>
      <Button
        variant="ghost"
        size="sm"
        onClick={onDismiss}
        className="h-9 w-9 p-0 shrink-0"
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
}
