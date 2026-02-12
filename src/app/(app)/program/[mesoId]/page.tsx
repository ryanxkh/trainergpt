import { Suspense } from "react";
import { cacheLife } from "next/cache";
import { db } from "@/lib/db";
import { mesocycles } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import Link from "next/link";
import { Calendar, ArrowLeft } from "lucide-react";

async function getMesocycle(id: number) {
  "use cache";
  cacheLife("minutes");
  return db.query.mesocycles.findFirst({ where: eq(mesocycles.id, id) });
}

async function MesocycleContent({
  params,
}: {
  params: Promise<{ mesoId: string }>;
}) {
  const { mesoId } = await params;
  const id = parseInt(mesoId);
  if (isNaN(id)) notFound();

  const meso = await getMesocycle(id);

  if (!meso) notFound();

  const volumePlan = meso.volumePlan as Record<
    string,
    Record<string, number>
  > | null;

  // Get sorted week keys
  const weekKeys = volumePlan
    ? Object.keys(volumePlan).sort(
        (a, b) =>
          parseInt(a.replace("week_", "")) -
          parseInt(b.replace("week_", ""))
      )
    : [];

  // Get all muscle groups across weeks
  const allMuscleGroups = new Set<string>();
  if (volumePlan) {
    for (const weekData of Object.values(volumePlan)) {
      for (const group of Object.keys(weekData)) {
        allMuscleGroups.add(group);
      }
    }
  }
  const muscleGroups = Array.from(allMuscleGroups).sort();

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/program"
          className="text-sm text-muted-foreground hover:underline inline-flex items-center gap-1"
        >
          <ArrowLeft className="h-3 w-3" />
          Back to Program
        </Link>
        <div className="flex items-center gap-3 mt-2">
          <h1 className="text-3xl font-bold">{meso.name}</h1>
          <Badge
            variant={meso.status === "active" ? "default" : "secondary"}
            className="capitalize"
          >
            {meso.status}
          </Badge>
        </div>
        <div className="flex items-center gap-6 mt-2 text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <Calendar className="h-4 w-4" />
            <span>
              Week {meso.currentWeek} of {meso.totalWeeks}
            </span>
          </div>
          <span className="capitalize">{meso.splitType.replace(/_/g, " ")}</span>
          {meso.startDate && (
            <span>
              Started {new Date(meso.startDate).toLocaleDateString()}
            </span>
          )}
        </div>
      </div>

      {/* Volume Plan by Week */}
      {weekKeys.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Weekly Volume Plan (sets per muscle group)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 pr-4 font-medium">
                      Muscle Group
                    </th>
                    {weekKeys.map((key) => {
                      const weekNum = key.replace("week_", "");
                      const isCurrent =
                        parseInt(weekNum) === meso.currentWeek;
                      return (
                        <th
                          key={key}
                          className={`text-center py-2 px-3 font-medium ${
                            isCurrent ? "bg-primary/10 rounded" : ""
                          }`}
                        >
                          Wk {weekNum}
                          {isCurrent && (
                            <span className="block text-xs text-primary">
                              Current
                            </span>
                          )}
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {muscleGroups.map((group) => (
                    <tr key={group} className="border-b last:border-0">
                      <td className="py-2 pr-4 capitalize">
                        {group.replace(/_/g, " ")}
                      </td>
                      {weekKeys.map((key) => {
                        const weekNum = key.replace("week_", "");
                        const isCurrent =
                          parseInt(weekNum) === meso.currentWeek;
                        const sets = volumePlan?.[key]?.[group] || 0;
                        return (
                          <td
                            key={key}
                            className={`text-center py-2 px-3 ${
                              isCurrent ? "bg-primary/10 font-semibold" : ""
                            }`}
                          >
                            {sets > 0 ? sets : "—"}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                  {/* Totals row */}
                  <tr className="border-t-2 font-semibold">
                    <td className="py-2 pr-4">Total</td>
                    {weekKeys.map((key) => {
                      const weekNum = key.replace("week_", "");
                      const isCurrent =
                        parseInt(weekNum) === meso.currentWeek;
                      const total = Object.values(
                        volumePlan?.[key] || {}
                      ).reduce((sum, v) => sum + v, 0);
                      return (
                        <td
                          key={key}
                          className={`text-center py-2 px-3 ${
                            isCurrent ? "bg-primary/10" : ""
                          }`}
                        >
                          {total}
                        </td>
                      );
                    })}
                  </tr>
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Week-by-week breakdown */}
      {!volumePlan && (
        <Card>
          <CardContent className="py-8">
            <p className="text-center text-muted-foreground">
              No detailed volume plan available for this mesocycle.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function MesocycleDetailSkeleton() {
  return (
    <div className="space-y-6">
      <div>
        <Skeleton className="h-4 w-32 mb-2" />
        <Skeleton className="h-9 w-64 mb-2" />
        <Skeleton className="h-4 w-48" />
      </div>
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-72" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-48 w-full" />
        </CardContent>
      </Card>
    </div>
  );
}

export default function MesocycleDetailPage({
  params,
}: {
  params: Promise<{ mesoId: string }>;
}) {
  return (
    <Suspense fallback={<MesocycleDetailSkeleton />}>
      <MesocycleContent params={params} />
    </Suspense>
  );
}
