"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ArrowLeft,
  Calendar,
  Dumbbell,
  Loader2,
  Play,
  Target,
  AlertTriangle,
} from "lucide-react";
import { startProgramFromTemplate } from "../../../template-actions";
import type { BuilderPreview } from "@/lib/program-builder";

type TemplateInfo = {
  slug: string;
  name: string;
  subtitle: string;
  description: string;
  daysPerWeek: number;
  weeks: number;
  targetLevel: string;
};

type Props = {
  template: TemplateInfo;
  preview: BuilderPreview;
};

export function TemplatePreviewClient({ template, preview }: Props) {
  const [isPending, startTransition] = useTransition();
  const [showConfirm, setShowConfirm] = useState(false);
  const router = useRouter();

  const handleStart = () => {
    startTransition(async () => {
      const result = await startProgramFromTemplate(template.slug);
      if (result.success && result.mesocycleId) {
        toast.success(`Started: ${template.name}`);
        router.push(`/program/${result.mesocycleId}`);
      } else {
        toast.error(result.error ?? "Failed to start program");
      }
      setShowConfirm(false);
    });
  };

  return (
    <div className="space-y-6 pb-24">
      {/* Header */}
      <div>
        <Link
          href="/program/templates"
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors mb-3"
        >
          <ArrowLeft className="h-3 w-3" />
          All Programs
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight">
          {template.name}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {template.description}
        </p>
        <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            {template.daysPerWeek}x/week
          </span>
          <span className="flex items-center gap-1">
            <Target className="h-3 w-3" />
            {template.weeks} weeks
          </span>
          <Badge variant="secondary" className="text-[10px] capitalize">
            {template.targetLevel}
          </Badge>
        </div>
      </div>

      {/* Session previews */}
      <div className="space-y-3">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Your Personalized Sessions
        </h2>
        {preview.sessions.map((session) => (
          <div
            key={session.name}
            className="rounded-xl border bg-card p-4 space-y-2"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">{session.name}</h3>
              <span className="text-[10px] text-muted-foreground">
                Day {session.dayNumber}
              </span>
            </div>
            <div className="space-y-1">
              {session.exercises.map((ex, i) => (
                <div
                  key={`${ex.exerciseId}-${i}`}
                  className="flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <Dumbbell className="h-3 w-3 text-muted-foreground shrink-0" />
                    <span className="truncate">{ex.exerciseName}</span>
                    <span className="shrink-0 text-[10px] text-muted-foreground capitalize">
                      {ex.equipment.replace(/_/g, " ")}
                    </span>
                  </div>
                  <span className="shrink-0 ml-2 tabular-nums text-muted-foreground">
                    {ex.sets} × {ex.repRangeMin}-{ex.repRangeMax}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Volume summary */}
      <div className="space-y-2">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Weekly Volume
        </h2>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {Object.entries(preview.weeklyVolume)
            .sort(([, a], [, b]) => b.planned - a.planned)
            .map(([muscle, vol]) => (
              <div
                key={muscle}
                className="rounded-lg border bg-card px-3 py-2"
              >
                <div className="text-[10px] text-muted-foreground capitalize">
                  {muscle.replace(/_/g, " ")}
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-sm font-semibold tabular-nums">
                    {vol.planned}
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    sets
                  </span>
                </div>
                {vol.mav > 0 && (
                  <div className="mt-1 h-1.5 w-full rounded-full bg-muted overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        vol.planned >= vol.mrv
                          ? "bg-red-500"
                          : vol.planned >= vol.mav
                            ? "bg-amber-500"
                            : vol.planned >= vol.mev
                              ? "bg-green-500"
                              : "bg-muted-foreground/30"
                      }`}
                      style={{
                        width: `${Math.min(100, (vol.planned / vol.mrv) * 100)}%`,
                      }}
                    />
                  </div>
                )}
                {vol.mav > 0 && (
                  <div className="text-[9px] text-muted-foreground mt-0.5">
                    MEV {vol.mev} / MAV {vol.mav} / MRV {vol.mrv}
                  </div>
                )}
              </div>
            ))}
        </div>
      </div>

      {/* Swap hint */}
      <p className="text-xs text-muted-foreground italic">
        Don&apos;t like an exercise? You can swap any exercise during your
        workout using the Replace Exercise menu.
      </p>

      {/* Start button — sticky on mobile */}
      <div className="fixed bottom-20 left-0 right-0 p-4 bg-background/95 backdrop-blur-sm border-t md:static md:border-0 md:bg-transparent md:p-0 md:backdrop-blur-none">
        <Button
          size="lg"
          className="w-full"
          onClick={() => setShowConfirm(true)}
          disabled={isPending}
        >
          <Play className="mr-2 h-4 w-4" />
          Start Program
        </Button>
      </div>

      {/* Confirmation dialog */}
      <Dialog open={showConfirm} onOpenChange={setShowConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Start {template.name}?</DialogTitle>
            <DialogDescription className="space-y-2">
              <span className="block">
                This will create a {template.weeks}-week mesocycle with{" "}
                {template.daysPerWeek} sessions per week.
              </span>
              <span className="flex items-start gap-2 text-amber-600 dark:text-amber-400">
                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                If you have an active program, it will be ended. Your training
                history is always preserved.
              </span>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowConfirm(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button onClick={handleStart} disabled={isPending}>
              {isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Starting...
                </>
              ) : (
                <>
                  <Play className="mr-2 h-4 w-4" />
                  Start Program
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
