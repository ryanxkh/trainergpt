import { Suspense } from "react";
import { cacheLife } from "next/cache";
import { db } from "@/lib/db";
import { mesocycles } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
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

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/coach"
          className="text-sm text-muted-foreground hover:underline inline-flex items-center gap-1"
        >
          <ArrowLeft className="h-3 w-3" />
          Back to Coach
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
          <span className="capitalize">
            {meso.splitType.replace(/_/g, " ")}
          </span>
          {meso.startDate && (
            <span>
              Started {new Date(meso.startDate).toLocaleDateString()}
            </span>
          )}
        </div>
      </div>
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
