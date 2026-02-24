import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getActiveProgramData } from "./actions";
import { GenerateMesocycleForm } from "./_components/generate-form";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { MessageSquare } from "lucide-react";
import Link from "next/link";

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-16 space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">No active program</h1>
        <p className="text-muted-foreground max-w-md">
          Create a structured training program to see your weekly sessions, track volume, and progress through your mesocycle.
        </p>
      </div>
      <div className="flex gap-3">
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
