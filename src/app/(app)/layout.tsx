import { Suspense } from "react";
import Link from "next/link";
import { Dumbbell, LogOut } from "lucide-react";
import { auth, signOut } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { SidebarNav } from "./_components/sidebar-nav";
import { MobileNav } from "./_components/mobile-nav";

async function UserSection() {
  const session = await auth();

  if (!session?.user) return null;

  return (
    <div className="mt-auto border-t p-4">
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
    <div className="flex h-screen">
      {/* Desktop Sidebar */}
      <aside className="hidden w-64 border-r bg-muted/40 md:flex md:flex-col">
        <div className="flex h-14 items-center border-b px-4">
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
            <div className="mt-auto border-t p-4">
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
      <main className="flex-1 overflow-auto pb-20 md:pb-0">
        <div className="container mx-auto p-4 md:p-6">{children}</div>
      </main>

      {/* Mobile bottom nav */}
      <Suspense>
        <MobileNav />
      </Suspense>
    </div>
  );
}
