import { Suspense } from "react";
import { notFound } from "next/navigation";
import { Skeleton } from "@/components/ui/skeleton";
import { ProgramClient } from "../_components/program-client";
import { getProgramDataById } from "../actions";
import { getCachedProfile } from "@/lib/cache";
import { requireUserId } from "@/lib/auth-utils";

async function ProgramContent({
  params,
}: {
  params: Promise<{ mesoId: string }>;
}) {
  const { mesoId } = await params;
  const id = parseInt(mesoId);
  if (isNaN(id)) notFound();

  const [data, userId] = await Promise.all([
    getProgramDataById(id),
    requireUserId(),
  ]);

  if (!data) notFound();

  const profile = await getCachedProfile(userId);
  const volumeLandmarks = profile?.volumeLandmarks ?? {};

  return <ProgramClient data={data} volumeLandmarks={volumeLandmarks} />;
}

function ProgramSkeleton() {
  return (
    <div className="space-y-6">
      <div>
        <Skeleton className="h-8 w-64 mb-2" />
        <Skeleton className="h-4 w-48" />
      </div>
      <div className="flex gap-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-10 rounded-full" />
        ))}
      </div>
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24 w-full rounded-lg" />
        ))}
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
    <Suspense fallback={<ProgramSkeleton />}>
      <ProgramContent params={params} />
    </Suspense>
  );
}
