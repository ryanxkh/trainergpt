"use client";

import { useState, useTransition } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Check } from "lucide-react";
import { toast } from "sonner";
import { logSet } from "../actions";
import type { PrescribedExercise, LoggedSet, PreviousSetData, SetType } from "./types";

/* ================================================================
   Completed Set Row — checkmark + logged values + set type badge
   ================================================================ */

export function CompletedSetRow({
  setNumber,
  weight,
  reps,
  rir,
  setType,
}: {
  setNumber: number;
  weight: number;
  reps: number;
  rir: number | null;
  setType: SetType;
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
      {setType === "myorep" && (
        <span className="text-[10px] font-bold uppercase tracking-wide text-violet-600 dark:text-violet-400 bg-violet-100 dark:bg-violet-950/40 px-1.5 py-0.5 rounded">
          MYO
        </span>
      )}
      {setType === "dropset" && (
        <span className="text-[10px] font-bold uppercase tracking-wide text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-950/40 px-1.5 py-0.5 rounded">
          DROP
        </span>
      )}
      <Check className="h-3.5 w-3.5 text-green-500 ml-auto shrink-0" />
    </div>
  );
}

/* ================================================================
   Active Set Row — input fields, set type toggle, weight carry-forward
   ================================================================ */

export function ActiveSetRow({
  setNumber,
  sessionId,
  exerciseId,
  exerciseName,
  target,
  previousSet,
  lastLoggedWeight,
  defaultSetType,
  onSetLogged,
}: {
  setNumber: number;
  sessionId: number;
  exerciseId: number;
  exerciseName: string;
  target: PrescribedExercise;
  previousSet: PreviousSetData | undefined;
  lastLoggedWeight: number | undefined;
  defaultSetType: SetType;
  onSetLogged: (set: LoggedSet) => void;
}) {
  const prefillWeight = lastLoggedWeight ?? previousSet?.weight;
  const [weight, setWeight] = useState(
    prefillWeight ? prefillWeight.toString() : ""
  );
  const [reps, setReps] = useState("");
  const [rir, setRir] = useState(target.rirTarget.toString());
  const [setType, setSetType] = useState<SetType>(defaultSetType);
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
        setType,
      });
      if (result.success) {
        onSetLogged({
          id: result.data.id,
          exerciseId,
          setNumber,
          weight: parseFloat(weight),
          reps: parseInt(reps),
          rir: rir ? parseInt(rir) : null,
          setType,
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
        <div className="flex flex-col items-center gap-0.5">
          <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">RIR</span>
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
        </div>
        <Button
          className="h-11 px-5 ml-auto font-semibold"
          onClick={handleLog}
          disabled={isPending}
        >
          {isPending ? "..." : "Log"}
        </Button>
      </div>

      {/* Set type selector */}
      <div className="flex items-center gap-1 pl-7">
        {(["normal", "myorep", "dropset"] as const).map((type) => (
          <button
            key={type}
            type="button"
            onClick={() => setSetType(type)}
            className={cn(
              "px-2.5 py-1 rounded-full text-[11px] font-medium transition-all",
              setType === type
                ? type === "myorep"
                  ? "bg-violet-100 text-violet-700 dark:bg-violet-950/40 dark:text-violet-400"
                  : type === "dropset"
                    ? "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400"
                    : "bg-primary/10 text-primary"
                : "text-muted-foreground hover:bg-muted"
            )}
          >
            {type === "normal" ? "Normal" : type === "myorep" ? "Myo-Rep" : "Drop Set"}
          </button>
        ))}
      </div>

      {previousSet && (
        <p className="text-[11px] text-muted-foreground pl-7">
          Last: {previousSet.weight} &times; {previousSet.reps}
          {previousSet.rir !== null ? ` @ ${previousSet.rir} RIR` : ""}
          {previousSet.setType !== "normal" && (
            <span className="ml-1 opacity-70">
              ({previousSet.setType === "myorep" ? "Myo-Rep" : "Drop Set"})
            </span>
          )}
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
