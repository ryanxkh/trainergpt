"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { MessageSquare, Dumbbell, CalendarDays, BookOpen, History, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

const tabs = [
  { href: "/coach", label: "Coach", icon: MessageSquare },
  { href: "/workout", label: "Today", icon: Dumbbell },
  { href: "/program", label: "Program", icon: CalendarDays },
  { href: "/exercises", label: "Exercises", icon: BookOpen },
  { href: "/history", label: "History", icon: History },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function MobileNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Main navigation"
      className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background/95 backdrop-blur-sm md:hidden"
      style={{ touchAction: "manipulation" }}
    >
      <div className="flex h-16 items-stretch pb-[env(safe-area-inset-bottom)]" role="tablist">
        {tabs.map((tab) => {
          const isActive = pathname.startsWith(tab.href);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              role="tab"
              aria-selected={isActive}
              aria-label={tab.label}
              className={cn(
                "relative flex min-h-11 flex-1 flex-col items-center justify-center gap-1 px-2 py-2 text-[10px] font-medium transition-colors active:text-primary",
                isActive
                  ? "text-primary"
                  : "text-muted-foreground"
              )}
            >
              {isActive && (
                <span className="absolute top-0 h-1 w-8 rounded-b bg-primary" />
              )}
              <tab.icon
                className={cn(
                  "h-5 w-5",
                  isActive ? "stroke-[2.5]" : "stroke-2"
                )}
                aria-hidden="true"
              />
              <span className="truncate">{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
