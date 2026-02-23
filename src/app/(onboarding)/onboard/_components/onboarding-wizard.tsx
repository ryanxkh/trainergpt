"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Dumbbell, ArrowLeft, ArrowRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { completeOnboarding } from "../actions";

type OnboardingData = {
  experienceLevel: "beginner" | "intermediate" | "advanced";
  availableTrainingDays: number;
  preferredSplit: "full_body" | "upper_lower" | "push_pull_legs";
  equipmentAccess: "home" | "apartment" | "commercial" | "specialty";
};

const DEFAULTS: OnboardingData = {
  experienceLevel: "intermediate",
  availableTrainingDays: 4,
  preferredSplit: "upper_lower",
  equipmentAccess: "commercial",
};

const STEPS = ["Experience", "Schedule", "Split", "Equipment"] as const;

function OptionCard({
  selected,
  onClick,
  title,
  description,
}: {
  selected: boolean;
  onClick: () => void;
  title: string;
  description: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full rounded-lg border-2 p-4 text-left transition-colors ${
        selected
          ? "border-primary bg-primary/5"
          : "border-border hover:border-muted-foreground/50"
      }`}
    >
      <p className="font-semibold tracking-tight">{title}</p>
      <p className="mt-1 text-sm text-muted-foreground">{description}</p>
    </button>
  );
}

export function OnboardingWizard() {
  const [step, setStep] = useState(0);
  const [data, setData] = useState<OnboardingData>(DEFAULTS);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function next() {
    if (step < STEPS.length - 1) setStep(step + 1);
  }

  function back() {
    if (step > 0) setStep(step - 1);
  }

  function handleFinish() {
    startTransition(async () => {
      await completeOnboarding(data);
      router.push("/coach");
    });
  }

  // Auto-suggest split based on training days
  function setDays(days: number) {
    let split = data.preferredSplit;
    if (days <= 3) split = "full_body";
    else if (days <= 4) split = "upper_lower";
    else split = "push_pull_legs";
    setData({ ...data, availableTrainingDays: days, preferredSplit: split });
  }

  const isLast = step === STEPS.length - 1;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center space-y-2">
        <Dumbbell className="mx-auto h-10 w-10" />
        <h1 className="text-2xl font-semibold tracking-tight">
          Set up your profile
        </h1>
        <p className="text-sm text-muted-foreground">
          Step {step + 1} of {STEPS.length} — {STEPS[step]}
        </p>
      </div>

      {/* Progress bar */}
      <div className="flex gap-1.5">
        {STEPS.map((_, i) => (
          <div
            key={i}
            className={`h-1.5 flex-1 rounded-full transition-colors ${
              i <= step ? "bg-primary" : "bg-muted"
            }`}
          />
        ))}
      </div>

      {/* Step content */}
      <div className="space-y-3">
        {step === 0 && (
          <>
            <p className="text-sm font-medium">
              What best describes your training experience?
            </p>
            <OptionCard
              selected={data.experienceLevel === "beginner"}
              onClick={() =>
                setData({ ...data, experienceLevel: "beginner" })
              }
              title="Beginner"
              description="Less than 1 year of consistent resistance training. Still learning movement patterns and building a base."
            />
            <OptionCard
              selected={data.experienceLevel === "intermediate"}
              onClick={() =>
                setData({ ...data, experienceLevel: "intermediate" })
              }
              title="Intermediate"
              description="1-3 years of consistent training. Comfortable with compound lifts and progressive overload."
            />
            <OptionCard
              selected={data.experienceLevel === "advanced"}
              onClick={() =>
                setData({ ...data, experienceLevel: "advanced" })
              }
              title="Advanced"
              description="3+ years of serious training. Familiar with periodization, volume landmarks, and autoregulation."
            />
          </>
        )}

        {step === 1 && (
          <>
            <p className="text-sm font-medium">
              How many days per week can you train?
            </p>
            <div className="flex gap-2 flex-wrap">
              {[2, 3, 4, 5, 6].map((d) => (
                <Button
                  key={d}
                  variant={
                    data.availableTrainingDays === d ? "default" : "outline"
                  }
                  size="lg"
                  onClick={() => setDays(d)}
                  className="flex-1 min-w-[3.5rem]"
                >
                  {d}
                </Button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              {data.availableTrainingDays <= 3
                ? "Full body sessions work best at this frequency."
                : data.availableTrainingDays <= 4
                  ? "An upper/lower split is ideal at this frequency."
                  : "A push/pull/legs split maximizes volume at this frequency."}
            </p>
          </>
        )}

        {step === 2 && (
          <>
            <p className="text-sm font-medium">
              Which training split do you prefer?
            </p>
            <OptionCard
              selected={data.preferredSplit === "full_body"}
              onClick={() =>
                setData({ ...data, preferredSplit: "full_body" })
              }
              title="Full Body"
              description="Train all major muscle groups each session. Best for 2-3 days per week."
            />
            <OptionCard
              selected={data.preferredSplit === "upper_lower"}
              onClick={() =>
                setData({ ...data, preferredSplit: "upper_lower" })
              }
              title="Upper / Lower"
              description="Alternate upper and lower body sessions. Best for 3-4 days per week."
            />
            <OptionCard
              selected={data.preferredSplit === "push_pull_legs"}
              onClick={() =>
                setData({ ...data, preferredSplit: "push_pull_legs" })
              }
              title="Push / Pull / Legs"
              description="Separate pushing, pulling, and leg days. Best for 5-6 days per week."
            />
          </>
        )}

        {step === 3 && (
          <>
            <p className="text-sm font-medium">
              What equipment do you have access to?
            </p>
            <OptionCard
              selected={data.equipmentAccess === "home"}
              onClick={() =>
                setData({ ...data, equipmentAccess: "home" })
              }
              title="Home Gym"
              description="Dumbbells, a bench, and maybe a rack or pull-up bar. Limited machines."
            />
            <OptionCard
              selected={data.equipmentAccess === "apartment"}
              onClick={() =>
                setData({ ...data, equipmentAccess: "apartment" })
              }
              title="Apartment Gym"
              description="Basic machines, dumbbells up to ~50 lbs, cables. No barbells or power racks."
            />
            <OptionCard
              selected={data.equipmentAccess === "commercial"}
              onClick={() =>
                setData({ ...data, equipmentAccess: "commercial" })
              }
              title="Commercial Gym"
              description="Full selection: barbells, dumbbells, cables, machines, and free weights."
            />
            <OptionCard
              selected={data.equipmentAccess === "specialty"}
              onClick={() =>
                setData({ ...data, equipmentAccess: "specialty" })
              }
              title="Specialty / Powerlifting"
              description="Competition-grade equipment: calibrated plates, specialty bars, belt squat, reverse hyper."
            />
          </>
        )}
      </div>

      {/* Navigation */}
      <div className="flex gap-3">
        {step > 0 && (
          <Button variant="outline" onClick={back} disabled={isPending}>
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
        )}
        <Button
          className="flex-1"
          onClick={isLast ? handleFinish : next}
          disabled={isPending}
        >
          {isPending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Setting up...
            </>
          ) : isLast ? (
            "Get Started"
          ) : (
            <>
              Next
              <ArrowRight className="h-4 w-4" />
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
