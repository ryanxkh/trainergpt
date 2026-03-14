"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { MessageSquare, Dumbbell, CalendarDays, BookOpen, History, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/coach", label: "Coach", icon: MessageSquare },
  { href: "/workout", label: "Today", icon: Dumbbell },
  { href: "/program", label: "Program", icon: CalendarDays },
  { href: "/exercises", label: "Exercises", icon: BookOpen },
  { href: "/history", label: "History", icon: History },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function SidebarNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Main navigation" className="flex flex-col gap-1 p-4">
      {navItems.map((item) => {
        const isActive = pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "relative flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
              isActive
                ? "bg-accent font-medium text-foreground"
                : "text-muted-foreground hover:bg-accent hover:text-foreground"
            )}
          >
            {isActive && (
              <span className="absolute left-0 top-1/2 bottom-1/2 h-full w-1 -translate-y-1/2 rounded-r bg-primary" />
            )}
            <item.icon className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
            <span className="truncate">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
