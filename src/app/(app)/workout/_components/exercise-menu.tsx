"use client";

import { useState } from "react";
import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { MoreVertical, Plus, SkipForward, StickyNote } from "lucide-react";

export function ExerciseMenu({
  exerciseName,
  isComplete,
  onAddSet,
  onSkipRemaining,
  onToggleNotes,
}: {
  exerciseName: string;
  isComplete: boolean;
  onAddSet: () => void;
  onSkipRemaining: () => void;
  onToggleNotes: () => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button
          type="button"
          className="h-9 w-9 inline-flex items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors active:scale-95"
        >
          <MoreVertical className="h-4 w-4" />
        </button>
      </SheetTrigger>
      <SheetContent side="bottom" className="pb-10">
        <SheetHeader>
          <SheetTitle className="text-base font-semibold">
            {exerciseName}
          </SheetTitle>
        </SheetHeader>
        <div className="mt-4 space-y-0.5">
          <MenuAction
            icon={<Plus className="h-5 w-5" />}
            label="Add Set"
            onClick={() => {
              onAddSet();
              setOpen(false);
            }}
          />
          {!isComplete && (
            <MenuAction
              icon={<SkipForward className="h-5 w-5" />}
              label="Skip Remaining"
              onClick={() => {
                onSkipRemaining();
                setOpen(false);
              }}
            />
          )}
          <MenuAction
            icon={<StickyNote className="h-5 w-5" />}
            label="Notes"
            onClick={() => {
              onToggleNotes();
              setOpen(false);
            }}
          />
        </div>
      </SheetContent>
    </Sheet>
  );
}

function MenuAction({
  icon,
  label,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className="flex w-full items-center gap-4 rounded-lg px-3 py-3.5 text-sm font-medium hover:bg-accent active:bg-accent/80 transition-colors"
      onClick={onClick}
    >
      <span className="text-muted-foreground">{icon}</span>
      {label}
    </button>
  );
}
