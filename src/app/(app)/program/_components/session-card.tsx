"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Play, ArrowRight, Check, Clock } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import { startPlannedSession } from "../actions";
import { useRouter } from "next/navigation";

const DAY_LABELS = ["", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

type Props = {
  session: {
    id: number;
    sessionName: string;
    status: string;
    dayNumber: number | null;
    isDeload: boolean | null;
    exerciseCount: number;
    exercisePreview: string[];
    durationMinutes?: number | null;
  };
};

export function SessionCard({ session }: Props) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const dayLabel = session.dayNumber ? DAY_LABELS[session.dayNumber] : "";

  const handleStart = () => {
    startTransition(async () => {
      const result = await startPlannedSession(session.id);
      if (result.success) {
        toast.success(`Started: ${session.sessionName}`);
        router.push("/workout");
      } else {
        toast.error(result.error);
      }
    });
  };

  return (
    <div
      className={cn(
        "rounded-lg border bg-card p-4 transition-all",
        session.status === "completed" && "opacity-70",
        session.status === "active" && "border-primary/50 bg-primary/5",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <div className="flex items-center gap-2">
            {dayLabel && (
              <span className="text-xs font-medium text-muted-foreground uppercase">
                {dayLabel}
              </span>
            )}
            <span className="font-semibold text-sm">{session.sessionName}</span>
            {session.isDeload && (
              <Badge variant="outline" className="text-amber-600 border-amber-300 dark:text-amber-400 dark:border-amber-700 text-[10px]">
                Deload
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            {session.exercisePreview.join(", ")}
            {session.exerciseCount > 3 && ` +${session.exerciseCount - 3} more`}
          </p>
          <p className="text-xs text-muted-foreground">
            {session.exerciseCount} exercises
            {session.durationMinutes ? ` · ${session.durationMinutes}min` : ""}
          </p>
        </div>
        <div className="shrink-0 flex items-center gap-2">
          <StatusBadge status={session.status} />
          <SessionAction
            status={session.status}
            isPending={isPending}
            onStart={handleStart}
          />
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case "completed":
      return (
        <Badge variant="secondary" className="gap-1 text-green-700 dark:text-green-400">
          <Check className="h-3 w-3" />
          Done
        </Badge>
      );
    case "active":
      return (
        <Badge className="gap-1">
          <Clock className="h-3 w-3" />
          Active
        </Badge>
      );
    case "abandoned":
      return (
        <Badge variant="secondary" className="text-muted-foreground">
          Skipped
        </Badge>
      );
    default:
      return (
        <Badge variant="outline" className="text-muted-foreground">
          Planned
        </Badge>
      );
  }
}

function SessionAction({
  status,
  isPending,
  onStart,
}: {
  status: string;
  isPending: boolean;
  onStart: () => void;
}) {
  if (status === "active") {
    return (
      <Link href="/workout">
        <Button size="sm" variant="outline">
          Go to Today
          <ArrowRight className="ml-1 h-3 w-3" />
        </Button>
      </Link>
    );
  }

  if (status === "planned") {
    return (
      <Button size="sm" onClick={onStart} disabled={isPending}>
        <Play className="mr-1 h-3 w-3" />
        {isPending ? "Starting..." : "Start"}
      </Button>
    );
  }

  return null;
}
