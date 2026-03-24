"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Calendar, Dumbbell, Target } from "lucide-react";

type TemplateInfo = {
  slug: string;
  name: string;
  subtitle: string;
  description: string;
  daysPerWeek: number;
  weeks: number;
  targetLevel: string;
  tags: string[];
  sessionCount: number;
  sessionNames: string[];
};

export function TemplateGrid({ templates }: { templates: TemplateInfo[] }) {
  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/program"
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors mb-3"
        >
          <ArrowLeft className="h-3 w-3" />
          Back to Program
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight">
          Choose a Program
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Pre-built hypertrophy programs personalized to your equipment and
          volume landmarks. Swap any exercise on the fly.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {templates.map((template) => (
          <Link
            key={template.slug}
            href={`/program/templates/${template.slug}`}
            className="group relative flex flex-col rounded-xl border bg-card p-5 transition-all hover:border-primary/40 hover:shadow-sm active:scale-[0.98]"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <h2 className="text-base font-semibold tracking-tight group-hover:text-primary transition-colors">
                  {template.name}
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
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

            <p className="text-xs text-muted-foreground mt-3 line-clamp-2">
              {template.description}
            </p>

            <div className="mt-auto pt-4 flex items-center gap-4 text-[11px] text-muted-foreground">
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {template.daysPerWeek}x/week
              </span>
              <span className="flex items-center gap-1">
                <Target className="h-3 w-3" />
                {template.weeks} weeks
              </span>
              <span className="flex items-center gap-1">
                <Dumbbell className="h-3 w-3" />
                {template.sessionCount} sessions
              </span>
            </div>

            <div className="mt-2 flex flex-wrap gap-1">
              {template.tags.slice(0, 3).map((tag) => (
                <span
                  key={tag}
                  className="inline-block rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground"
                >
                  {tag}
                </span>
              ))}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
