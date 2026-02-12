"use client";

import { useState, useEffect, useOptimistic, useTransition, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { toast } from "sonner";
import {
  Play,
  Plus,
  Trash2,
  CheckCircle2,
  Timer,
  Search,
} from "lucide-react";
import {
  startWorkout,
  logSet,
  deleteSet,
  completeWorkout,
  getExerciseList,
  getActiveSession,
} from "../actions";

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
  durationMinutes: number | null;
  sets: LoggedSet[];
};

// ─── Readiness Form ──────────────────────────────────────────────────

function ReadinessForm({ onStart }: { onStart: (name: string, readiness: Session["preReadiness"]) => void }) {
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
      onStart(sessionName, { energy, motivation, soreness, sleepQuality, sleepHours });
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Start Workout</h1>
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
          <ReadinessSlider label="Energy" value={energy} onChange={setEnergy} />
          <ReadinessSlider label="Motivation" value={motivation} onChange={setMotivation} />
          <ReadinessSlider label="Soreness" value={soreness} onChange={setSoreness} low="None" high="Very sore" />
          <ReadinessSlider label="Sleep Quality" value={sleepQuality} onChange={setSleepQuality} />
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

      <Button size="lg" className="w-full" onClick={handleStart} disabled={isPending}>
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
        <Label>{label}: {value}/10</Label>
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

// ─── Active Workout ──────────────────────────────────────────────────

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
    (state: LoggedSet[], newSet: LoggedSet | { type: "delete"; id: number }) => {
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

  const selectedExercise = exerciseList.find(
    (e) => e.id.toString() === selectedExerciseId
  );

  // Count sets per exercise
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
        id: Date.now(), // temp id
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

      toast.success(
        `Set ${nextSetNumber}: ${exercise.name} — ${weight}lbs × ${reps} @ ${rir} RIR`
      );

      // Start rest timer if enabled
      if (enableTimer && exercise.defaultRestSeconds) {
        setRestTimer(exercise.defaultRestSeconds);
      }
    });
  };

  const handleDeleteSet = (setId: number) => {
    startTransition(async () => {
      setOptimisticSets({ type: "delete", id: setId });
      await deleteSet(setId);
      toast.success("Set deleted");
    });
  };

  const handleComplete = () => {
    const durationMinutes = Math.round(
      (Date.now() - startTime.getTime()) / 60000
    );
    startTransition(async () => {
      await completeWorkout(session.id, {
        postNotes: postNotes || undefined,
        durationMinutes,
      });
      toast.success(`Workout complete! ${sets.length} sets in ${durationMinutes} minutes`);
      onComplete();
    });
  };

  // Group sets by exercise for display
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
          <h1 className="text-3xl font-bold">{session.sessionName}</h1>
          <div className="flex items-center gap-2 mt-1 text-muted-foreground">
            <Timer className="h-4 w-4" />
            <span className="font-mono">{elapsed}</span>
            <Badge variant="secondary">{sets.length} sets</Badge>
          </div>
        </div>
      </div>

      {/* Rest Timer */}
      {enableTimer && restTimer !== null && (
        <Card className={restTimer <= 0 ? "border-green-500 bg-green-50 dark:bg-green-950/20" : "border-blue-500 bg-blue-50 dark:bg-blue-950/20"}>
          <CardContent className="flex items-center justify-between py-4">
            <div className="flex items-center gap-3">
              <Timer className="h-5 w-5" />
              <span className="font-semibold">Rest Timer</span>
            </div>
            <span className="text-2xl font-mono font-bold">{restDisplay}</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => { setRestTimer(null); setRestDisplay(""); }}
            >
              Skip
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Log Set Form */}
      <Card>
        <CardHeader>
          <CardTitle>Log Set</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Exercise picker with search */}
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
            <Select value={selectedExerciseId} onValueChange={setSelectedExerciseId}>
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
                Optimal: {(selectedExercise.repRangeOptimal as [number, number])?.[0]}-
                {(selectedExercise.repRangeOptimal as [number, number])?.[1]} reps |
                SFR: {selectedExercise.sfrRating} |
                Set {nextSetNumber}
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

          <Button onClick={handleLogSet} disabled={isPending} className="w-full">
            <Plus className="mr-2 h-4 w-4" />
            Log Set
          </Button>
        </CardContent>
      </Card>

      {/* Logged Sets */}
      {Object.keys(groupedSets).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Logged Sets</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Object.entries(groupedSets).map(([exerciseName, exerciseSets]) => (
                <div key={exerciseName}>
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="font-semibold">{exerciseName}</h3>
                    <Badge variant="secondary">{exerciseSets.length} sets</Badge>
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
                      {exerciseSets.map((set) => (
                        <TableRow key={set.id}>
                          <TableCell>{set.setNumber}</TableCell>
                          <TableCell>{set.weight} lbs</TableCell>
                          <TableCell>{set.reps}</TableCell>
                          <TableCell>{set.rir ?? "—"}</TableCell>
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
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Complete Workout */}
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

export default function WorkoutPage({ enableTimer }: { enableTimer: boolean }) {
  const [session, setSession] = useState<Session | null>(null);
  const [exerciseList, setExerciseList] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [, startTransition] = useTransition();

  // Load exercise list and check for active session on mount
  useEffect(() => {
    async function load() {
      const [exercises, activeSession] = await Promise.all([
        getExerciseList(),
        getActiveSession(),
      ]);
      setExerciseList(exercises as Exercise[]);
      if (activeSession) {
        setSession({
          ...activeSession,
          sets: activeSession.sets.map((s) => ({
            ...s,
            exercise: s.exercise as Exercise,
          })),
        } as Session);
      }
      setLoading(false);
    }
    load();
  }, []);

  const handleStart = useCallback(
    (name: string, readiness: Session["preReadiness"]) => {
      startTransition(async () => {
        const newSession = await startWorkout(
          name,
          readiness ?? undefined
        );
        setSession({
          ...newSession,
          sets: [],
        } as Session);
        toast.success("Workout started!");
      });
    },
    [startTransition]
  );

  const handleComplete = useCallback(() => {
    setSession(null);
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Workout</h1>
        <Card>
          <CardContent className="py-8">
            <p className="text-center text-muted-foreground">Loading...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (session) {
    return (
      <ActiveWorkout
        session={session}
        exerciseList={exerciseList}
        onComplete={handleComplete}
        enableTimer={enableTimer}
      />
    );
  }

  return <ReadinessForm onStart={handleStart} />;
}
