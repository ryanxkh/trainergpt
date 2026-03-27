"use client";

import {
  useState,
  useEffect,
  useOptimistic,
  useTransition,
  useCallback,
} from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { StatusDot } from "@/components/ui/status-dot";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  Play,
  Plus,
  Trash2,
  CheckCircle2,
  Timer,
  Search,
  MessageSquare,
  AlertTriangle,
  Loader2,
} from "lucide-react";
import Link from "next/link";
import {
  startWorkout,
  logSet,
  deleteSet,
  completeWorkout,
  deleteSession,
  getExerciseList,
  getActiveSession,
  getPreviousPerformance,
  getExerciseDetails,
  getActiveMesocycleContext,
} from "../actions";
import {
  getPlannedSessions,
  startPlannedSession,
} from "@/app/(app)/program/actions";
import PrescribedWorkout from "./prescribed-workout";
import type {
  PreviousSetData,
  ExerciseDetail,
  MesocycleContext,
} from "./types";

type Exercise = {
  id: number;
  name: string;
  muscleGroups: { primary: string[]; secondary: string[] };
  movementPattern: string;
  equipment: string;
  sfrRating: string | null;
  repRangeOptimal: [number, number] | null;
  defaultRestSeconds: number | null;
};

type LoggedSet = {
  id: number;
  exerciseId: number;
  exercise: Exercise;
  setNumber: number;
  weight: number;
  reps: number;
  rir: number | null;
  rpe: number | null;
  restSeconds: number | null;
};

type PrescribedExercise = {
  exerciseId: number;
  exerciseName: string;
  targetSets: number;
  repRangeMin: number;
  repRangeMax: number;
  rirTarget: number;
  restSeconds: number;
};

type Session = {
  id: number;
  sessionName: string;
  date: Date;
  preReadiness: {
    energy: number;
    motivation: number;
    soreness: number;
    sleepQuality: number;
    sleepHours: number;
  } | null;
  prescribedExercises: PrescribedExercise[] | null;
  durationMinutes: number | null;
  isDeload: boolean | null;
  sets: LoggedSet[];
};

// ─── Types for planned sessions ─────────────────────────────────────

type PlannedSessionData = {
  mesocycleName: string;
  currentWeek: number;
  totalWeeks: number;
  sessions: {
    id: number;
    sessionName: string;
    status: string;
    dayNumber: number | null;
    isDeload: boolean | null;
    exerciseCount: number;
    exercisePreview: string[];
  }[];
} | null;

// ─── Stale Session Banner ────────────────────────────────────────────

function StaleSessionBanner({
  sessionDate,
  onAbandon,
}: {
  sessionDate: Date;
  onAbandon: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const sessionDay = new Date(sessionDate);
  sessionDay.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (sessionDay >= today) return null;

  const daysAgo = Math.round(
    (today.getTime() - sessionDay.getTime()) / (1000 * 60 * 60 * 24)
  );

  return (
    <div className="flex items-center gap-3 rounded-xl border border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/20 px-4 py-3 mb-4">
      <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
      <p className="text-sm text-amber-800 dark:text-amber-300 flex-1">
        This session was started {daysAgo === 1 ? "yesterday" : `${daysAgo} days ago`}. You can continue or discard it.
      </p>
      <Button
        variant="outline"
        size="sm"
        className="border-amber-300 text-amber-700 hover:bg-amber-100 dark:border-amber-700 dark:text-amber-400 dark:hover:bg-amber-950/40"
        disabled={isPending}
        onClick={() => {
          startTransition(async () => {
            onAbandon();
          });
        }}
      >
        {isPending ? "..." : "Discard"}
      </Button>
    </div>
  );
}

// ─── No Workout State ───────────────────────────────────────────────

function NoWorkoutState() {
  return (
    <div className="flex flex-col items-center justify-center py-16 space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">No workout for today</h1>
        <p className="text-muted-foreground max-w-md">
          Ask your coach to prescribe a workout, or start a manual session.
        </p>
      </div>
      <Link href="/coach">
        <Button size="lg">
          <MessageSquare className="mr-2 h-5 w-5" />
          Ask Coach for a Workout
        </Button>
      </Link>
    </div>
  );
}

// ─── Planned Sessions List ───────────────────────────────────────────

const DAY_LABELS = ["", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function PlannedSessionList({
  data,
  onSessionStarted,
}: {
  data: NonNullable<PlannedSessionData>;
  onSessionStarted: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [startingId, setStartingId] = useState<number | null>(null);

  // Find the best session to suggest (first planned one by day number)
  const nextPlanned = data.sessions.find((s) => s.status === "planned");

  const handleStart = (sessionId: number) => {
    setStartingId(sessionId);
    startTransition(async () => {
      const result = await startPlannedSession(sessionId);
      if (result.success) {
        toast.success("Session started!");
        onSessionStarted();
      } else {
        toast.error(result.error);
        setStartingId(null);
      }
    });
  };

  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {data.mesocycleName} &mdash; Week {data.currentWeek} / {data.totalWeeks}
        </p>
        <h1 className="text-2xl font-semibold tracking-tight">This Week</h1>
      </div>

      <div className="space-y-2.5">
        {data.sessions.map((session) => {
          const dayLabel = session.dayNumber ? DAY_LABELS[session.dayNumber] : "";
          const isNext = nextPlanned?.id === session.id;
          const isStartable = session.status === "planned";
          const isDone = session.status === "completed" || session.status === "abandoned";
          const isStarting = startingId === session.id;

          return (
            <Card
              key={session.id}
              className={cn(
                "transition-all",
                isDone && "opacity-50",
                isNext && "border-primary/50 shadow-sm",
              )}
            >
              <CardContent className="flex items-center justify-between gap-3 p-4">
                <div className="space-y-1 min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    {dayLabel && (
                      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        {dayLabel}
                      </span>
                    )}
                    <span className="font-semibold text-sm">{session.sessionName}</span>
                    {session.isDeload && (
                      <Badge variant="outline" className="text-amber-600 border-amber-300 dark:text-amber-400 dark:border-amber-700 text-[10px] px-1.5 py-0">
                        Deload
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground truncate">
                    {session.exercisePreview.slice(0, 3).join(", ")}
                    {session.exerciseCount > 3 && ` +${session.exerciseCount - 3}`}
                    <span className="mx-1.5 opacity-50">&middot;</span>
                    {session.exerciseCount} exercises
                  </p>
                </div>
                <div className="shrink-0">
                  {isDone && (
                    <StatusDot
                      state={session.status === "abandoned" ? "abandoned" : "completed"}
                      label={session.status === "abandoned" ? "skipped" : "done"}
                    />
                  )}
                  {isStartable && (
                    <Button
                      size="sm"
                      onClick={() => handleStart(session.id)}
                      disabled={isPending}
                      variant={isNext ? "default" : "outline"}
                      className={cn("min-h-9 font-semibold", isNext && "shadow-sm")}
                    >
                      {isStarting ? (
                        <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                      ) : (
                        <Play className="mr-1 h-3 w-3" />
                      )}
                      {isStarting ? "Starting..." : "Start"}
                    </Button>
                  )}
                  {session.status === "active" && (
                    <StatusDot state="active" label="active" />
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

// ─── Readiness Form ──────────────────────────────────────────────────

function ReadinessForm({
  onStart,
}: {
  onStart: (name: string, readiness: Session["preReadiness"]) => void;
}) {
  const [sessionName, setSessionName] = useState("");
  const [energy, setEnergy] = useState(7);
  const [motivation, setMotivation] = useState(7);
  const [soreness, setSoreness] = useState(3);
  const [sleepQuality, setSleepQuality] = useState(7);
  const [sleepHours, setSleepHours] = useState(7);
  const [isPending, startTransition] = useTransition();

  const handleStart = () => {
    if (!sessionName.trim()) {
      toast.error("Enter a session name");
      return;
    }
    startTransition(async () => {
      onStart(sessionName, {
        energy,
        motivation,
        soreness,
        sleepQuality,
        sleepHours,
      });
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Start Workout</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Session Info</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="session-name">Session Name</Label>
            <Input
              id="session-name"
              placeholder="e.g. Upper Body A, Push Day, Legs..."
              value={sessionName}
              onChange={(e) => setSessionName(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Pre-Workout Readiness</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <ReadinessSlider
            label="Energy"
            value={energy}
            onChange={setEnergy}
          />
          <ReadinessSlider
            label="Motivation"
            value={motivation}
            onChange={setMotivation}
          />
          <ReadinessSlider
            label="Soreness"
            value={soreness}
            onChange={setSoreness}
            low="None"
            high="Very sore"
          />
          <ReadinessSlider
            label="Sleep Quality"
            value={sleepQuality}
            onChange={setSleepQuality}
          />
          <div>
            <Label>Sleep Hours: {sleepHours}h</Label>
            <Slider
              min={3}
              max={12}
              step={0.5}
              value={[sleepHours]}
              onValueChange={([v]) => setSleepHours(v)}
              className="mt-2"
            />
          </div>
        </CardContent>
      </Card>

      <Button
        size="lg"
        className="w-full"
        onClick={handleStart}
        disabled={isPending}
      >
        <Play className="mr-2 h-5 w-5" />
        {isPending ? "Starting..." : "Start Workout"}
      </Button>
    </div>
  );
}

function ReadinessSlider({
  label,
  value,
  onChange,
  low = "Low",
  high = "High",
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  low?: string;
  high?: string;
}) {
  return (
    <div>
      <div className="flex justify-between">
        <Label>
          {label}: {value}/10
        </Label>
      </div>
      <Slider
        min={1}
        max={10}
        step={1}
        value={[value]}
        onValueChange={([v]) => onChange(v)}
        className="mt-2"
      />
      <div className="flex justify-between text-xs text-muted-foreground mt-1">
        <span>{low}</span>
        <span>{high}</span>
      </div>
    </div>
  );
}

// ─── Active Workout (Manual Mode) ───────────────────────────────────

function ActiveWorkout({
  session,
  exerciseList,
  onComplete,
  enableTimer,
}: {
  session: Session;
  exerciseList: Exercise[];
  onComplete: () => void;
  enableTimer: boolean;
}) {
  const [sets, setOptimisticSets] = useOptimistic(
    session.sets,
    (
      state: LoggedSet[],
      newSet: LoggedSet | { type: "delete"; id: number }
    ) => {
      if ("type" in newSet && newSet.type === "delete") {
        return state.filter((s) => s.id !== newSet.id);
      }
      return [...state, newSet as LoggedSet];
    }
  );

  const [selectedExerciseId, setSelectedExerciseId] = useState<string>("");
  const [weight, setWeight] = useState("");
  const [reps, setReps] = useState("");
  const [rir, setRir] = useState("2");
  const [postNotes, setPostNotes] = useState("");
  const [exerciseSearch, setExerciseSearch] = useState("");
  const [isPending, startTransition] = useTransition();
  const [startTime] = useState(new Date(session.date));

  const [elapsed, setElapsed] = useState("");
  const [restTimer, setRestTimer] = useState<number | null>(null);
  const [restDisplay, setRestDisplay] = useState("");

  useEffect(() => {
    const interval = setInterval(() => {
      const diff = Math.floor((Date.now() - startTime.getTime()) / 1000);
      const mins = Math.floor(diff / 60);
      const secs = diff % 60;
      setElapsed(`${mins}:${secs.toString().padStart(2, "0")}`);
    }, 1000);
    return () => clearInterval(interval);
  }, [startTime]);

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

  const selectedExercise = exerciseList.find(
    (e) => e.id.toString() === selectedExerciseId
  );

  const setCountByExercise = sets.reduce(
    (acc, s) => {
      acc[s.exerciseId] = (acc[s.exerciseId] || 0) + 1;
      return acc;
    },
    {} as Record<number, number>
  );

  const nextSetNumber = selectedExercise
    ? (setCountByExercise[selectedExercise.id] || 0) + 1
    : 1;

  const filteredExercises = exerciseList.filter((e) =>
    e.name.toLowerCase().includes(exerciseSearch.toLowerCase())
  );

  const handleLogSet = () => {
    if (!selectedExerciseId || !weight || !reps) {
      toast.error("Fill in exercise, weight, and reps");
      return;
    }
    const exercise = exerciseList.find(
      (e) => e.id.toString() === selectedExerciseId
    )!;

    startTransition(async () => {
      const optimisticSet: LoggedSet = {
        id: Date.now(),
        exerciseId: exercise.id,
        exercise,
        setNumber: nextSetNumber,
        weight: parseFloat(weight),
        reps: parseInt(reps),
        rir: rir ? parseInt(rir) : null,
        rpe: null,
        restSeconds: null,
      };
      setOptimisticSets(optimisticSet);

      const result = await logSet(session.id, exercise.id, {
        setNumber: nextSetNumber,
        weight: parseFloat(weight),
        reps: parseInt(reps),
        rir: rir ? parseInt(rir) : undefined,
      });

      if (result.success) {
        toast.success(
          `Set ${nextSetNumber}: ${exercise.name} — ${weight}lbs x ${reps} @ ${rir} RIR`
        );
        if (enableTimer && exercise.defaultRestSeconds) {
          setRestTimer(exercise.defaultRestSeconds);
        }
      } else {
        toast.error(result.error);
      }
    });
  };

  const handleDeleteSet = (setId: number) => {
    startTransition(async () => {
      setOptimisticSets({ type: "delete", id: setId });
      const result = await deleteSet(setId);
      if (result.success) {
        toast.success("Set deleted");
      } else {
        toast.error(result.error);
      }
    });
  };

  const handleComplete = () => {
    const durationMinutes = Math.round(
      (Date.now() - startTime.getTime()) / 60000
    );
    startTransition(async () => {
      const result = await completeWorkout(session.id, {
        postNotes: postNotes || undefined,
        durationMinutes,
      });
      if (result.success) {
        toast.success(
          `Workout complete! ${sets.length} sets in ${durationMinutes} minutes`
        );
        onComplete();
      } else {
        toast.error(result.error);
      }
    });
  };

  const groupedSets = sets.reduce(
    (acc, s) => {
      const name = s.exercise.name;
      if (!acc[name]) acc[name] = [];
      acc[name].push(s);
      return acc;
    },
    {} as Record<string, LoggedSet[]>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{session.sessionName}</h1>
          <div className="flex items-center gap-2 mt-1 text-muted-foreground">
            <Timer className="h-4 w-4" />
            <span className="font-mono">{elapsed}</span>
            <Badge variant="secondary">{sets.length} sets</Badge>
          </div>
        </div>
      </div>

      {enableTimer && restTimer !== null && (
        <Card
          className={
            restTimer <= 0
              ? "border-green-500 bg-green-50 dark:bg-green-950/20"
              : "border-blue-500 bg-blue-50 dark:bg-blue-950/20"
          }
        >
          <CardContent className="flex items-center justify-between py-4">
            <div className="flex items-center gap-3">
              <Timer className="h-5 w-5" />
              <span className="font-semibold">Rest Timer</span>
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

      <Card>
        <CardHeader>
          <CardTitle>Log Set</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Exercise</Label>
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search exercises..."
                value={exerciseSearch}
                onChange={(e) => setExerciseSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select
              value={selectedExerciseId}
              onValueChange={setSelectedExerciseId}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select exercise" />
              </SelectTrigger>
              <SelectContent>
                <ScrollArea className="h-60">
                  {filteredExercises.map((ex) => (
                    <SelectItem key={ex.id} value={ex.id.toString()}>
                      <div className="flex items-center gap-2">
                        <span>{ex.name}</span>
                        <Badge variant="outline" className="text-xs">
                          {ex.muscleGroups.primary.join(", ")}
                        </Badge>
                      </div>
                    </SelectItem>
                  ))}
                </ScrollArea>
              </SelectContent>
            </Select>
            {selectedExercise && (
              <p className="text-xs text-muted-foreground">
                Optimal:{" "}
                {
                  (selectedExercise.repRangeOptimal as [number, number])?.[0]
                }
                -
                {
                  (selectedExercise.repRangeOptimal as [number, number])?.[1]
                }{" "}
                reps | SFR: {selectedExercise.sfrRating} | Set {nextSetNumber}
              </p>
            )}
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label htmlFor="weight">Weight (lbs)</Label>
              <Input
                id="weight"
                type="number"
                placeholder="135"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="reps">Reps</Label>
              <Input
                id="reps"
                type="number"
                placeholder="10"
                value={reps}
                onChange={(e) => setReps(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="rir">RIR</Label>
              <Select value={rir} onValueChange={setRir}>
                <SelectTrigger id="rir">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[0, 1, 2, 3, 4, 5].map((v) => (
                    <SelectItem key={v} value={v.toString()}>
                      {v} RIR
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button
            onClick={handleLogSet}
            disabled={isPending}
            className="w-full"
          >
            <Plus className="mr-2 h-4 w-4" />
            Log Set
          </Button>
        </CardContent>
      </Card>

      {Object.keys(groupedSets).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Logged Sets</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Object.entries(groupedSets).map(
                ([exerciseName, exerciseSetsArr]) => (
                  <div key={exerciseName}>
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="text-sm font-semibold">{exerciseName}</h3>
                      <Badge variant="secondary">
                        {exerciseSetsArr.length} sets
                      </Badge>
                    </div>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-16">Set</TableHead>
                          <TableHead>Weight</TableHead>
                          <TableHead>Reps</TableHead>
                          <TableHead>RIR</TableHead>
                          <TableHead className="w-12"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {exerciseSetsArr.map((set) => (
                          <TableRow key={set.id}>
                            <TableCell>{set.setNumber}</TableCell>
                            <TableCell>{set.weight} lbs</TableCell>
                            <TableCell>{set.reps}</TableCell>
                            <TableCell>{set.rir ?? "\u2014"}</TableCell>
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDeleteSet(set.id)}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                    <Separator className="mt-2" />
                  </div>
                )
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Finish Workout</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="post-notes">Post-Workout Notes (optional)</Label>
            <Textarea
              id="post-notes"
              placeholder="How did it go? Any joint pain, fatigue, pumps worth noting..."
              value={postNotes}
              onChange={(e) => setPostNotes(e.target.value)}
            />
          </div>
          <Button
            variant="default"
            size="lg"
            className="w-full"
            onClick={handleComplete}
            disabled={isPending || sets.length === 0}
          >
            <CheckCircle2 className="mr-2 h-5 w-5" />
            Complete Workout ({sets.length} sets)
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────

export default function WorkoutPage({
  enableTimer,
}: {
  enableTimer: boolean;
}) {
  const [session, setSession] = useState<Session | null>(null);
  const [exerciseList, setExerciseList] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [, startTransition] = useTransition();
  const [mesocycleContext, setMesocycleContext] =
    useState<MesocycleContext | null>(null);
  const [exerciseDetails, setExerciseDetails] = useState<
    Record<number, ExerciseDetail>
  >({});
  const [previousPerformance, setPreviousPerformance] = useState<
    Record<number, PreviousSetData[]>
  >({});
  const [plannedSessions, setPlannedSessions] = useState<PlannedSessionData>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    async function load() {
      const [exercises, activeSession, mesoCtx, planned] = await Promise.all([
        getExerciseList(),
        getActiveSession(),
        getActiveMesocycleContext(),
        getPlannedSessions(),
      ]);
      setExerciseList(exercises as Exercise[]);
      setMesocycleContext(mesoCtx);
      setPlannedSessions(planned);

      if (activeSession) {
        const sessionData = {
          ...activeSession,
          prescribedExercises:
            (activeSession as unknown as Session).prescribedExercises ?? null,
          sets: activeSession.sets.map((s) => ({
            ...s,
            exercise: s.exercise as Exercise,
          })),
        } as Session;
        setSession(sessionData);

        // Fetch exercise details and previous performance for prescribed workouts
        if (sessionData.prescribedExercises?.length) {
          const exerciseIds = sessionData.prescribedExercises.map(
            (e) => e.exerciseId
          );
          const [details, previous] = await Promise.all([
            getExerciseDetails(exerciseIds),
            getPreviousPerformance(exerciseIds, sessionData.id),
          ]);
          setExerciseDetails(details);
          setPreviousPerformance(previous);
        }
      } else {
        setSession(null);
      }
      setLoading(false);
    }
    load();
  }, [refreshKey]);

  const handleStart = useCallback(
    (name: string, readiness: Session["preReadiness"]) => {
      startTransition(async () => {
        const result = await startWorkout(name, readiness ?? undefined);
        if (result.success) {
          setSession({
            ...result.data,
            prescribedExercises: null,
            sets: [],
          } as Session);
          toast.success("Workout started!");
        } else {
          toast.error(result.error);
        }
      });
    },
    [startTransition]
  );

  const handleComplete = useCallback(() => {
    setSession(null);
  }, []);

  const handleDiscard = useCallback(async () => {
    if (!session) return;
    const result = await deleteSession(session.id);
    if (result.success) {
      toast.success("Session discarded");
      setSession(null);
      setRefreshKey((k) => k + 1);
      setLoading(true);
    } else {
      toast.error(result.error);
    }
  }, [session]);

  if (loading) {
    return (
      <div className="space-y-4">
        {/* Header skeleton */}
        <div className="space-y-3">
          <Skeleton className="h-3 w-44" />
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1.5">
              <Skeleton className="h-6 w-40" />
            </div>
            <div className="flex items-center gap-3">
              <Skeleton className="h-8 w-20 rounded-md" />
              <Skeleton className="h-5 w-14" />
            </div>
          </div>
          <Skeleton className="h-1.5 w-full rounded-full" />
        </div>
        {/* Exercise card skeletons */}
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="rounded-xl border bg-card p-4 space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div className="space-y-2 flex-1">
                <div className="flex gap-1.5">
                  <Skeleton className="h-5 w-14 rounded-full" />
                  <Skeleton className="h-5 w-12 rounded-full" />
                </div>
                <Skeleton className="h-5 w-36" />
                <Skeleton className="h-3 w-16" />
              </div>
              <Skeleton className="h-7 w-12 rounded-full" />
            </div>
            <div className="space-y-1.5">
              {[1, 2, 3].map((j) => (
                <Skeleton key={j} className="h-11 w-full rounded-md" />
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  // Active session with prescription → show prescribed workout UI
  if (session?.prescribedExercises && session.prescribedExercises.length > 0) {
    return (
      <>
        <StaleSessionBanner sessionDate={session.date} onAbandon={handleDiscard} />
        <PrescribedWorkout
          sessionId={session.id}
          sessionName={session.sessionName}
          sessionDate={session.date}
          prescribedExercises={session.prescribedExercises}
          initialSets={session.sets.map((s) => ({
            id: s.id,
            exerciseId: s.exerciseId,
            setNumber: s.setNumber,
            weight: s.weight,
            reps: s.reps,
            rir: s.rir,
            setType: ((s as unknown as { setType?: string }).setType as import("./types").SetType) ?? "normal",
          }))}
          enableTimer={enableTimer}
          onComplete={handleComplete}
          mesocycleContext={mesocycleContext}
          exerciseDetails={exerciseDetails}
          previousPerformance={previousPerformance}
          isDeload={session.isDeload ?? false}
        />
      </>
    );
  }

  // Active session without prescription → manual mode
  if (session) {
    return (
      <>
        <StaleSessionBanner sessionDate={session.date} onAbandon={handleDiscard} />
        <ActiveWorkout
          session={session}
          exerciseList={exerciseList}
          onComplete={handleComplete}
          enableTimer={enableTimer}
        />
      </>
    );
  }

  // No active session but planned sessions → show planned list
  if (plannedSessions && plannedSessions.sessions.some((s) => s.status === "planned")) {
    return (
      <PlannedSessionList
        data={plannedSessions}
        onSessionStarted={() => {
          setLoading(true);
          setRefreshKey((k) => k + 1);
        }}
      />
    );
  }

  // No active session → show "ask coach" CTA
  return <NoWorkoutState />;
}
