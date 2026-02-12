import { Suspense } from "react";
import { db } from "@/lib/db";
import { mesocycles } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import Link from "next/link";
import { Calendar, ChevronRight } from "lucide-react";
import { GenerateMesocycleForm } from "./_components/generate-form";

async function MesocycleList() {
  const session = await auth();
  const userId = session?.user?.id ? parseInt(session.user.id as string) : 1;

  const userMesocycles = await db.query.mesocycles.findMany({
    where: eq(mesocycles.userId, userId),
    orderBy: [desc(mesocycles.createdAt)],
  });

  if (userMesocycles.length === 0) {
    return (
      <Card>
        <CardContent className="py-8">
          <p className="text-center text-muted-foreground">
            No mesocycles yet. Generate one to get started with structured programming.
          </p>
        </CardContent>
      </Card>
    );
  }

  const active = userMesocycles.find((m) => m.status === "active");
  const others = userMesocycles.filter((m) => m.status !== "active");

  return (
    <div className="space-y-4">
      {active && (
        <Link href={`/program/${active.id}`}>
          <Card className="border-primary/50 hover:border-primary transition-colors">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CardTitle>{active.name}</CardTitle>
                  <Badge>Active</Badge>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-6 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  <span>
                    Week {active.currentWeek} of {active.totalWeeks}
                  </span>
                </div>
                <span className="capitalize">
                  {active.splitType.replace(/_/g, " ")}
                </span>
                {active.startDate && (
                  <span>
                    Started {new Date(active.startDate).toLocaleDateString()}
                  </span>
                )}
              </div>
            </CardContent>
          </Card>
        </Link>
      )}

      {others.length > 0 && (
        <>
          <h2 className="text-lg font-semibold mt-6">Past Mesocycles</h2>
          {others.map((meso) => (
            <Link key={meso.id} href={`/program/${meso.id}`}>
              <Card className="hover:bg-muted/50 transition-colors">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-base">{meso.name}</CardTitle>
                      <Badge variant="secondary" className="capitalize">
                        {meso.status}
                      </Badge>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </CardHeader>
              </Card>
            </Link>
          ))}
        </>
      )}
    </div>
  );
}

function MesocycleListSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-6 w-48" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-4 w-64" />
      </CardContent>
    </Card>
  );
}

export default function ProgramPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Program</h1>
        <GenerateMesocycleForm />
      </div>

      <Suspense fallback={<MesocycleListSkeleton />}>
        <MesocycleList />
      </Suspense>
    </div>
  );
}
