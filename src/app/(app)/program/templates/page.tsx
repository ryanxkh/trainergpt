import { Suspense } from "react";
import type { Metadata } from "next";
import { Skeleton } from "@/components/ui/skeleton";
import { TemplateGrid } from "./_components/template-grid";
import { getTemplatesForBrowse } from "../template-actions";

export const metadata: Metadata = {
  title: "Choose a Program",
  description: "Browse pre-loaded hypertrophy programs and start training.",
};

async function TemplateList() {
  const templates = await getTemplatesForBrowse();
  return <TemplateGrid templates={templates} />;
}

function TemplateSkeleton() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-96" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-48 rounded-xl" />
        ))}
      </div>
    </div>
  );
}

export default function TemplatesPage() {
  return (
    <Suspense fallback={<TemplateSkeleton />}>
      <TemplateList />
    </Suspense>
  );
}
