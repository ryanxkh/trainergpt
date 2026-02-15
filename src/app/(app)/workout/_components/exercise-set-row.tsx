"use client";

import { useState, useTransition } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Check } from "lucide-react";
import { toast } from "sonner";
import { logSet } from "../actions";
import type { PrescribedExercise, LoggedSet, PreviousSetData } from "./types";

/* ================================================================
   Completed Set Row — checkmark + logged values
   ================================================================ */

export function CompletedSetRow({
  setNumber,
  weight,
  reps,
  rir,
}: {
  setNumber: number;
  weight: number;
  reps: number;
  rir: number | null;
}) {
  return (
    <div className="flex items-center gap-3 py-2.5 border-l-2 border-green-500 pl-3 -ml-0.5 bg-green-500/[0.03] dark:bg-green-500/[0.04] rounded-r-md">
      <span className="text-xs font-medium text-muted-foreground w-5 tabular-nums">
        {setNumber}
      </span>
      <span className="text-sm font-medium tabular-nums">
        {weight}
        <span className="text-muted-foreground text-xs ml-0.5">lbs</span>
      </span>
      <span className="text-muted-foreground text-xs">&times;</span>
      <span className="text-sm font-medium tabular-nums">{reps}</span>
      {rir !== null && (
        <span className="text-xs text-muted-foreground">@ {rir} RIR</span>
      )}
      <Check className="h-3.5 w-3.5 text-green-500 ml-auto shrink-0" />
    </div>
  );
}

/* ================================================================
   Active Set Row — input fields, pre-filled with previous weight
   ================================================================ */

export function ActiveSetRow({
  setNumber,
  sessionId,
  exerciseId,
  exerciseName,
  target,
  previousSet,
  onSetLogged,
}: {
  setNumber: number;
  sessionId: number;
  exerciseId: number;
  exerciseName: string;
  target: PrescribedExercise;
  previousSet: PreviousSetData | undefined;
  onSetLogged: (set: LoggedSet) => void;
}) {
  const [weight, setWeight] = useState(
    previousSet ? previousSet.weight.toString() : ""
  );
  const [reps, setReps] = useState("");
  const [rir, setRir] = useState(target.rirTarget.toString());
  const [isPending, startTransition] = useTransition();

  const handleLog = () => {
    if (!weight || !reps) {
      toast.error("Enter weight and reps");
      return;
    }
    startTransition(async () => {
      const result = await logSet(sessionId, exerciseId, {
        setNumber,
        weight: parseFloat(weight),
        reps: parseInt(reps),
        rir: rir ? parseInt(rir) : undefined,
      });
      if (result.success) {
        onSetLogged({
          id: result.data.id,
          exerciseId,
          setNumber,
          weight: parseFloat(weight),
          reps: parseInt(reps),
          rir: rir ? parseInt(rir) : null,
        });
        toast.success(
          `Set ${setNumber}: ${exerciseName} — ${weight} x ${reps}`
        );
      } else {
        toast.error(result.error);
      }
    });
  };

  return (
    <div className="py-2.5 border-l-2 border-primary pl-3 -ml-0.5 space-y-2 bg-primary/[0.03] dark:bg-primary/[0.06] rounded-r-md">
      <div className="flex items-center gap-2">
        <span className="text-xs font-bold text-foreground w-5 tabular-nums">
          {setNumber}
        </span>
        <Input
          type="number"
          inputMode="decimal"
          placeholder="lbs"
          value={weight}
          onChange={(e) => setWeight(e.target.value)}
          className="h-11 w-20 text-center font-medium tabular-nums text-base"
        />
        <span className="text-muted-foreground text-xs">&times;</span>
        <Input
          type="number"
          inputMode="numeric"
          placeholder={`${target.repRangeMin}-${target.repRangeMax}`}
          value={reps}
          onChange={(e) => setReps(e.target.value)}
          className="h-11 w-16 text-center font-medium tabular-nums text-base"
        />
        <span className="text-muted-foreground text-xs">@</span>
        <div className="flex gap-0.5">
          {[0, 1, 2, 3, 4].map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setRir(v.toString())}
              className={cn(
                "h-9 w-9 rounded-md text-xs font-medium transition-all",
                rir === v.toString()
                  ? "bg-primary text-primary-foreground shadow-sm scale-105"
                  : "bg-muted text-muted-foreground hover:bg-accent active:scale-95"
              )}
            >
              {v}
            </button>
          ))}
        </div>
        <Button
          className="h-11 px-5 ml-auto font-semibold"
          onClick={handleLog}
          disabled={isPending}
        >
          {isPending ? "..." : "Log"}
        </Button>
      </div>
      {previousSet && (
        <p className="text-[11px] text-muted-foreground pl-7">
          Last: {previousSet.weight} &times; {previousSet.reps}
          {previousSet.rir !== null ? ` @ ${previousSet.rir} RIR` : ""}
        </p>
      )}
    </div>
  );
}

/* ================================================================
   Upcoming Set Row — target prescription + "last time" hint
   ================================================================ */

export function UpcomingSetRow({
  setNumber,
  target,
  previousSet,
}: {
  setNumber: number;
  target: PrescribedExercise;
  previousSet: PreviousSetData | undefined;
}) {
  return (
    <div className="flex items-center gap-3 py-2.5 pl-3 -ml-0.5 border-l-2 border-muted/50 rounded-r-md opacity-50">
      <span className="text-xs font-medium text-muted-foreground w-5 tabular-nums">
        {setNumber}
      </span>
      <span className="text-xs text-muted-foreground">
        {target.repRangeMin}&ndash;{target.repRangeMax} reps @ {target.rirTarget} RIR
      </span>
      {previousSet && (
        <span className="text-[11px] text-muted-foreground/70 ml-auto tabular-nums">
          Last: {previousSet.weight} &times; {previousSet.reps}
        </span>
      )}
    </div>
  );
}
