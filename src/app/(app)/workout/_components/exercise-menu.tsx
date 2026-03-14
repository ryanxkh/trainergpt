"use client";

import { useState } from "react";
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
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getAlternativeExercises, replaceExercise } from "../actions";
import { createCustomExercise } from "../../exercises/actions";
import { MuscleGroupBadge } from "./muscle-group-badge";

const MUSCLE_GROUPS = [
  "chest", "back", "quads", "hamstrings", "glutes",
  "front_delts", "side_delts", "rear_delts",
  "biceps", "triceps", "calves", "abs", "traps", "forearms",
];

const EQUIPMENT_OPTIONS = [
  "barbell", "dumbbell", "cable", "machine", "bodyweight",
  "kettlebell", "band", "smith machine", "other",
];

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
  const [view, setView] = useState<"menu" | "replace" | "create">("menu");
  const [alternatives, setAlternatives] = useState<Alternative[]>([]);
  const [loadingAlternatives, setLoadingAlternatives] = useState(false);
  const [replacingId, setReplacingId] = useState<number | null>(null);

  // Create form state
  const [newName, setNewName] = useState("");
  const [newPrimary, setNewPrimary] = useState<string[]>([]);
  const [newEquipment, setNewEquipment] = useState("dumbbell");
  const [isCreating, setIsCreating] = useState(false);

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (!isOpen) {
      setView("menu");
      setNewName("");
      setNewPrimary([]);
      setNewEquipment("dumbbell");
    }
  };

  const handleCreate = async () => {
    if (!newName.trim() || newPrimary.length === 0) return;
    setIsCreating(true);
    const createResult = await createCustomExercise({
      name: newName.trim(),
      primaryMuscles: newPrimary,
      secondaryMuscles: [],
      movementPattern: "isolation",
      equipment: newEquipment,
    });
    if (!createResult.success) {
      toast.error(createResult.error);
      setIsCreating(false);
      return;
    }
    const replaceResult = await replaceExercise(sessionId, exerciseId, createResult.exerciseId);
    if (replaceResult.success) {
      toast.success(`Created & swapped to ${newName.trim()}`);
      onReplace(createResult.exerciseId, replaceResult.data.exerciseName);
      setOpen(false);
    } else {
      toast.error(replaceResult.error);
    }
    setIsCreating(false);
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
            <div className="mt-4 space-y-1">
              <MenuAction
                icon={<Plus className="h-5 w-5 stroke-[1.5]" />}
                label="Add Set"
                onClick={() => {
                  onAddSet();
                  setOpen(false);
                }}
              />
              {!isComplete && (
                <MenuAction
                  icon={<SkipForward className="h-5 w-5 stroke-[1.5]" />}
                  label="Skip Remaining"
                  onClick={() => {
                    onSkipRemaining();
                    setOpen(false);
                  }}
                />
              )}
              <MenuAction
                icon={<StickyNote className="h-5 w-5 stroke-[1.5]" />}
                label="Notes"
                onClick={() => {
                  onToggleNotes();
                  setOpen(false);
                }}
              />
              <MenuAction
                icon={<RefreshCw className="h-5 w-5 stroke-[1.5]" />}
                label="Replace Exercise"
                onClick={handleShowReplace}
              />
            </div>
          </>
        ) : view === "replace" ? (
          <>
            <SheetHeader>
              <SheetTitle className="text-base font-semibold flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setView("menu")}
                  className="h-9 w-9 -ml-1 inline-flex items-center justify-center rounded-md hover:bg-accent active:scale-95 transition-all"
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
                <>
                {alternatives.map((alt) => (
                  <button
                    key={alt.id}
                    type="button"
                    disabled={replacingId !== null}
                    onClick={() => handleReplace(alt.id)}
                    className="flex w-full items-start gap-3 rounded-lg px-3 py-3 min-h-11 text-left hover:bg-accent active:bg-accent/80 active:scale-[0.99] transition-all disabled:opacity-50"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold leading-tight">
                          {alt.name}
                        </p>
                        {replacingId === alt.id && (
                          <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
                        )}
                      </div>
                      <p className="text-[10px] uppercase tracking-widest text-muted-foreground/70 mt-0.5 font-medium">
                        {alt.equipment}
                      </p>
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {alt.muscleGroups.primary.map((mg) => (
                          <MuscleGroupBadge key={mg} group={mg} />
                        ))}
                      </div>
                    </div>
                  </button>
                ))}
                <div className="border-t border-dashed mt-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setView("create")}
                    className="flex w-full items-center gap-3 rounded-lg px-3 min-h-11 text-sm font-medium text-muted-foreground hover:bg-accent active:bg-accent/80 active:scale-[0.99] transition-all"
                  >
                    <Plus className="h-4 w-4 stroke-[1.5]" />
                    Create Custom Exercise
                  </button>
                </div>
              </>
              )}
            </div>
          </>
        ) : (
          /* ── Create Custom Exercise View ── */
          <>
            <SheetHeader>
              <SheetTitle className="text-base font-semibold flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setView("replace")}
                  className="h-9 w-9 -ml-1 inline-flex items-center justify-center rounded-md hover:bg-accent active:scale-95 transition-all"
                >
                  <ArrowLeft className="h-4 w-4" />
                </button>
                Create & Replace
              </SheetTitle>
            </SheetHeader>
            <div className="mt-4 space-y-4 max-h-[50vh] overflow-auto">
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Exercise name"
                autoFocus
              />
              <div className="space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Primary Muscles</p>
                <div className="flex flex-wrap gap-1.5">
                  {MUSCLE_GROUPS.map((mg) => (
                    <button
                      key={mg}
                      type="button"
                      onClick={() =>
                        setNewPrimary((prev) =>
                          prev.includes(mg)
                            ? prev.filter((m) => m !== mg)
                            : [...prev, mg]
                        )
                      }
                      className={`min-h-7 px-2.5 py-1 rounded-full text-xs font-medium capitalize transition-all active:scale-95 ${
                        newPrimary.includes(mg)
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground hover:bg-accent"
                      }`}
                    >
                      {mg.replace(/_/g, " ")}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Equipment</p>
                <div className="flex flex-wrap gap-1.5">
                  {EQUIPMENT_OPTIONS.map((eq) => (
                    <button
                      key={eq}
                      type="button"
                      onClick={() => setNewEquipment(eq)}
                      className={`min-h-7 px-2.5 py-1 rounded-full text-xs font-medium capitalize transition-all active:scale-95 ${
                        newEquipment === eq
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground hover:bg-accent"
                      }`}
                    >
                      {eq}
                    </button>
                  ))}
                </div>
              </div>
              <Button
                onClick={handleCreate}
                disabled={isCreating || !newName.trim() || newPrimary.length === 0}
                className="w-full h-11 text-base font-semibold"
              >
                {isCreating ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Creating...
                  </>
                ) : (
                  "Create & Replace"
                )}
              </Button>
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
      className="flex w-full items-center gap-4 rounded-lg px-4 min-h-[52px] text-sm font-medium hover:bg-accent active:bg-accent/80 active:scale-[0.98] transition-all"
      onClick={onClick}
    >
      <span className="text-muted-foreground shrink-0">{icon}</span>
      {label}
    </button>
  );
}
