"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { createCustomExercise } from "../actions";

const MUSCLE_GROUPS = [
  "chest", "back", "quads", "hamstrings", "glutes",
  "front_delts", "side_delts", "rear_delts",
  "biceps", "triceps", "calves", "abs", "traps", "forearms",
];

const MOVEMENT_PATTERNS = [
  { value: "horizontal_press", label: "Horizontal Press" },
  { value: "vertical_press", label: "Vertical Press" },
  { value: "horizontal_pull", label: "Horizontal Pull" },
  { value: "vertical_pull", label: "Vertical Pull" },
  { value: "squat", label: "Squat" },
  { value: "hip_hinge", label: "Hip Hinge" },
  { value: "isolation", label: "Isolation" },
  { value: "carry", label: "Carry" },
] as const;

const EQUIPMENT_OPTIONS = [
  "barbell", "dumbbell", "cable", "machine", "bodyweight",
  "kettlebell", "band", "smith machine", "other",
];

export function CreateExerciseSheet() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);

  const [name, setName] = useState("");
  const [primaryMuscles, setPrimaryMuscles] = useState<string[]>([]);
  const [secondaryMuscles, setSecondaryMuscles] = useState<string[]>([]);
  const [movementPattern, setMovementPattern] = useState<string>("isolation");
  const [equipment, setEquipment] = useState<string>("dumbbell");

  function toggleMuscle(group: string, type: "primary" | "secondary") {
    if (type === "primary") {
      // Remove from secondary if present
      setSecondaryMuscles((prev) => prev.filter((m) => m !== group));
      setPrimaryMuscles((prev) =>
        prev.includes(group)
          ? prev.filter((m) => m !== group)
          : [...prev, group]
      );
    } else {
      // Remove from primary if present
      setPrimaryMuscles((prev) => prev.filter((m) => m !== group));
      setSecondaryMuscles((prev) =>
        prev.includes(group)
          ? prev.filter((m) => m !== group)
          : [...prev, group]
      );
    }
  }

  function reset() {
    setName("");
    setPrimaryMuscles([]);
    setSecondaryMuscles([]);
    setMovementPattern("isolation");
    setEquipment("dumbbell");
  }

  const canSubmit = name.trim() && primaryMuscles.length > 0;

  function handleSubmit() {
    if (!canSubmit) return;
    startTransition(async () => {
      const result = await createCustomExercise({
        name: name.trim(),
        primaryMuscles,
        secondaryMuscles,
        movementPattern: movementPattern as Parameters<typeof createCustomExercise>[0]["movementPattern"],
        equipment,
      });
      if (result.success) {
        toast.success(`${name.trim()} added to your library`);
        reset();
        setOpen(false);
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button className="min-h-10">
          <Plus className="h-4 w-4 mr-1.5" />
          Create
        </Button>
      </SheetTrigger>
      <SheetContent className="overflow-y-auto pb-10">
        <SheetHeader>
          <SheetTitle>Create Custom Exercise</SheetTitle>
        </SheetHeader>

        <div className="space-y-5 mt-6">
          {/* Name */}
          <div className="space-y-1.5">
            <Label htmlFor="exercise-name">Exercise Name</Label>
            <Input
              id="exercise-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Incline Cable Fly"
            />
          </div>

          {/* Primary Muscles */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Primary Muscles</Label>
            <p className="text-xs text-muted-foreground -mt-1">
              At least one required.
            </p>
            <div className="flex flex-wrap gap-1.5">
              {MUSCLE_GROUPS.map((mg) => (
                <button
                  key={`p-${mg}`}
                  type="button"
                  onClick={() => toggleMuscle(mg, "primary")}
                  className={`min-h-8 px-2.5 py-1 rounded-full text-xs font-medium capitalize transition-all active:scale-95 ${
                    primaryMuscles.includes(mg)
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:bg-accent"
                  }`}
                >
                  {mg.replace(/_/g, " ")}
                </button>
              ))}
            </div>
          </div>

          {/* Secondary Muscles */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Secondary Muscles</Label>
            <p className="text-xs text-muted-foreground -mt-1">Optional.</p>
            <div className="flex flex-wrap gap-1.5">
              {MUSCLE_GROUPS.filter((mg) => !primaryMuscles.includes(mg)).map(
                (mg) => (
                  <button
                    key={`s-${mg}`}
                    type="button"
                    onClick={() => toggleMuscle(mg, "secondary")}
                    className={`min-h-8 px-2.5 py-1 rounded-full text-xs font-medium capitalize transition-all active:scale-95 ${
                      secondaryMuscles.includes(mg)
                        ? "bg-secondary text-secondary-foreground"
                        : "bg-muted text-muted-foreground hover:bg-accent"
                    }`}
                  >
                    {mg.replace(/_/g, " ")}
                  </button>
                )
              )}
            </div>
          </div>

          {/* Movement Pattern */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Movement Pattern</Label>
            <div className="flex flex-wrap gap-1.5">
              {MOVEMENT_PATTERNS.map((mp) => (
                <button
                  key={mp.value}
                  type="button"
                  onClick={() => setMovementPattern(mp.value)}
                  className={`min-h-8 px-2.5 py-1 rounded-full text-xs font-medium transition-all active:scale-95 ${
                    movementPattern === mp.value
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:bg-accent"
                  }`}
                >
                  {mp.label}
                </button>
              ))}
            </div>
          </div>

          {/* Equipment */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Equipment</Label>
            <div className="flex flex-wrap gap-1.5">
              {EQUIPMENT_OPTIONS.map((eq) => (
                <button
                  key={eq}
                  type="button"
                  onClick={() => setEquipment(eq)}
                  className={`min-h-8 px-2.5 py-1 rounded-full text-xs font-medium capitalize transition-all active:scale-95 ${
                    equipment === eq
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:bg-accent"
                  }`}
                >
                  {eq}
                </button>
              ))}
            </div>
          </div>

          {/* Submit */}
          <Button
            onClick={handleSubmit}
            disabled={isPending || !canSubmit}
            className="w-full h-11 text-base font-semibold"
          >
            {isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Creating...
              </>
            ) : (
              "Create Exercise"
            )}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
