"use client";

import { useState, useTransition } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Calendar, Timer, Dumbbell, Trash2 } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { deleteSession } from "../../workout/actions";
import { ShareButton } from "./share-button";

type SessionData = {
  id: number;
  sessionName: string;
  date: string;
  durationMinutes: number | null;
  setCount: number;
  totalVolume: number;
  exerciseNames: string[];
  status: string;
};

export function HistorySessionCard({ session }: { session: SessionData }) {
  const [showConfirm, setShowConfirm] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const isComplete = session.durationMinutes !== null;

  const handleDelete = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setShowConfirm(true);
  };

  const confirmDelete = () => {
    startTransition(async () => {
      const result = await deleteSession(session.id);
      if (result.success) {
        toast.success(`Deleted: ${session.sessionName}`);
        setShowConfirm(false);
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  };

  return (
    <>
      <Link href={`/workout/${session.id}`}>
        <Card className="hover:bg-muted/50 transition-colors">
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-semibold truncate">{session.sessionName}</p>
                  {!isComplete && (
                    <Badge variant="secondary" className="text-xs shrink-0">
                      In Progress
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {new Date(session.date).toLocaleDateString()}
                  </span>
                  {session.durationMinutes && (
                    <span className="flex items-center gap-1">
                      <Timer className="h-3 w-3" />
                      {session.durationMinutes}m
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    <Dumbbell className="h-3 w-3" />
                    {session.setCount} sets
                  </span>
                  <span>{session.totalVolume.toLocaleString()} lbs</span>
                </div>
                <div className="flex flex-wrap gap-1 mt-1">
                  {session.exerciseNames.slice(0, 5).map((name) => (
                    <Badge key={name} variant="outline" className="text-xs">
                      {name}
                    </Badge>
                  ))}
                  {session.exerciseNames.length > 5 && (
                    <Badge variant="outline" className="text-xs">
                      +{session.exerciseNames.length - 5}
                    </Badge>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleDelete}
                  title="Delete workout"
                  className="text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
                <ShareButton sessionId={session.id} />
              </div>
            </div>
          </CardContent>
        </Card>
      </Link>

      <Dialog open={showConfirm} onOpenChange={setShowConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete workout?</DialogTitle>
            <DialogDescription>
              This will permanently delete &ldquo;{session.sessionName}&rdquo; and
              all {session.setCount} sets. This can&apos;t be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowConfirm(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDelete}
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
