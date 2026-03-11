import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Dumbbell } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center space-y-6">
      <Dumbbell className="h-12 w-12 text-muted-foreground" />
      <div className="text-center space-y-2">
        <h1 className="text-4xl font-bold tracking-tight">404</h1>
        <p className="text-muted-foreground">
          This page doesn&apos;t exist. Maybe it skipped leg day.
        </p>
      </div>
      <Link href="/coach">
        <Button>Back to Coach</Button>
      </Link>
    </div>
  );
}
