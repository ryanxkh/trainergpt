"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Loader2, Sparkles } from "lucide-react";

const MUSCLE_GROUPS = [
  "chest",
  "back",
  "quads",
  "hamstrings",
  "glutes",
  "side_delts",
  "rear_delts",
  "biceps",
  "triceps",
  "calves",
  "abs",
];

export function GenerateMesocycleForm() {
  const [open, setOpen] = useState(false);
  const [splitType, setSplitType] = useState("upper_lower");
  const [trainingDays, setTrainingDays] = useState("4");
  const [focusAreas, setFocusAreas] = useState<string[]>([]);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const toggleFocus = (group: string) => {
    setFocusAreas((prev) =>
      prev.includes(group) ? prev.filter((g) => g !== group) : [...prev, group]
    );
  };

  const handleGenerate = () => {
    startTransition(async () => {
      try {
        const res = await fetch("/api/program", {
          signal: AbortSignal.timeout(120000), // 2 min timeout for AI generation
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            splitType,
            trainingDays: parseInt(trainingDays),
            focusAreas: focusAreas.length > 0 ? focusAreas : undefined,
          }),
        });

        if (!res.ok) {
          throw new Error("Generation failed");
        }

        const data = await res.json();
        toast.success(`Generated: ${data.plan.name}`);
        setOpen(false);
        router.refresh();
        router.push(`/program/${data.mesocycle.id}`);
      } catch {
        toast.error("Failed to generate mesocycle. Try again.");
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Sparkles className="mr-2 h-4 w-4" />
          Generate Mesocycle
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Generate Training Program</DialogTitle>
        </DialogHeader>
        <div className="space-y-6 pt-4">
          <div className="space-y-2">
            <Label>Training Split</Label>
            <Select value={splitType} onValueChange={setSplitType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="upper_lower">Upper / Lower</SelectItem>
                <SelectItem value="push_pull_legs">Push / Pull / Legs</SelectItem>
                <SelectItem value="full_body">Full Body</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Training Days per Week</Label>
            <Select value={trainingDays} onValueChange={setTrainingDays}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="3">3 days</SelectItem>
                <SelectItem value="4">4 days</SelectItem>
                <SelectItem value="5">5 days</SelectItem>
                <SelectItem value="6">6 days</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Focus Areas (optional)</Label>
            <p className="text-xs text-muted-foreground">
              Select muscle groups to prioritize with extra volume
            </p>
            <div className="flex flex-wrap gap-2">
              {MUSCLE_GROUPS.map((group) => (
                <Badge
                  key={group}
                  variant={focusAreas.includes(group) ? "default" : "outline"}
                  className="cursor-pointer capitalize"
                  onClick={() => toggleFocus(group)}
                >
                  {group.replace(/_/g, " ")}
                </Badge>
              ))}
            </div>
          </div>

          <Button
            onClick={handleGenerate}
            disabled={isPending}
            className="w-full"
            size="lg"
          >
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating (this takes ~30s)...
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                Generate Program
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
