import { Suspense } from "react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Program",
  description: "View your mesocycle program and weekly sessions.",
};
import { getActiveProgramData } from "./actions";
import { getTemplatesForBrowse } from "./template-actions";
import { GenerateMesocycleForm } from "./_components/generate-form";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { MessageSquare, Calendar, Target, Dumbbell, Sparkles } from "lucide-react";
import Link from "next/link";

async function EmptyState() {
  const templates = await getTemplatesForBrowse();

  return (
    <div className="space-y-8">
      <div className="text-center space-y-2 pt-8">
        <h1 className="text-2xl font-semibold tracking-tight">No active program</h1>
        <p className="text-muted-foreground max-w-md mx-auto">
          Choose a pre-built hypertrophy program or generate a custom one.
        </p>
      </div>

      {/* Template cards */}
      <div className="grid gap-3 sm:grid-cols-2">
        {templates.map((template) => (
          <Link
            key={template.slug}
            href={`/program/templates/${template.slug}`}
            className="group relative flex flex-col rounded-xl border bg-card p-4 transition-all hover:border-primary/40 hover:shadow-sm active:scale-[0.98]"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <h2 className="text-sm font-semibold group-hover:text-primary transition-colors">
                  {template.name}
                </h2>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {template.subtitle}
                </p>
              </div>
              <Badge
                variant="secondary"
                className="shrink-0 text-[10px] capitalize"
              >
                {template.targetLevel}
              </Badge>
            </div>
            <div className="mt-3 flex items-center gap-3 text-[10px] text-muted-foreground">
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {template.daysPerWeek}x/week
              </span>
              <span className="flex items-center gap-1">
                <Target className="h-3 w-3" />
                {template.weeks} wks
              </span>
              <span className="flex items-center gap-1">
                <Dumbbell className="h-3 w-3" />
                {template.sessionCount} sessions
              </span>
            </div>
          </Link>
        ))}
      </div>

      {/* Divider */}
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-2 text-muted-foreground">or</span>
        </div>
      </div>

      {/* Existing options */}
      <div className="flex justify-center gap-3">
        <Link href="/coach">
          <Button variant="outline">
            <MessageSquare className="mr-2 h-4 w-4" />
            Ask Coach
          </Button>
        </Link>
        <GenerateMesocycleForm />
      </div>
    </div>
  );
}

async function ProgramRedirect() {
  const program = await getActiveProgramData();

  if (program) {
    redirect(`/program/${program.mesocycle.id}`);
  }

  return <EmptyState />;
}

function ProgramSkeleton() {
  return (
    <div className="flex flex-col items-center justify-center py-16 space-y-4">
      <Skeleton className="h-8 w-64" />
      <Skeleton className="h-4 w-80" />
    </div>
  );
}

export default function ProgramPage() {
  return (
    <Suspense fallback={<ProgramSkeleton />}>
      <ProgramRedirect />
    </Suspense>
  );
}
