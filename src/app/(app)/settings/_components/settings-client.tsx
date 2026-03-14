"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  updateProfile,
  updateVolumeLandmark,
  resetVolumeLandmarks,
  handleSignOut,
} from "../actions";

type SettingsData = {
  user: {
    name: string | null;
    email: string;
    experienceLevel: string | null;
    trainingAgeMonths: number | null;
    availableTrainingDays: number | null;
    preferredSplit: string | null;
    equipmentAccess: string | null;
  };
  landmarks: {
    muscleGroup: string;
    mev: number;
    mav: number;
    mrv: number;
  }[];
};

const EXPERIENCE_OPTIONS = [
  { value: "beginner", label: "Beginner" },
  { value: "intermediate", label: "Intermediate" },
  { value: "advanced", label: "Advanced" },
] as const;

const SPLIT_OPTIONS = [
  { value: "full_body", label: "Full Body" },
  { value: "upper_lower", label: "Upper / Lower" },
  { value: "push_pull_legs", label: "Push / Pull / Legs" },
  { value: "custom", label: "Custom" },
] as const;

const EQUIPMENT_OPTIONS = [
  { value: "home", label: "Home Gym" },
  { value: "apartment", label: "Apartment Gym" },
  { value: "commercial", label: "Commercial Gym" },
  { value: "specialty", label: "Specialty / Bodybuilding" },
] as const;

function formatMuscleGroup(mg: string) {
  return mg
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function SelectButtons({
  options,
  value,
  onChange,
}: {
  options: readonly { value: string; label: string }[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => (
        <Button
          key={opt.value}
          type="button"
          variant={value === opt.value ? "default" : "outline"}
          size="sm"
          onClick={() => onChange(opt.value)}
        >
          {opt.label}
        </Button>
      ))}
    </div>
  );
}

export function SettingsClient({ data }: { data: SettingsData }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Profile state
  const [name, setName] = useState(data.user.name ?? "");
  const [experienceLevel, setExperienceLevel] = useState(
    data.user.experienceLevel ?? "intermediate"
  );
  const [trainingAge, setTrainingAge] = useState(
    (data.user.trainingAgeMonths ?? 0).toString()
  );
  const [trainingDays, setTrainingDays] = useState(
    data.user.availableTrainingDays ?? 4
  );
  const [split, setSplit] = useState(
    data.user.preferredSplit ?? "upper_lower"
  );
  const [equipment, setEquipment] = useState(
    data.user.equipmentAccess ?? "commercial"
  );

  // Landmarks state
  const [landmarks, setLandmarks] = useState(data.landmarks);
  const [editingLandmark, setEditingLandmark] = useState<string | null>(null);

  const hasProfileChanges =
    name !== (data.user.name ?? "") ||
    experienceLevel !== (data.user.experienceLevel ?? "intermediate") ||
    parseInt(trainingAge) !== (data.user.trainingAgeMonths ?? 0) ||
    trainingDays !== (data.user.availableTrainingDays ?? 4) ||
    split !== (data.user.preferredSplit ?? "upper_lower") ||
    equipment !== (data.user.equipmentAccess ?? "commercial");

  function handleSaveProfile() {
    startTransition(async () => {
      const result = await updateProfile({
        name: name || undefined,
        experienceLevel: experienceLevel as
          | "beginner"
          | "intermediate"
          | "advanced",
        trainingAgeMonths: parseInt(trainingAge) || 0,
        availableTrainingDays: trainingDays,
        preferredSplit: split as
          | "full_body"
          | "upper_lower"
          | "push_pull_legs"
          | "custom",
        equipmentAccess: equipment as
          | "home"
          | "apartment"
          | "commercial"
          | "specialty",
      });
      if (result.success) {
        toast.success("Profile updated");
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  function handleSaveLandmark(mg: string) {
    const landmark = landmarks.find((l) => l.muscleGroup === mg);
    if (!landmark) return;

    startTransition(async () => {
      const result = await updateVolumeLandmark(mg, {
        mev: landmark.mev,
        mav: landmark.mav,
        mrv: landmark.mrv,
      });
      if (result.success) {
        toast.success(`${formatMuscleGroup(mg)} updated`);
        setEditingLandmark(null);
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  function handleResetLandmarks() {
    startTransition(async () => {
      const result = await resetVolumeLandmarks();
      if (result.success) {
        toast.success("Volume landmarks reset to defaults");
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  function updateLandmarkValue(
    mg: string,
    field: "mev" | "mav" | "mrv",
    value: number
  ) {
    setLandmarks((prev) =>
      prev.map((l) =>
        l.muscleGroup === mg ? { ...l, [field]: value } : l
      )
    );
  }

  return (
    <div className="max-w-2xl space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">
          Manage your profile, training preferences, and volume landmarks.
        </p>
      </div>

      {/* Profile Section */}
      <section className="space-y-4">
        <h2 className="text-lg font-medium">Profile</h2>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Email</Label>
            <Input value={data.user.email} disabled className="opacity-60" />
          </div>
          <div className="space-y-1.5">
            <Label>Experience Level</Label>
            <SelectButtons
              options={EXPERIENCE_OPTIONS}
              value={experienceLevel}
              onChange={setExperienceLevel}
            />
            {experienceLevel !== (data.user.experienceLevel ?? "intermediate") && (
              <p className="text-xs text-amber-600 dark:text-amber-400">
                Changing experience level will reset your volume landmarks to
                new defaults.
              </p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="training-age">Training Age (months)</Label>
            <Input
              id="training-age"
              type="number"
              min={0}
              value={trainingAge}
              onChange={(e) => setTrainingAge(e.target.value)}
              className="w-24"
            />
          </div>
        </div>
      </section>

      <Separator />

      {/* Training Preferences */}
      <section className="space-y-4">
        <h2 className="text-lg font-medium">Training Preferences</h2>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Training Days per Week</Label>
            <div className="flex gap-2">
              {[2, 3, 4, 5, 6].map((d) => (
                <Button
                  key={d}
                  type="button"
                  variant={trainingDays === d ? "default" : "outline"}
                  size="sm"
                  onClick={() => setTrainingDays(d)}
                  className="w-10"
                >
                  {d}
                </Button>
              ))}
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Preferred Split</Label>
            <SelectButtons
              options={SPLIT_OPTIONS}
              value={split}
              onChange={setSplit}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Equipment Access</Label>
            <SelectButtons
              options={EQUIPMENT_OPTIONS}
              value={equipment}
              onChange={setEquipment}
            />
          </div>
        </div>
      </section>

      {/* Save profile button */}
      <Button
        onClick={handleSaveProfile}
        disabled={isPending || !hasProfileChanges}
        className="w-full sm:w-auto"
      >
        {isPending ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Saving...
          </>
        ) : (
          "Save Changes"
        )}
      </Button>

      <Separator />

      {/* Volume Landmarks */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-medium">Volume Landmarks</h2>
            <p className="text-sm text-muted-foreground">
              Sets per week by muscle group. Tap a row to edit.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleResetLandmarks}
            disabled={isPending}
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Reset
          </Button>
        </div>

        <div className="rounded-lg border">
          {/* Header */}
          <div className="grid grid-cols-4 gap-2 border-b bg-muted/50 px-3 py-2 text-xs font-medium text-muted-foreground">
            <div>Muscle Group</div>
            <div className="text-center">MEV</div>
            <div className="text-center">MAV</div>
            <div className="text-center">MRV</div>
          </div>

          {/* Rows */}
          {landmarks.map((l) => {
            const isEditing = editingLandmark === l.muscleGroup;
            return (
              <div
                key={l.muscleGroup}
                className="grid grid-cols-4 items-center gap-2 border-b last:border-0 px-3 py-2 text-sm cursor-pointer hover:bg-muted/30 transition-colors"
                onClick={() =>
                  !isEditing && setEditingLandmark(l.muscleGroup)
                }
              >
                <div className="font-medium text-xs sm:text-sm">
                  {formatMuscleGroup(l.muscleGroup)}
                </div>
                {isEditing ? (
                  <>
                    <Input
                      type="number"
                      min={0}
                      value={l.mev}
                      onChange={(e) =>
                        updateLandmarkValue(
                          l.muscleGroup,
                          "mev",
                          parseInt(e.target.value) || 0
                        )
                      }
                      className="h-7 text-center text-xs"
                      onClick={(e) => e.stopPropagation()}
                    />
                    <Input
                      type="number"
                      min={0}
                      value={l.mav}
                      onChange={(e) =>
                        updateLandmarkValue(
                          l.muscleGroup,
                          "mav",
                          parseInt(e.target.value) || 0
                        )
                      }
                      className="h-7 text-center text-xs"
                      onClick={(e) => e.stopPropagation()}
                    />
                    <Input
                      type="number"
                      min={0}
                      value={l.mrv}
                      onChange={(e) =>
                        updateLandmarkValue(
                          l.muscleGroup,
                          "mrv",
                          parseInt(e.target.value) || 0
                        )
                      }
                      className="h-7 text-center text-xs"
                      onClick={(e) => e.stopPropagation()}
                    />
                  </>
                ) : (
                  <>
                    <div className="text-center tabular-nums">{l.mev}</div>
                    <div className="text-center tabular-nums">{l.mav}</div>
                    <div className="text-center tabular-nums">{l.mrv}</div>
                  </>
                )}
              </div>
            );
          })}
        </div>

        {editingLandmark && (
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={() => handleSaveLandmark(editingLandmark)}
              disabled={isPending}
            >
              {isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                "Save"
              )}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setLandmarks(data.landmarks);
                setEditingLandmark(null);
              }}
            >
              Cancel
            </Button>
          </div>
        )}
      </section>

      <Separator />

      {/* Account */}
      <section className="space-y-4">
        <h2 className="text-lg font-medium">Account</h2>
        <form action={handleSignOut}>
          <Button variant="outline" type="submit">
            Sign Out
          </Button>
        </form>
      </section>
    </div>
  );
}
