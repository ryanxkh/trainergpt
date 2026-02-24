"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { MessageSquare, Dumbbell, CalendarDays, BookOpen, History } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/coach", label: "Coach", icon: MessageSquare },
  { href: "/workout", label: "Today", icon: Dumbbell },
  { href: "/program", label: "Program", icon: CalendarDays },
  { href: "/exercises", label: "Exercises", icon: BookOpen },
  { href: "/history", label: "History", icon: History },
];

export function SidebarNav() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-1 p-4">
      {navItems.map((item) => {
        const isActive = pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "relative flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
              isActive
                ? "bg-accent text-accent-foreground font-medium"
                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            )}
          >
            {isActive && (
              <span className="absolute left-0 top-1.5 bottom-1.5 w-0.5 rounded-r-full bg-primary" />
            )}
            <item.icon className="h-4 w-4" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
