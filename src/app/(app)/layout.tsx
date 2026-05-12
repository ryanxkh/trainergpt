import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Dumbbell, LogOut } from "lucide-react";
import { eq } from "drizzle-orm";
import { auth, signOut } from "@/lib/auth";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ThemeToggle } from "@/components/theme-toggle";
import { SidebarNav } from "./_components/sidebar-nav";
import { MobileNav } from "./_components/mobile-nav";

async function OnboardingGuard() {
  const session = await auth();
  if (session?.user?.id) {
    const userId = parseInt(session.user.id as string);
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
      columns: { onboardingComplete: true },
    });
    if (!user?.onboardingComplete) {
      redirect("/onboard");
    }
  }
  return null;
}

async function UserSection() {
  const session = await auth();

  if (!session?.user) return null;

  return (
    <div className="mt-auto border-t border-border p-4 space-y-3">
      <div className="flex items-center justify-between">
        <ThemeToggle />
      </div>
      <div className="flex items-center gap-3">
        <div className="flex-1 truncate">
          <p className="text-sm font-medium">{session.user.name}</p>
          <p className="text-xs text-muted-foreground truncate">
            {session.user.email}
          </p>
        </div>
        <form
          action={async () => {
            "use server";
            await signOut({ redirectTo: "/login" });
          }}
        >
          <Button variant="ghost" size="icon" title="Sign out">
            <LogOut className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </div>
  );
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-dvh flex-col md:flex-row">
      <Suspense>
        <OnboardingGuard />
      </Suspense>
      {/* Desktop Sidebar */}
      <aside className="hidden w-64 flex-shrink-0 flex-col border-r border-border bg-muted/40 md:flex">
        <div className="flex h-16 items-center border-b border-border px-4">
          <Link href="/coach" className="flex items-center gap-2 font-bold">
            <Dumbbell className="h-6 w-6" />
            <span>TrainerGPT</span>
          </Link>
        </div>
        <Suspense>
          <SidebarNav />
        </Suspense>
        <Suspense
          fallback={
            <div className="mt-auto border-t border-border p-4">
              <div className="flex items-center gap-3">
                <Skeleton className="h-8 w-full" />
              </div>
            </div>
          }
        >
          <UserSection />
        </Suspense>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto overflow-x-hidden overscroll-y-contain">
        <div className="mx-auto max-w-3xl px-4 pt-3 pb-[calc(4rem+env(safe-area-inset-bottom))] md:px-6 md:pt-6 md:pb-6">
          {children}
        </div>
      </main>

      {/* Mobile bottom nav */}
      <Suspense>
        <MobileNav />
      </Suspense>
    </div>
  );
}
