"use client";

import { useState, useEffect, useTransition } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Check, Timer, CheckCircle2 } from "lucide-react";
import { logSet, completeWorkout } from "../actions";

type PrescribedExercise = {
  exerciseId: number;
  exerciseName: string;
  targetSets: number;
  repRangeMin: number;
  repRangeMax: number;
  rirTarget: number;
  restSeconds: number;
};

type LoggedSet = {
  id: number;
  exerciseId: number;
  setNumber: number;
  weight: number;
  reps: number;
  rir: number | null;
};

type Props = {
  sessionId: number;
  sessionName: string;
  sessionDate: Date;
  prescribedExercises: PrescribedExercise[];
  initialSets: LoggedSet[];
  enableTimer: boolean;
  onComplete: () => void;
};

export default function PrescribedWorkout({
  sessionId,
  sessionName,
  sessionDate,
  prescribedExercises,
  initialSets,
  enableTimer,
  onComplete,
}: Props) {
  const [loggedSets, setLoggedSets] = useState<LoggedSet[]>(initialSets);
  const [postNotes, setPostNotes] = useState("");
  const [isPending, startTransition] = useTransition();
  const [elapsed, setElapsed] = useState("");
  const [restTimer, setRestTimer] = useState<number | null>(null);
  const [restDisplay, setRestDisplay] = useState("");

  // Duration timer
  useEffect(() => {
    const start = new Date(sessionDate).getTime();
    const interval = setInterval(() => {
      const diff = Math.floor((Date.now() - start) / 1000);
      const mins = Math.floor(diff / 60);
      const secs = diff % 60;
      setElapsed(`${mins}:${secs.toString().padStart(2, "0")}`);
    }, 1000);
    return () => clearInterval(interval);
  }, [sessionDate]);

  // Rest timer countdown
  useEffect(() => {
    if (restTimer === null || !enableTimer) return;
    if (restTimer <= 0) {
      setRestDisplay("REST DONE");
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

  // Count logged sets per exercise
  const setsByExercise = loggedSets.reduce(
    (acc, s) => {
      acc[s.exerciseId] = (acc[s.exerciseId] || 0) + 1;
      return acc;
    },
    {} as Record<number, number>
  );

  const totalLogged = loggedSets.length;
  const totalTarget = prescribedExercises.reduce(
    (sum, e) => sum + e.targetSets,
    0
  );

  const handleComplete = () => {
    const durationMinutes = Math.round(
      (Date.now() - new Date(sessionDate).getTime()) / 60000
    );
    startTransition(async () => {
      const result = await completeWorkout(sessionId, {
        postNotes: postNotes || undefined,
        durationMinutes,
      });
      if (result.success) {
        toast.success(
          `Workout complete! ${totalLogged} sets in ${durationMinutes} minutes`
        );
        onComplete();
      } else {
        toast.error(result.error);
      }
    });
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{sessionName}</h1>
          <div className="flex items-center gap-2 mt-1 text-muted-foreground text-sm">
            <Timer className="h-4 w-4" />
            <span className="font-mono">{elapsed}</span>
            <Badge variant="secondary">
              {totalLogged}/{totalTarget} sets
            </Badge>
          </div>
        </div>
      </div>

      {/* Rest Timer */}
      {enableTimer && restTimer !== null && (
        <Card
          className={
            restTimer <= 0
              ? "border-green-500 bg-green-50 dark:bg-green-950/20"
              : "border-blue-500 bg-blue-50 dark:bg-blue-950/20"
          }
        >
          <CardContent className="flex items-center justify-between py-3">
            <div className="flex items-center gap-3">
              <Timer className="h-5 w-5" />
              <span className="font-semibold">Rest</span>
            </div>
            <span className="text-2xl font-mono font-bold">{restDisplay}</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setRestTimer(null);
                setRestDisplay("");
              }}
            >
              Skip
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Prescribed Exercises */}
      {prescribedExercises.map((exercise) => (
        <ExerciseCard
          key={exercise.exerciseId}
          exercise={exercise}
          sessionId={sessionId}
          completedSets={setsByExercise[exercise.exerciseId] || 0}
          loggedSets={loggedSets.filter(
            (s) => s.exerciseId === exercise.exerciseId
          )}
          onSetLogged={(newSet) => {
            setLoggedSets((prev) => [...prev, newSet]);
            if (enableTimer) {
              setRestTimer(exercise.restSeconds);
            }
          }}
        />
      ))}

      {/* Complete Workout */}
      <Card>
        <CardContent className="space-y-4 pt-6">
          <div>
            <Label htmlFor="post-notes">Post-Workout Notes (optional)</Label>
            <Textarea
              id="post-notes"
              placeholder="How did it go? Pumps, fatigue, joint issues..."
              value={postNotes}
              onChange={(e) => setPostNotes(e.target.value)}
            />
          </div>
          <Button
            size="lg"
            className="w-full"
            onClick={handleComplete}
            disabled={isPending || totalLogged === 0}
          >
            <CheckCircle2 className="mr-2 h-5 w-5" />
            Complete Workout ({totalLogged} sets)
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Exercise Card ──────────────────────────────────────────────────

function ExerciseCard({
  exercise,
  sessionId,
  completedSets,
  loggedSets,
  onSetLogged,
}: {
  exercise: PrescribedExercise;
  sessionId: number;
  completedSets: number;
  loggedSets: LoggedSet[];
  onSetLogged: (set: LoggedSet) => void;
}) {
  const [weight, setWeight] = useState("");
  const [reps, setReps] = useState("");
  const [rir, setRir] = useState(exercise.rirTarget.toString());
  const [isPending, startTransition] = useTransition();

  const isDone = completedSets >= exercise.targetSets;
  const nextSet = completedSets + 1;

  const handleLog = () => {
    if (!weight || !reps) {
      toast.error("Fill in weight and reps");
      return;
    }

    startTransition(async () => {
      const result = await logSet(sessionId, exercise.exerciseId, {
        setNumber: nextSet,
        weight: parseFloat(weight),
        reps: parseInt(reps),
        rir: rir ? parseInt(rir) : undefined,
      });

      if (result.success) {
        onSetLogged({
          id: result.data.id,
          exerciseId: exercise.exerciseId,
          setNumber: nextSet,
          weight: parseFloat(weight),
          reps: parseInt(reps),
          rir: rir ? parseInt(rir) : null,
        });
        toast.success(
          `Set ${nextSet}: ${exercise.exerciseName} — ${weight}lbs x ${reps} @ ${rir} RIR`
        );
      } else {
        toast.error(result.error);
      }
    });
  };

  return (
    <Card className={isDone ? "opacity-60" : ""}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base">{exercise.exerciseName}</CardTitle>
            <p className="text-sm text-muted-foreground">
              {exercise.targetSets} sets x {exercise.repRangeMin}-
              {exercise.repRangeMax} reps @ {exercise.rirTarget} RIR
            </p>
          </div>
          <Badge variant={isDone ? "default" : "secondary"}>
            {isDone ? (
              <Check className="h-3 w-3 mr-1" />
            ) : null}
            {completedSets}/{exercise.targetSets}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Logged sets summary */}
        {loggedSets.length > 0 && (
          <div className="space-y-1">
            {loggedSets.map((set) => (
              <div
                key={set.id}
                className="flex items-center gap-2 text-sm text-muted-foreground"
              >
                <Check className="h-3 w-3 text-green-500" />
                <span>
                  Set {set.setNumber}: {set.weight}lbs x {set.reps}
                  {set.rir !== null ? ` @ ${set.rir} RIR` : ""}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Log next set form */}
        {!isDone && (
          <div className="flex items-end gap-2">
            <div className="flex-1">
              <Label className="text-xs">Weight</Label>
              <Input
                type="number"
                placeholder="lbs"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                className="h-9"
              />
            </div>
            <div className="flex-1">
              <Label className="text-xs">Reps</Label>
              <Input
                type="number"
                placeholder={`${exercise.repRangeMin}-${exercise.repRangeMax}`}
                value={reps}
                onChange={(e) => setReps(e.target.value)}
                className="h-9"
              />
            </div>
            <div className="w-20">
              <Label className="text-xs">RIR</Label>
              <Select value={rir} onValueChange={setRir}>
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[0, 1, 2, 3, 4, 5].map((v) => (
                    <SelectItem key={v} value={v.toString()}>
                      {v}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              size="sm"
              className="h-9"
              onClick={handleLog}
              disabled={isPending}
            >
              Log
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
