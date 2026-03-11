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
        <Button size="sm">
          <Plus className="h-4 w-4" />
          Add Exercise
        </Button>
      </SheetTrigger>
      <SheetContent className="overflow-y-auto">
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
          <div className="space-y-1.5">
            <Label>Primary Muscles</Label>
            <p className="text-xs text-muted-foreground">
              Tap to select. At least one required.
            </p>
            <div className="flex flex-wrap gap-1.5">
              {MUSCLE_GROUPS.map((mg) => (
                <Badge
                  key={`p-${mg}`}
                  variant={primaryMuscles.includes(mg) ? "default" : "outline"}
                  className="cursor-pointer capitalize text-xs"
                  onClick={() => toggleMuscle(mg, "primary")}
                >
                  {mg.replace(/_/g, " ")}
                </Badge>
              ))}
            </div>
          </div>

          {/* Secondary Muscles */}
          <div className="space-y-1.5">
            <Label>Secondary Muscles</Label>
            <p className="text-xs text-muted-foreground">Optional.</p>
            <div className="flex flex-wrap gap-1.5">
              {MUSCLE_GROUPS.filter((mg) => !primaryMuscles.includes(mg)).map(
                (mg) => (
                  <Badge
                    key={`s-${mg}`}
                    variant={
                      secondaryMuscles.includes(mg) ? "secondary" : "outline"
                    }
                    className="cursor-pointer capitalize text-xs"
                    onClick={() => toggleMuscle(mg, "secondary")}
                  >
                    {mg.replace(/_/g, " ")}
                  </Badge>
                )
              )}
            </div>
          </div>

          {/* Movement Pattern */}
          <div className="space-y-1.5">
            <Label>Movement Pattern</Label>
            <div className="flex flex-wrap gap-1.5">
              {MOVEMENT_PATTERNS.map((mp) => (
                <Badge
                  key={mp.value}
                  variant={movementPattern === mp.value ? "default" : "outline"}
                  className="cursor-pointer text-xs"
                  onClick={() => setMovementPattern(mp.value)}
                >
                  {mp.label}
                </Badge>
              ))}
            </div>
          </div>

          {/* Equipment */}
          <div className="space-y-1.5">
            <Label>Equipment</Label>
            <div className="flex flex-wrap gap-1.5">
              {EQUIPMENT_OPTIONS.map((eq) => (
                <Badge
                  key={eq}
                  variant={equipment === eq ? "default" : "outline"}
                  className="cursor-pointer capitalize text-xs"
                  onClick={() => setEquipment(eq)}
                >
                  {eq}
                </Badge>
              ))}
            </div>
          </div>

          {/* Submit */}
          <Button
            onClick={handleSubmit}
            disabled={isPending || !canSubmit}
            className="w-full"
          >
            {isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
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
