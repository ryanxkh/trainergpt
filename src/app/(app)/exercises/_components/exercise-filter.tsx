"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChevronRight, Dumbbell, Zap, Search } from "lucide-react";
import Link from "next/link";

type Exercise = {
  id: number;
  name: string;
  muscleGroups: unknown;
  movementPattern: string;
  equipment: string;
  sfrRating: string | null;
  isStretchFocused: boolean | null;
  repRangeOptimal: unknown;
};

export function ExerciseFilter({
  exercises,
  groups,
}: {
  exercises: Exercise[];
  groups: string[];
}) {
  const [search, setSearch] = useState("");
  const [activeGroup, setActiveGroup] = useState<string | null>(null);

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

  const sortedGroups = Object.keys(grouped).sort();

  return (
    <>
      {/* Search + Filter */}
      <div className="space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search exercises, muscle groups, equipment..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge
            variant={activeGroup === null ? "default" : "outline"}
            className="cursor-pointer"
            onClick={() => setActiveGroup(null)}
          >
            All ({exercises.length})
          </Badge>
          {groups.map((group) => {
            const count = exercises.filter((ex) =>
              (ex.muscleGroups as { primary: string[] }).primary.includes(group)
            ).length;
            return (
              <Badge
                key={group}
                variant={activeGroup === group ? "default" : "outline"}
                className="cursor-pointer capitalize"
                onClick={() => setActiveGroup(activeGroup === group ? null : group)}
              >
                {group.replace(/_/g, " ")} ({count})
              </Badge>
            );
          })}
        </div>
      </div>

      {/* Results */}
      <div className="space-y-8">
        {sortedGroups.map((group) => (
          <section key={group}>
            <h2 className="text-xl font-semibold capitalize mb-3">
              {group.replace(/_/g, " ")}
            </h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {grouped[group].map((ex) => {
                const mg = ex.muscleGroups as {
                  primary: string[];
                  secondary: string[];
                };
                const repRange = ex.repRangeOptimal as [number, number];

                return (
                  <Link key={ex.id} href={`/exercises/${ex.id}`}>
                    <Card className="hover:bg-muted/50 transition-colors h-full">
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-base">{ex.name}</CardTitle>
                          <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="flex flex-wrap gap-1.5 mb-2">
                          {mg.primary.map((g) => (
                            <Badge
                              key={g}
                              variant="default"
                              className="capitalize text-xs"
                            >
                              {g.replace(/_/g, " ")}
                            </Badge>
                          ))}
                          {mg.secondary.map((g) => (
                            <Badge
                              key={g}
                              variant="secondary"
                              className="capitalize text-xs"
                            >
                              {g.replace(/_/g, " ")}
                            </Badge>
                          ))}
                        </div>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          <span className="capitalize">
                            {ex.movementPattern.replace(/_/g, " ")}
                          </span>
                          <span>{ex.equipment}</span>
                          <span>
                            {repRange[0]}-{repRange[1]} reps
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mt-2">
                          {ex.sfrRating === "high" && (
                            <Badge variant="outline" className="text-xs gap-1">
                              <Zap className="h-3 w-3" />
                              High SFR
                            </Badge>
                          )}
                          {ex.isStretchFocused && (
                            <Badge variant="outline" className="text-xs gap-1">
                              <Dumbbell className="h-3 w-3" />
                              Stretch
                            </Badge>
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
          <Card>
            <CardContent className="py-8">
              <p className="text-center text-muted-foreground">
                No exercises match your search.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </>
  );
}
