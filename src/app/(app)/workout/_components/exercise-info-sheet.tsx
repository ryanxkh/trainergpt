"use client";

import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Info, Dumbbell, Repeat, Clock, Flame, Sparkles } from "lucide-react";
import { MuscleGroupBadge } from "./muscle-group-badge";
import type { ExerciseDetail } from "./types";

const SFR_LABELS: Record<string, { label: string; description: string }> = {
  low: { label: "Low", description: "Low fatigue per set — can handle higher volume" },
  medium: { label: "Medium", description: "Moderate fatigue per set — standard volume tolerance" },
  high: { label: "High", description: "High fatigue per set — keep volume conservative" },
};

const MOVEMENT_LABELS: Record<string, string> = {
  horizontal_press: "Horizontal Press",
  vertical_press: "Vertical Press",
  horizontal_pull: "Horizontal Pull",
  vertical_pull: "Vertical Pull",
  squat: "Squat",
  hip_hinge: "Hip Hinge",
  isolation: "Isolation",
  carry: "Carry",
};

export function ExerciseInfoSheet({
  exerciseName,
  detail,
}: {
  exerciseName: string;
  detail: ExerciseDetail;
}) {
  const sfr = SFR_LABELS[detail.sfrRating] ?? SFR_LABELS.medium;

  return (
    <Sheet>
      <SheetTrigger asChild>
        <button
          type="button"
          className="h-9 w-9 inline-flex items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors active:scale-95"
        >
          <Info className="h-4 w-4" />
        </button>
      </SheetTrigger>
      <SheetContent side="bottom" className="pb-10">
        <SheetHeader>
          <SheetTitle className="text-base font-semibold">
            {exerciseName}
          </SheetTitle>
        </SheetHeader>
        <div className="mt-4 space-y-4">
          {/* Muscle groups */}
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Primary Muscles
            </p>
            <div className="flex flex-wrap gap-1.5">
              {detail.muscleGroups.primary.map((mg) => (
                <MuscleGroupBadge key={mg} group={mg} />
              ))}
            </div>
            {detail.muscleGroups.secondary.length > 0 && (
              <>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mt-3">
                  Secondary Muscles
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {detail.muscleGroups.secondary.map((mg) => (
                    <MuscleGroupBadge key={mg} group={mg} />
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Details grid */}
          <div className="grid grid-cols-2 gap-3">
            <InfoItem
              icon={<Dumbbell className="h-4 w-4" />}
              label="Equipment"
              value={detail.equipment}
            />
            <InfoItem
              icon={<Repeat className="h-4 w-4" />}
              label="Movement"
              value={MOVEMENT_LABELS[detail.movementPattern] ?? detail.movementPattern}
            />
            <InfoItem
              icon={<Repeat className="h-4 w-4" />}
              label="Optimal Reps"
              value={`${detail.repRangeOptimal[0]}–${detail.repRangeOptimal[1]}`}
            />
            <InfoItem
              icon={<Clock className="h-4 w-4" />}
              label="Default Rest"
              value={`${Math.floor(detail.defaultRestSeconds / 60)}:${(detail.defaultRestSeconds % 60).toString().padStart(2, "0")}`}
            />
          </div>

          {/* SFR Rating */}
          <div className="rounded-lg border p-3 space-y-1">
            <div className="flex items-center gap-2">
              <Flame className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">
                Stimulus-to-Fatigue Ratio: {sfr.label}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">{sfr.description}</p>
          </div>

          {/* Stretch-focused */}
          {detail.isStretchFocused && (
            <div className="rounded-lg border border-blue-200 dark:border-blue-900 bg-blue-50/50 dark:bg-blue-950/20 p-3">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
                  Stretch-Focused Exercise
                </span>
              </div>
              <p className="text-xs text-blue-600/80 dark:text-blue-400/80 mt-1">
                Loads the muscle in the lengthened position — research shows enhanced hypertrophy.
              </p>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function InfoItem({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg border p-2.5 space-y-1">
      <div className="flex items-center gap-1.5 text-muted-foreground">
        {icon}
        <span className="text-[11px] font-medium uppercase tracking-wide">
          {label}
        </span>
      </div>
      <p className="text-sm font-medium capitalize">{value}</p>
    </div>
  );
}
