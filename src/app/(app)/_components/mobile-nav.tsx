"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { MessageSquare, Dumbbell, CalendarDays, BookOpen, History } from "lucide-react";
import { cn } from "@/lib/utils";

const tabs = [
  { href: "/coach", label: "Coach", icon: MessageSquare },
  { href: "/workout", label: "Today", icon: Dumbbell },
  { href: "/program", label: "Program", icon: CalendarDays },
  { href: "/exercises", label: "Exercises", icon: BookOpen },
  { href: "/history", label: "History", icon: History },
];

export function MobileNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background/95 backdrop-blur-sm md:hidden">
      <div className="flex h-16 items-stretch pb-[env(safe-area-inset-bottom)]">
        {tabs.map((tab) => {
          const isActive = pathname.startsWith(tab.href);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                "relative flex flex-1 flex-col items-center justify-center gap-1 text-[10px] font-medium transition-colors",
                isActive
                  ? "text-primary"
                  : "text-muted-foreground active:text-primary"
              )}
            >
              {isActive && (
                <span className="absolute top-0 h-0.5 w-8 rounded-b-full bg-primary" />
              )}
              <tab.icon
                className={cn("h-5 w-5", isActive && "stroke-[2.5]")}
              />
              {tab.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
