"use client";

import { useState, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChevronRight, Sparkles, Search, User, ArrowRight } from "lucide-react";
import Link from "next/link";
import { MuscleGroupBadge } from "@/app/(app)/workout/_components/muscle-group-badge";
import { cn } from "@/lib/utils";

type Exercise = {
  id: number;
  name: string;
  muscleGroups: unknown;
  movementPattern: string;
  equipment: string;
  sfrRating: string | null;
  isStretchFocused: boolean | null;
  repRangeOptimal: unknown;
  userId?: number | null;
};

const MUSCLE_ORDER = [
  "chest", "back", "quads", "hamstrings", "glutes",
  "side_delts", "rear_delts", "front_delts",
  "biceps", "triceps", "calves", "abs", "traps", "forearms",
];

export function ExerciseFilter({
  exercises,
  groups,
}: {
  exercises: Exercise[];
  groups: string[];
}) {
  const [search, setSearch] = useState("");
  const [activeGroup, setActiveGroup] = useState<string | null>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);
  const [showHint, setShowHint] = useState(true);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Check scroll position
  const checkScroll = () => {
    const container = scrollContainerRef.current;
    if (!container) return;
    
    const { scrollLeft, scrollWidth, clientWidth } = container;
    setCanScrollLeft(scrollLeft > 0);
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10);
  };

  // Handle scroll and hide hint
  const handleScroll = () => {
    checkScroll();
    if (showHint) {
      setShowHint(false);
    }
  };

  // Check scroll on mount and when groups change
  useEffect(() => {
    checkScroll();
    const container = scrollContainerRef.current;
    if (container) {
      container.addEventListener("scroll", handleScroll);
      return () => container.removeEventListener("scroll", handleScroll);
    }
  }, [groups, showHint]);

  const filtered = exercises.filter((ex) => {
    const mg = ex.muscleGroups as { primary: string[]; secondary: string[] };
    const matchesSearch =
      !search ||
      ex.name.toLowerCase().includes(search.toLowerCase()) ||
      mg.primary.some((g) => g.toLowerCase().includes(search.toLowerCase())) ||
      ex.equipment.toLowerCase().includes(search.toLowerCase());
    const matchesGroup =
      !activeGroup || mg.primary.includes(activeGroup);
    return matchesSearch && matchesGroup;
  });

  // Group filtered exercises
  const grouped: Record<string, Exercise[]> = {};
  for (const ex of filtered) {
    const mg = ex.muscleGroups as { primary: string[]; secondary: string[] };
    for (const group of mg.primary) {
      if (activeGroup && group !== activeGroup) continue;
      if (!grouped[group]) grouped[group] = [];
      if (!grouped[group].some((e) => e.id === ex.id)) {
        grouped[group].push(ex);
      }
    }
  }

  // Sort groups by muscle order
  const sortedGroups = MUSCLE_ORDER.filter((m) => grouped[m]);

  return (
    <>
      {/* Search + Filter */}
      <div className="space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search exercises..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search exercises"
            className="pl-10 h-11"
          />
        </div>
        <div className={cn(
          "scroll-chip-container",
          canScrollLeft && "can-scroll-left",
          canScrollRight && "can-scroll-right"
        )}>
          <div
            ref={scrollContainerRef}
            className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 md:mx-0 md:px-0 md:flex-wrap relative"
          >
            <button
              onClick={() => setActiveGroup(null)}
              className={cn(
                "shrink-0 min-h-11 px-4 py-2 rounded-full text-sm font-medium transition-all active:scale-95",
                activeGroup === null
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-muted text-muted-foreground hover:bg-accent"
              )}
            >
              All ({exercises.length})
            </button>
            {groups.sort((a, b) => MUSCLE_ORDER.indexOf(a) - MUSCLE_ORDER.indexOf(b)).map((group) => {
              const count = exercises.filter((ex) =>
                (ex.muscleGroups as { primary: string[] }).primary.includes(group)
              ).length;
              return (
                <button
                  key={group}
                  onClick={() => setActiveGroup(activeGroup === group ? null : group)}
                  className={cn(
                    "shrink-0 min-h-11 px-4 py-2 rounded-full text-sm font-medium capitalize transition-all active:scale-95",
                    activeGroup === group
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "bg-muted text-muted-foreground hover:bg-accent"
                  )}
                >
                  {group.replace(/_/g, " ")} ({count})
                </button>
              );
            })}
          </div>
          {/* Scroll hint arrow - shows on first render, fades after scroll */}
          {showHint && canScrollRight && (
            <div className="absolute right-6 top-1/2 -translate-y-1/2 md:hidden">
              <ArrowRight className="h-4 w-4 text-muted-foreground scroll-hint" />
            </div>
          )}
        </div>
      </div>

      {/* Results */}
      <div className="space-y-8">
        {sortedGroups.map((group) => (
          <section key={group}>
            <h2 className="text-lg font-semibold capitalize mb-3">
              {group.replace(/_/g, " ")}
            </h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {grouped[group].map((ex) => {
                const mg = ex.muscleGroups as {
                  primary: string[];
                  secondary: string[];
                };

                return (
                  <Link key={ex.id} href={`/exercises/${ex.id}`}>
                    <Card className="hover:bg-muted/50 transition-colors cursor-pointer active:scale-[0.99] h-full">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <h3 className="font-semibold text-sm truncate">{ex.name}</h3>
                              {ex.userId && (
                                <Badge variant="secondary" className="text-[11px] px-1.5 py-0 shrink-0">
                                  <User className="h-2.5 w-2.5 mr-0.5" />
                                  Custom
                                </Badge>
                              )}
                            </div>
                            <p className="text-[11px] text-muted-foreground uppercase tracking-wide mt-0.5">
                              {ex.equipment}
                            </p>
                          </div>
                          <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                        </div>

                        {/* Muscle badges */}
                        <div className="flex flex-wrap gap-1 mt-2">
                          {mg.primary.map((g) => (
                            <MuscleGroupBadge key={g} group={g} />
                          ))}
                        </div>

                        {/* Info row */}
                        <div className="flex items-center gap-2 mt-2.5 text-[11px] text-muted-foreground">
                          <span className="capitalize">{ex.movementPattern.replace(/_/g, " ")}</span>
                          {ex.sfrRating && ex.sfrRating !== "medium" && (
                            <>
                              <span className="opacity-50">&middot;</span>
                              <span className={cn(
                                "font-medium",
                                ex.sfrRating === "high" && "text-green-600 dark:text-green-400",
                                ex.sfrRating === "low" && "text-amber-600 dark:text-amber-400"
                              )}>
                                {ex.sfrRating} SFR
                              </span>
                            </>
                          )}
                          {ex.isStretchFocused && (
                            <>
                              <span className="opacity-50">&middot;</span>
                              <span className="flex items-center gap-0.5 text-blue-600 dark:text-blue-400 font-medium">
                                <Sparkles className="h-3 w-3" />
                                Stretch
                              </span>
                            </>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                );
              })}
            </div>
          </section>
        ))}

        {sortedGroups.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <p className="text-muted-foreground">No exercises found</p>
            {search && (
              <button
                onClick={() => setSearch("")}
                className="mt-2 text-sm text-primary hover:underline"
              >
                Clear search
              </button>
            )}
          </div>
        )}
      </div>
    </>
  );
}
