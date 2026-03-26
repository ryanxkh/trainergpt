"use client";

import { useState, useTransition } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Check, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { logSet, updateSet } from "../actions";
import type { PrescribedExercise, LoggedSet, PreviousSetData, SetType } from "./types";

/* ================================================================
   Completed Set Row — checkmark + logged values + set type badge
   Tap to edit inline.
   ================================================================ */

export function CompletedSetRow({
  setId,
  setNumber,
  weight,
  reps,
  rir,
  setType,
  onSetUpdated,
}: {
  setId: number;
  setNumber: number;
  weight: number;
  reps: number;
  rir: number | null;
  setType: SetType;
  onSetUpdated?: (updated: { weight: number; reps: number; rir: number | null }) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [editWeight, setEditWeight] = useState(weight.toString());
  const [editReps, setEditReps] = useState(reps.toString());
  const [editRir, setEditRir] = useState(rir?.toString() ?? "");
  const [isPending, startTransition] = useTransition();

  const handleSave = () => {
    if (!editWeight || !editReps) {
      toast.error("Enter weight and reps");
      return;
    }
    startTransition(async () => {
      const result = await updateSet(setId, {
        weight: parseFloat(editWeight),
        reps: parseInt(editReps),
        rir: editRir ? parseInt(editRir) : undefined,
      });
      if (result.success) {
        onSetUpdated?.({
          weight: parseFloat(editWeight),
          reps: parseInt(editReps),
          rir: editRir ? parseInt(editRir) : null,
        });
        setEditing(false);
        toast.success("Set updated");
      } else {
        toast.error(result.error);
      }
    });
  };

  const handleCancel = () => {
    setEditWeight(weight.toString());
    setEditReps(reps.toString());
    setEditRir(rir?.toString() ?? "");
    setEditing(false);
  };

  if (editing) {
    return (
      <div className="py-3 border-l-2 border-amber-500 pl-3 -ml-0.5 space-y-2.5 bg-amber-500/[0.04] dark:bg-amber-500/[0.06] rounded-r-md">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-muted-foreground w-5 tabular-nums shrink-0">
            {setNumber}
          </span>
          <Input
            type="number"
            inputMode="decimal"
            value={editWeight}
            onChange={(e) => setEditWeight(e.target.value)}
            className="h-11 flex-1 min-w-0 text-center font-semibold tabular-nums"
          />
          <span className="text-muted-foreground text-sm shrink-0">&times;</span>
          <Input
            type="number"
            inputMode="numeric"
            value={editReps}
            onChange={(e) => setEditReps(e.target.value)}
            className="h-11 flex-[0.6] min-w-0 text-center font-semibold tabular-nums"
          />
          <Input
            type="number"
            inputMode="numeric"
            placeholder="RIR"
            value={editRir}
            onChange={(e) => setEditRir(e.target.value)}
            className="h-11 flex-[0.5] min-w-0 text-center font-semibold tabular-nums"
          />
        </div>
        <div className="flex gap-2 pl-7">
          <Button
            size="sm"
            variant="ghost"
            onClick={handleCancel}
            disabled={isPending}
            className="flex-1"
          >
            <X className="mr-1 h-3 w-3" />
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={handleSave}
            disabled={isPending}
            className="flex-1"
          >
            {isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : "Save"}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setEditing(true)}
      className="flex items-center gap-2 min-h-[44px] py-2.5 border-l-2 border-green-500 pl-3 -ml-0.5 bg-green-500/[0.03] dark:bg-green-500/[0.04] rounded-r-md w-full text-left active:bg-green-500/[0.08] transition-colors"
    >
      <span className="text-xs font-medium text-muted-foreground w-5 tabular-nums shrink-0">
        {setNumber}
      </span>
      <span className="text-sm font-semibold tabular-nums">
        {weight}
        <span className="text-muted-foreground text-xs font-normal ml-0.5">lbs</span>
      </span>
      <span className="text-muted-foreground text-sm">&times;</span>
      <span className="text-sm font-semibold tabular-nums">{reps}</span>
      {rir !== null && (
        <span className="text-xs text-muted-foreground font-medium">@{rir}</span>
      )}
      {setType === "myorep" && (
        <span className="text-[10px] font-bold uppercase tracking-wide text-violet-600 dark:text-violet-400 bg-violet-100 dark:bg-violet-950/40 px-1.5 py-0.5 rounded ml-auto">
          MYO
        </span>
      )}
      {setType === "dropset" && (
        <span className="text-[10px] font-bold uppercase tracking-wide text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-950/40 px-1.5 py-0.5 rounded ml-auto">
          DROP
        </span>
      )}
      <Check className={cn("h-4 w-4 text-green-500 shrink-0", setType === "normal" && "ml-auto")} />
    </button>
  );
}

/* ================================================================
   Active Set Row — mobile-first input layout
   Inputs use flex instead of hardcoded widths so they adapt to
   any screen width from 280px to 430px+.
   ================================================================ */

export function ActiveSetRow({
  setNumber,
  sessionId,
  exerciseId,
  exerciseName,
  target,
  previousSet,
  lastLoggedWeight,
  lastLoggedRir,
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
  lastLoggedRir: number | null | undefined;
  defaultSetType: SetType;
  onSetLogged: (set: LoggedSet) => void;
}) {
  const prefillWeight = lastLoggedWeight ?? previousSet?.weight;
  const [weight, setWeight] = useState(
    prefillWeight ? prefillWeight.toString() : ""
  );
  const [reps, setReps] = useState("");
  const prefillRir = lastLoggedRir ?? previousSet?.rir ?? target.rirTarget;
  const [rir, setRir] = useState(prefillRir.toString());
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
    <div className="py-3 border-l-2 border-primary pl-3 -ml-0.5 space-y-2.5 bg-primary/[0.03] dark:bg-primary/[0.06] rounded-r-md">
      {/* Row 1: Set#, Weight, ×, Reps */}
      <div className="flex items-center gap-2">
        <span className="text-xs font-bold text-foreground w-5 tabular-nums shrink-0">
          {setNumber}
        </span>
        <Input
          type="number"
          inputMode="decimal"
          placeholder="lbs"
          value={weight}
          onChange={(e) => setWeight(e.target.value)}
          className="h-12 flex-1 min-w-0 text-center font-semibold tabular-nums text-lg"
        />
        <span className="text-muted-foreground text-sm shrink-0">&times;</span>
        <Input
          type="number"
          inputMode="numeric"
          placeholder={`${target.repRangeMin}-${target.repRangeMax}`}
          value={reps}
          onChange={(e) => setReps(e.target.value)}
          className="h-12 flex-[0.7] min-w-0 text-center font-semibold tabular-nums text-lg"
        />
      </div>

      {/* Row 2: RIR selector — full width, evenly spaced */}
      <div className="flex items-center gap-1.5 pl-7">
        <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mr-0.5 shrink-0">RIR</span>
        {[0, 1, 2, 3, 4].map((v) => (
          <button
            key={v}
            type="button"
            onClick={() => setRir(v.toString())}
            className={cn(
              "h-11 flex-1 rounded-md text-sm font-semibold transition-all active:scale-95",
              rir === v.toString()
                ? "bg-primary text-primary-foreground shadow-sm"
                : "bg-muted text-muted-foreground"
            )}
          >
            {v}
          </button>
        ))}
      </div>

      {/* Row 3: Log button — full width, prominent */}
      <div className="pl-7">
        <Button
          className="w-full h-12 font-semibold text-base"
          onClick={handleLog}
          disabled={isPending}
        >
          {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Log Set"}
        </Button>
      </div>

      {/* Row 4: Set type pills (collapsed by default for most users) */}
      <div className="flex items-center gap-1.5 pl-7">
        {(["normal", "myorep", "dropset"] as const).map((type) => (
          <button
            key={type}
            type="button"
            onClick={() => setSetType(type)}
            className={cn(
              "h-10 px-3 rounded-full text-xs font-semibold transition-all active:scale-95",
              setType === type
                ? type === "myorep"
                  ? "bg-violet-100 text-violet-700 dark:bg-violet-950/40 dark:text-violet-400"
                  : type === "dropset"
                    ? "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400"
                    : "bg-primary/10 text-primary"
                : "text-muted-foreground hover:bg-muted"
            )}
          >
            {type === "normal" ? "Normal" : type === "myorep" ? "Myo" : "Drop"}
          </button>
        ))}
      </div>

      {/* Previous set reference */}
      {previousSet && (
        <p className="text-xs text-muted-foreground pl-7 font-medium">
          <span className="opacity-70">Last:</span> {previousSet.weight} &times; {previousSet.reps}
          {previousSet.rir !== null ? ` @${previousSet.rir}` : ""}
          {previousSet.setType !== "normal" && (
            <span className="ml-1 opacity-60">
              ({previousSet.setType === "myorep" ? "Myo" : "Drop"})
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
    <div className="flex items-center gap-2 min-h-[44px] py-2.5 pl-3 -ml-0.5 border-l-2 border-dashed border-muted-foreground/30 rounded-r-md opacity-50">
      <span className="text-xs font-medium text-muted-foreground w-5 tabular-nums shrink-0">
        {setNumber}
      </span>
      <span className="text-xs text-muted-foreground">
        ~{previousSet?.weight ?? "?"} lbs &times; {target.repRangeMin}&ndash;{target.repRangeMax} @{target.rirTarget}
      </span>
      {previousSet && (
        <span className="text-[11px] text-muted-foreground/60 ml-auto tabular-nums font-medium">
          Last: {previousSet.weight}&times;{previousSet.reps}
        </span>
      )}
    </div>
  );
}
