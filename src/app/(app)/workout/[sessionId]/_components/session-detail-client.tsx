"use client";

import { useState, useTransition } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Calendar,
  Timer,
  Dumbbell,
  Pencil,
  Trash2,
  X,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { deleteSession, updateSet, deleteSet } from "../../actions";

type SetData = {
  id: number;
  setNumber: number;
  weight: number;
  reps: number;
  rir: number | null;
  rpe: number | null;
};

type ExerciseGroup = {
  exerciseName: string;
  muscleGroups: string[];
  sets: SetData[];
};

type SessionProps = {
  id: number;
  sessionName: string;
  date: string;
  durationMinutes: number | null;
  status: string;
  preReadiness: Record<string, number> | null;
  postNotes: string | null;
  groups: ExerciseGroup[];
  totalSets: number;
  totalVolume: number;
};

type EditedSet = { weight: number; reps: number; rir: number | null };

export function SessionDetailClient({ session }: { session: SessionProps }) {
  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [edits, setEdits] = useState<Map<number, EditedSet>>(new Map());
  const [deletedSetIds, setDeletedSetIds] = useState<Set<number>>(new Set());
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const startEditing = () => {
    setIsEditing(true);
    setEdits(new Map());
    setDeletedSetIds(new Set());
  };

  const cancelEditing = () => {
    setIsEditing(false);
    setEdits(new Map());
    setDeletedSetIds(new Set());
  };

  const getEditValue = (set: SetData): EditedSet => {
    return (
      edits.get(set.id) ?? {
        weight: set.weight,
        reps: set.reps,
        rir: set.rir,
      }
    );
  };

  const updateEditValue = (
    setId: number,
    original: SetData,
    field: keyof EditedSet,
    value: number | null,
  ) => {
    const current = edits.get(setId) ?? {
      weight: original.weight,
      reps: original.reps,
      rir: original.rir,
    };
    setEdits(new Map(edits).set(setId, { ...current, [field]: value }));
  };

  const markSetDeleted = (setId: number) => {
    setDeletedSetIds(new Set(deletedSetIds).add(setId));
  };

  const handleSave = () => {
    startTransition(async () => {
      let errors = 0;

      // Delete sets
      for (const setId of deletedSetIds) {
        const result = await deleteSet(setId);
        if (!result.success) errors++;
      }

      // Update changed sets (skip deleted ones)
      for (const [setId, edited] of edits) {
        if (deletedSetIds.has(setId)) continue;
        const result = await updateSet(setId, {
          weight: edited.weight,
          reps: edited.reps,
          rir: edited.rir ?? undefined,
        });
        if (!result.success) errors++;
      }

      if (errors > 0) {
        toast.error(`${errors} update(s) failed`);
      } else {
        toast.success("Changes saved");
      }

      setIsEditing(false);
      setEdits(new Map());
      setDeletedSetIds(new Set());
      router.refresh();
    });
  };

  const handleDeleteSession = () => {
    startTransition(async () => {
      const result = await deleteSession(session.id);
      if (result.success) {
        toast.success(`Deleted: ${session.sessionName}`);
        router.push("/history");
      } else {
        toast.error(result.error);
      }
    });
  };

  return (
    <>
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <Link
            href="/history"
            className="text-sm text-muted-foreground hover:underline"
          >
            &larr; Back to History
          </Link>
          <h1 className="text-2xl font-semibold tracking-tight mt-1">
            {session.sessionName}
          </h1>
          <div className="flex items-center gap-4 mt-2 text-muted-foreground">
            <div className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              <span>{new Date(session.date).toLocaleDateString()}</span>
            </div>
            {session.durationMinutes && (
              <div className="flex items-center gap-1">
                <Timer className="h-4 w-4" />
                <span>{session.durationMinutes} min</span>
              </div>
            )}
            <div className="flex items-center gap-1">
              <Dumbbell className="h-4 w-4" />
              <span>{session.totalSets} sets</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0 mt-6">
          {!isEditing && (
            <>
              <Button
                variant="ghost"
                size="icon"
                onClick={startEditing}
                title="Edit workout"
              >
                <Pencil className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowDeleteDialog(true)}
                title="Delete workout"
                className="text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </>
          )}
          {isEditing && (
            <>
              <Button
                size="sm"
                onClick={handleSave}
                disabled={isPending}
              >
                {isPending ? "Saving..." : "Save"}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={cancelEditing}
                disabled={isPending}
              >
                Cancel
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Readiness */}
      {session.preReadiness && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">
              Pre-Workout Readiness
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-5 gap-4 text-center">
              {Object.entries(session.preReadiness).map(([key, value]) => (
                <div key={key}>
                  <p className="text-2xl font-bold">{value}</p>
                  <p className="text-xs text-muted-foreground capitalize">
                    {key.replace(/([A-Z])/g, " $1").trim()}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <p className="text-2xl font-bold">{session.totalSets}</p>
            <p className="text-sm text-muted-foreground">Total Sets</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-2xl font-bold">{session.groups.length}</p>
            <p className="text-sm text-muted-foreground">Exercises</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-2xl font-bold">
              {session.totalVolume.toLocaleString()}
            </p>
            <p className="text-sm text-muted-foreground">Total Volume (lbs)</p>
          </CardContent>
        </Card>
      </div>

      {/* Exercise Sets */}
      {session.groups.map((group) => {
        const visibleSets = group.sets.filter(
          (s) => !deletedSetIds.has(s.id),
        );

        if (visibleSets.length === 0 && isEditing) return null;

        return (
          <Card key={group.exerciseName}>
            <CardHeader>
              <div className="flex items-center gap-2">
                <CardTitle>{group.exerciseName}</CardTitle>
                <Badge variant="outline">
                  {group.muscleGroups.join(", ")}
                </Badge>
                <Badge variant="secondary">{visibleSets.length} sets</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16">Set</TableHead>
                    <TableHead>Weight</TableHead>
                    <TableHead>Reps</TableHead>
                    <TableHead>RIR</TableHead>
                    <TableHead>RPE</TableHead>
                    <TableHead>Volume</TableHead>
                    {isEditing && <TableHead className="w-10" />}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visibleSets.map((set) => {
                    if (isEditing) {
                      const edited = getEditValue(set);
                      return (
                        <TableRow key={set.id}>
                          <TableCell>{set.setNumber}</TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              value={edited.weight}
                              onChange={(e) =>
                                updateEditValue(
                                  set.id,
                                  set,
                                  "weight",
                                  parseFloat(e.target.value) || 0,
                                )
                              }
                              className="w-20 h-8 text-sm"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              value={edited.reps}
                              onChange={(e) =>
                                updateEditValue(
                                  set.id,
                                  set,
                                  "reps",
                                  parseInt(e.target.value) || 0,
                                )
                              }
                              className="w-16 h-8 text-sm"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              value={edited.rir ?? ""}
                              onChange={(e) =>
                                updateEditValue(
                                  set.id,
                                  set,
                                  "rir",
                                  e.target.value === ""
                                    ? null
                                    : parseInt(e.target.value),
                                )
                              }
                              className="w-16 h-8 text-sm"
                              placeholder="—"
                            />
                          </TableCell>
                          <TableCell>{set.rpe ?? "—"}</TableCell>
                          <TableCell>
                            {(edited.weight * edited.reps).toLocaleString()} lbs
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-muted-foreground hover:text-destructive"
                              onClick={() => markSetDeleted(set.id)}
                            >
                              <X className="h-3.5 w-3.5" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    }

                    return (
                      <TableRow key={set.id}>
                        <TableCell>{set.setNumber}</TableCell>
                        <TableCell>{set.weight} lbs</TableCell>
                        <TableCell>{set.reps}</TableCell>
                        <TableCell>{set.rir ?? "—"}</TableCell>
                        <TableCell>{set.rpe ?? "—"}</TableCell>
                        <TableCell>
                          {(set.weight * set.reps).toLocaleString()} lbs
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        );
      })}

      {/* Post Notes */}
      {session.postNotes && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">
              Post-Workout Notes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">{session.postNotes}</p>
          </CardContent>
        </Card>
      )}

      {/* Delete Session Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete workout?</DialogTitle>
            <DialogDescription>
              This will permanently delete &ldquo;{session.sessionName}&rdquo;
              and all {session.totalSets} sets. This can&apos;t be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDeleteDialog(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteSession}
              disabled={isPending}
            >
              {isPending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
