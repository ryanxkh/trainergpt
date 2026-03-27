"use client";

import { useState, useEffect, useTransition, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Check, Timer, CheckCircle2, StickyNote, Zap, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { completeWorkout, getExerciseDetails, getPreviousPerformance } from "../actions";
import { MuscleGroupBadge } from "./muscle-group-badge";
import { RestTimerBanner } from "./rest-timer-banner";
import { CompletedSetRow, ActiveSetRow, UpcomingSetRow } from "./exercise-set-row";
import { ExerciseMenu } from "./exercise-menu";
import { ExerciseInfoSheet } from "./exercise-info-sheet";
import type {
  PrescribedExercise,
  LoggedSet,
  PreviousSetData,
  ExerciseDetail,
  MesocycleContext,
  SetType,
} from "./types";

type Props = {
  sessionId: number;
  sessionName: string;
  sessionDate: Date;
  prescribedExercises: PrescribedExercise[];
  initialSets: LoggedSet[];
  enableTimer: boolean;
  onComplete: () => void;
  mesocycleContext: MesocycleContext | null;
  exerciseDetails: Record<number, ExerciseDetail>;
  previousPerformance: Record<number, PreviousSetData[]>;
  isDeload?: boolean;
};

export default function PrescribedWorkout({
  sessionId,
  sessionName,
  sessionDate,
  prescribedExercises,
  initialSets,
  enableTimer,
  onComplete,
  mesocycleContext,
  exerciseDetails,
  previousPerformance,
  isDeload,
}: Props) {
  const [exercises, setExercises] = useState(prescribedExercises);
  const [exerciseDetailsState, setExerciseDetailsState] = useState(exerciseDetails);
  const [previousPerformanceState, setPreviousPerformanceState] = useState(previousPerformance);
  const [loggedSets, setLoggedSets] = useState<LoggedSet[]>(initialSets);
  const [postNotes, setPostNotes] = useState("");
  const [isPending, startTransition] = useTransition();
  const [elapsed, setElapsed] = useState("");
  const [restTimer, setRestTimer] = useState<number | null>(null);
  const [restDisplay, setRestDisplay] = useState("");
  const [skippedExercises, setSkippedExercises] = useState<Set<number>>(
    new Set()
  );
  const [extraSets, setExtraSets] = useState<Record<number, number>>({});
  const [exerciseNotes, setExerciseNotes] = useState<Record<number, string>>(
    {}
  );

  // Offline backup — persist logged sets to localStorage in case of network loss
  useEffect(() => {
    if (loggedSets.length > 0) {
      try {
        localStorage.setItem(
          `session-${sessionId}-sets`,
          JSON.stringify(loggedSets)
        );
      } catch { /* localStorage full or unavailable */ }
    }
  }, [loggedSets, sessionId]);

  // Restore from backup on mount if server has fewer sets (network failure recovery)
  useEffect(() => {
    try {
      const backup = localStorage.getItem(`session-${sessionId}-sets`);
      if (backup) {
        const saved = JSON.parse(backup) as LoggedSet[];
        if (saved.length > initialSets.length) {
          setLoggedSets(saved);
        } else {
          // Server is up to date — clean up backup
          localStorage.removeItem(`session-${sessionId}-sets`);
        }
      }
    } catch { /* parse error or unavailable */ }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  // Duration timer
  useEffect(() => {
    const start = new Date(sessionDate).getTime();
    const tick = () => {
      const diff = Math.floor((Date.now() - start) / 1000);
      const mins = Math.floor(diff / 60);
      const secs = diff % 60;
      setElapsed(`${mins}:${secs.toString().padStart(2, "0")}`);
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [sessionDate]);

  // Rest timer countdown
  useEffect(() => {
    if (restTimer === null || !enableTimer) return;
    if (restTimer <= 0) {
      setRestDisplay("GO");
      const timeout = setTimeout(() => {
        setRestTimer(null);
        setRestDisplay("");
      }, 3000);
      return () => clearTimeout(timeout);
    }
    setRestDisplay(
      `${Math.floor(restTimer / 60)}:${(restTimer % 60).toString().padStart(2, "0")}`
    );
    const interval = setInterval(() => {
      setRestTimer((prev) => (prev !== null ? prev - 1 : null));
    }, 1000);
    return () => clearInterval(interval);
  }, [restTimer, enableTimer]);

  const setsForExercise = useCallback(
    (exerciseId: number) =>
      loggedSets.filter((s) => s.exerciseId === exerciseId),
    [loggedSets]
  );

  const handleReplace = async (oldId: number, newId: number, newName: string) => {
    // Update prescription state
    setExercises((prev) =>
      prev.map((ex) =>
        ex.exerciseId === oldId
          ? { ...ex, exerciseId: newId, exerciseName: newName }
          : ex
      )
    );
    // Clear logged sets for old exercise
    setLoggedSets((prev) => prev.filter((s) => s.exerciseId !== oldId));
    // Fetch new exercise details + previous performance in parallel
    const [newDetails, newPrevious] = await Promise.all([
      getExerciseDetails([newId]),
      getPreviousPerformance([newId], sessionId),
    ]);
    setExerciseDetailsState((prev) => ({ ...prev, ...newDetails }));
    setPreviousPerformanceState((prev) => ({ ...prev, ...newPrevious }));
  };

  const totalLogged = loggedSets.length;
  const totalTarget = exercises.reduce(
    (sum, e) => sum + e.targetSets + (extraSets[e.exerciseId] || 0),
    0
  );
  const progress = totalTarget > 0 ? (totalLogged / totalTarget) * 100 : 0;

  const handleComplete = () => {
    // Combine post-workout notes with any exercise-specific notes
    const allNotes = [
      postNotes,
      ...Object.entries(exerciseNotes)
        .filter(([, note]) => note.trim())
        .map(([id, note]) => {
          const ex = exercises.find(
            (e) => e.exerciseId === parseInt(id)
          );
          return `${ex?.exerciseName ?? "Exercise"}: ${note}`;
        }),
    ]
      .filter(Boolean)
      .join("\n");

    const durationMinutes = Math.round(
      (Date.now() - new Date(sessionDate).getTime()) / 60000
    );
    startTransition(async () => {
      const result = await completeWorkout(sessionId, {
        postNotes: allNotes || undefined,
        durationMinutes,
      });
      if (result.success) {
        try { localStorage.removeItem(`session-${sessionId}-sets`); } catch {}
        toast.success(
          `Workout complete! ${totalLogged} sets in ${durationMinutes} min`
        );
        onComplete();
      } else {
        toast.error(result.error);
      }
    });
  };

  const dismissRest = () => {
    setRestTimer(null);
    setRestDisplay("");
  };

  return (
    <div className="space-y-3">
      {/* ── Header ──────────────────────────────────────────── */}
      <div className="space-y-2">
        {mesocycleContext && (
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">
            {mesocycleContext.name} &mdash; Week{" "}
            {mesocycleContext.currentWeek}
            {mesocycleContext.totalWeeks
              ? ` / ${mesocycleContext.totalWeeks}`
              : ""}
          </p>
        )}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <h1 className="text-lg font-bold tracking-tight leading-tight truncate">
              {sessionName}
            </h1>
            {isDeload && (
              <Badge variant="outline" className="shrink-0 text-amber-600 border-amber-300 dark:text-amber-400 dark:border-amber-700">
                <Zap className="mr-1 h-3 w-3" />
                Deload
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <div className="flex items-center gap-1 rounded-md bg-muted/60 px-2 py-1">
              <Timer className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-sm font-mono font-medium tabular-nums">
                {elapsed}
              </span>
            </div>
            <span className="text-sm font-bold tabular-nums">
              {totalLogged}
              <span className="text-muted-foreground font-normal">
                /{totalTarget}
              </span>
            </span>
          </div>
        </div>

        {/* Progress bar */}
        <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
          <div
            className="h-full rounded-full bg-primary transition-all duration-500 ease-out"
            style={{ width: `${Math.min(progress, 100)}%` }}
          />
        </div>
      </div>

      {/* ── Deload Note ─────────────────────────────────────── */}
      {isDeload && (
        <p className="text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/20 rounded-md px-3 py-2">
          Deload week — reduced volume for recovery. Same exercises, fewer sets.
        </p>
      )}

      {/* ── Rest Timer Banner ───────────────────────────────── */}
      {enableTimer && restTimer !== null && (
        <RestTimerBanner
          restTimer={restTimer}
          restDisplay={restDisplay}
          onDismiss={dismissRest}
        />
      )}

      {/* ── Exercise Cards ──────────────────────────────────── */}
      {exercises.map((exercise) => {
        const logged = setsForExercise(exercise.exerciseId);
        const detail = exerciseDetailsState[exercise.exerciseId];
        const previous = previousPerformanceState[exercise.exerciseId];
        const totalSetsForExercise =
          exercise.targetSets + (extraSets[exercise.exerciseId] || 0);
        const isComplete =
          logged.length >= totalSetsForExercise ||
          skippedExercises.has(exercise.exerciseId);

        // Compute last logged weight/RIR for this exercise in the current session
        const lastLoggedWeight =
          logged.length > 0 ? logged[logged.length - 1].weight : undefined;
        const lastLoggedRir =
          logged.length > 0 ? logged[logged.length - 1].rir : undefined;

        return (
          <ExerciseCard
            key={exercise.exerciseId}
            exercise={exercise}
            sessionId={sessionId}
            loggedSets={logged}
            totalSets={totalSetsForExercise}
            isComplete={isComplete}
            isDeload={isDeload}
            detail={detail}
            previousSets={previous}
            lastLoggedWeight={lastLoggedWeight}
            lastLoggedRir={lastLoggedRir}
            excludeExerciseIds={exercises.map((e) => e.exerciseId)}
            notes={exerciseNotes[exercise.exerciseId] ?? ""}
            onNotesChange={(val) =>
              setExerciseNotes((prev) => ({
                ...prev,
                [exercise.exerciseId]: val,
              }))
            }
            onSetLogged={(newSet) => {
              setLoggedSets((prev) => [...prev, newSet]);
              if (enableTimer) {
                setRestTimer(exercise.restSeconds);
              }
            }}
            onSetUpdated={(setId, updated) => {
              setLoggedSets((prev) =>
                prev.map((s) =>
                  s.id === setId ? { ...s, ...updated } : s
                )
              );
            }}
            onAddSet={() =>
              setExtraSets((prev) => ({
                ...prev,
                [exercise.exerciseId]:
                  (prev[exercise.exerciseId] || 0) + 1,
              }))
            }
            onSkipRemaining={() =>
              setSkippedExercises((prev) => {
                const next = new Set(prev);
                next.add(exercise.exerciseId);
                return next;
              })
            }
            onReplace={(newId, newName) =>
              handleReplace(exercise.exerciseId, newId, newName)
            }
          />
        );
      })}

      {/* ── Complete Workout ────────────────────────────────── */}
      <div className="rounded-lg border bg-card p-4 space-y-4">
        <Textarea
          placeholder="Post-workout notes — pumps, fatigue, joint issues..."
          value={postNotes}
          onChange={(e) => setPostNotes(e.target.value)}
          className="min-h-[72px] resize-none text-sm"
        />
        <Button
          size="lg"
          className={cn(
            "w-full h-12 font-semibold text-base transition-all",
            totalLogged > 0 && totalLogged >= totalTarget && "shadow-md"
          )}
          onClick={handleComplete}
          disabled={isPending || totalLogged === 0}
        >
          {isPending ? (
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          ) : (
            <CheckCircle2 className="mr-2 h-5 w-5" />
          )}
          {isPending
            ? "Saving..."
            : `Complete Workout (${totalLogged} sets)`}
        </Button>
      </div>
    </div>
  );
}

/* ================================================================
   Exercise Card
   ================================================================ */

function ExerciseCard({
  exercise,
  sessionId,
  loggedSets,
  totalSets,
  isComplete,
  isDeload,
  detail,
  previousSets,
  lastLoggedWeight,
  lastLoggedRir,
  excludeExerciseIds,
  notes,
  onNotesChange,
  onSetLogged,
  onSetUpdated,
  onAddSet,
  onSkipRemaining,
  onReplace,
}: {
  exercise: PrescribedExercise;
  sessionId: number;
  loggedSets: LoggedSet[];
  totalSets: number;
  isComplete: boolean;
  isDeload?: boolean;
  detail: ExerciseDetail | undefined;
  previousSets: PreviousSetData[] | undefined;
  lastLoggedWeight: number | undefined;
  lastLoggedRir: number | null | undefined;
  excludeExerciseIds: number[];
  notes: string;
  onNotesChange: (val: string) => void;
  onSetLogged: (set: LoggedSet) => void;
  onSetUpdated: (setId: number, updated: { weight: number; reps: number; rir: number | null }) => void;
  onAddSet: () => void;
  onSkipRemaining: () => void;
  onReplace: (newId: number, newName: string) => void;
}) {
  const [showNotes, setShowNotes] = useState(false);
  const notesRef = useCallback((node: HTMLDivElement | null) => {
    if (node) node.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, []);
  const completedCount = loggedSets.length;
  const primaryMuscles = detail?.muscleGroups.primary ?? [];
  const equipment = detail?.equipment ?? "";

  return (
    <div
      className={cn(
        "rounded-lg border bg-card overflow-hidden transition-all duration-300",
        isComplete && "opacity-60 saturate-50",
        isDeload && !isComplete && "border-amber-200 dark:border-amber-900/50 bg-amber-50/30 dark:bg-amber-950/10"
      )}
    >
      {/* Card header */}
      <div className="px-4 pt-3 pb-2 space-y-1.5">
        {/* Top row: set counter + action buttons */}
        <div className="flex items-center justify-between">
          <span
            className={cn(
              "text-xs font-semibold tabular-nums px-2.5 py-1 rounded-full transition-colors",
              isComplete
                ? "bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-400"
                : completedCount > 0
                  ? "bg-primary/10 text-primary"
                  : "bg-muted text-muted-foreground"
            )}
          >
            {isComplete ? (
              <Check className="inline h-3 w-3 mr-0.5 -mt-px" />
            ) : null}
            {completedCount}/{totalSets}
          </span>
          <div className="flex items-center gap-0.5">
            <button
              type="button"
              onClick={() => setShowNotes((prev) => !prev)}
              className={cn(
                "h-11 w-11 inline-flex items-center justify-center rounded-md transition-colors active:scale-95 relative",
                showNotes
                  ? "text-primary bg-primary/10"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              )}
            >
              <StickyNote className="h-4 w-4" />
              {notes.trim() && !showNotes && (
                <span className="absolute top-1.5 right-1.5 h-1.5 w-1.5 rounded-full bg-primary" />
              )}
            </button>
            {detail && (
              <ExerciseInfoSheet
                exerciseName={exercise.exerciseName}
                detail={detail}
              />
            )}
            <ExerciseMenu
              exerciseName={exercise.exerciseName}
              exerciseId={exercise.exerciseId}
              sessionId={sessionId}
              isComplete={isComplete}
              excludeExerciseIds={excludeExerciseIds}
              onAddSet={onAddSet}
              onSkipRemaining={onSkipRemaining}
              onToggleNotes={() => setShowNotes((prev) => !prev)}
              onReplace={onReplace}
            />
          </div>
        </div>
        {/* Exercise name + metadata — full width, never truncated by buttons */}
        <div className="space-y-0.5">
          {primaryMuscles.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {primaryMuscles.map((mg) => (
                <MuscleGroupBadge key={mg} group={mg} />
              ))}
            </div>
          )}
          <h3 className="font-semibold text-base leading-tight truncate">
            {exercise.exerciseName}
          </h3>
          {equipment && (
            <p className="text-xs uppercase tracking-wider text-muted-foreground/60 font-medium">
              {equipment.replace(/_/g, " ")}
            </p>
          )}
        </div>
      </div>

      {/* Set rows */}
      <div className="px-4 pb-3 space-y-px">
        {Array.from({ length: totalSets }, (_, i) => i + 1).map(
          (setNumber) => {
            const logged = loggedSets.find((s) => s.setNumber === setNumber);
            const prevSet = previousSets?.find(
              (p) => p.setNumber === setNumber
            );
            const isActive =
              !logged && setNumber === completedCount + 1 && !isComplete;

            // Determine default set type from previous performance
            const defaultSetType: SetType =
              prevSet?.setType ?? "normal";

            if (logged) {
              return (
                <CompletedSetRow
                  key={setNumber}
                  setId={logged.id}
                  setNumber={setNumber}
                  weight={logged.weight}
                  reps={logged.reps}
                  rir={logged.rir}
                  setType={logged.setType}
                  onSetUpdated={(updated) => onSetUpdated(logged.id, updated)}
                />
              );
            }

            if (isActive) {
              return (
                <ActiveSetRow
                  key={setNumber}
                  setNumber={setNumber}
                  sessionId={sessionId}
                  exerciseId={exercise.exerciseId}
                  exerciseName={exercise.exerciseName}
                  target={exercise}
                  previousSet={prevSet}
                  lastLoggedWeight={lastLoggedWeight}
                  lastLoggedRir={lastLoggedRir}
                  defaultSetType={defaultSetType}
                  onSetLogged={onSetLogged}
                />
              );
            }

            return (
              <UpcomingSetRow
                key={setNumber}
                setNumber={setNumber}
                target={exercise}
                previousSet={prevSet}
              />
            );
          }
        )}
      </div>

      {/* Exercise notes */}
      {showNotes && (
        <div ref={notesRef} className="px-4 pb-3 border-t border-dashed">
          <Textarea
            placeholder="Notes for this exercise..."
            value={notes}
            onChange={(e) => onNotesChange(e.target.value)}
            className="min-h-[56px] resize-none text-sm mt-3"
          />
        </div>
      )}
    </div>
  );
}
