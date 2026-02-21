"use client";

import { useState, useTransition } from "react";
import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  MoreVertical,
  Plus,
  SkipForward,
  StickyNote,
  RefreshCw,
  ArrowLeft,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { getAlternativeExercises, replaceExercise } from "../actions";
import { MuscleGroupBadge } from "./muscle-group-badge";

type Alternative = {
  id: number;
  name: string;
  equipment: string;
  muscleGroups: { primary: string[]; secondary: string[] };
};

export function ExerciseMenu({
  exerciseName,
  exerciseId,
  sessionId,
  isComplete,
  excludeExerciseIds,
  onAddSet,
  onSkipRemaining,
  onToggleNotes,
  onReplace,
}: {
  exerciseName: string;
  exerciseId: number;
  sessionId: number;
  isComplete: boolean;
  excludeExerciseIds: number[];
  onAddSet: () => void;
  onSkipRemaining: () => void;
  onToggleNotes: () => void;
  onReplace: (newId: number, newName: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<"menu" | "replace">("menu");
  const [alternatives, setAlternatives] = useState<Alternative[]>([]);
  const [loadingAlternatives, setLoadingAlternatives] = useState(false);
  const [replacingId, setReplacingId] = useState<number | null>(null);

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (!isOpen) {
      setView("menu");
    }
  };

  const handleShowReplace = async () => {
    setLoadingAlternatives(true);
    setView("replace");
    const alts = await getAlternativeExercises(exerciseId, excludeExerciseIds);
    setAlternatives(alts);
    setLoadingAlternatives(false);
  };

  const handleReplace = async (newId: number) => {
    setReplacingId(newId);
    const result = await replaceExercise(sessionId, exerciseId, newId);
    if (result.success) {
      toast.success(`Swapped to ${result.data.exerciseName}`);
      onReplace(newId, result.data.exerciseName);
      setOpen(false);
    } else {
      toast.error(result.error);
    }
    setReplacingId(null);
  };

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetTrigger asChild>
        <button
          type="button"
          className="h-9 w-9 inline-flex items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors active:scale-95"
        >
          <MoreVertical className="h-4 w-4" />
        </button>
      </SheetTrigger>
      <SheetContent side="bottom" className="pb-10">
        {view === "menu" ? (
          <>
            <SheetHeader>
              <SheetTitle className="text-base font-semibold">
                {exerciseName}
              </SheetTitle>
            </SheetHeader>
            <div className="mt-4 space-y-0.5">
              <MenuAction
                icon={<Plus className="h-5 w-5" />}
                label="Add Set"
                onClick={() => {
                  onAddSet();
                  setOpen(false);
                }}
              />
              {!isComplete && (
                <MenuAction
                  icon={<SkipForward className="h-5 w-5" />}
                  label="Skip Remaining"
                  onClick={() => {
                    onSkipRemaining();
                    setOpen(false);
                  }}
                />
              )}
              <MenuAction
                icon={<StickyNote className="h-5 w-5" />}
                label="Notes"
                onClick={() => {
                  onToggleNotes();
                  setOpen(false);
                }}
              />
              <MenuAction
                icon={<RefreshCw className="h-5 w-5" />}
                label="Replace Exercise"
                onClick={handleShowReplace}
              />
            </div>
          </>
        ) : (
          <>
            <SheetHeader>
              <SheetTitle className="text-base font-semibold flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setView("menu")}
                  className="h-8 w-8 inline-flex items-center justify-center rounded-md hover:bg-accent transition-colors"
                >
                  <ArrowLeft className="h-4 w-4" />
                </button>
                Replace {exerciseName}
              </SheetTitle>
            </SheetHeader>
            <div className="mt-4 max-h-[50vh] overflow-auto space-y-0.5">
              {loadingAlternatives ? (
                <div className="flex items-center justify-center py-8 text-muted-foreground">
                  <Loader2 className="h-5 w-5 animate-spin mr-2" />
                  Loading alternatives...
                </div>
              ) : alternatives.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No alternative exercises found for this muscle group.
                </p>
              ) : (
                alternatives.map((alt) => (
                  <button
                    key={alt.id}
                    type="button"
                    disabled={replacingId !== null}
                    onClick={() => handleReplace(alt.id)}
                    className="flex w-full items-start gap-3 rounded-lg px-3 py-3 text-left hover:bg-accent active:bg-accent/80 transition-colors disabled:opacity-50"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium leading-tight">
                        {alt.name}
                        {replacingId === alt.id && (
                          <Loader2 className="inline h-3.5 w-3.5 animate-spin ml-2" />
                        )}
                      </p>
                      <p className="text-[11px] uppercase tracking-widest text-muted-foreground/60 mt-0.5 font-medium">
                        {alt.equipment}
                      </p>
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {alt.muscleGroups.primary.map((mg) => (
                          <MuscleGroupBadge key={mg} group={mg} />
                        ))}
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

function MenuAction({
  icon,
  label,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className="flex w-full items-center gap-4 rounded-lg px-3 py-3.5 text-sm font-medium hover:bg-accent active:bg-accent/80 transition-colors"
      onClick={onClick}
    >
      <span className="text-muted-foreground">{icon}</span>
      {label}
    </button>
  );
}
