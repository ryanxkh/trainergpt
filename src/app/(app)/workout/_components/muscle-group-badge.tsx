import { cn } from "@/lib/utils";

const MUSCLE_GROUP_STYLES: Record<string, { bg: string; text: string }> = {
  chest:       { bg: "bg-red-100 dark:bg-red-950/40",       text: "text-red-700 dark:text-red-400" },
  back:        { bg: "bg-blue-100 dark:bg-blue-950/40",     text: "text-blue-700 dark:text-blue-400" },
  quads:       { bg: "bg-green-100 dark:bg-green-950/40",   text: "text-green-700 dark:text-green-400" },
  hamstrings:  { bg: "bg-teal-100 dark:bg-teal-950/40",     text: "text-teal-700 dark:text-teal-400" },
  glutes:      { bg: "bg-purple-100 dark:bg-purple-950/40", text: "text-purple-700 dark:text-purple-400" },
  biceps:      { bg: "bg-amber-100 dark:bg-amber-950/40",   text: "text-amber-700 dark:text-amber-400" },
  triceps:     { bg: "bg-indigo-100 dark:bg-indigo-950/40", text: "text-indigo-700 dark:text-indigo-400" },
  side_delts:  { bg: "bg-lime-100 dark:bg-lime-950/40",     text: "text-lime-700 dark:text-lime-400" },
  rear_delts:  { bg: "bg-cyan-100 dark:bg-cyan-950/40",     text: "text-cyan-700 dark:text-cyan-400" },
  front_delts: { bg: "bg-yellow-100 dark:bg-yellow-950/40", text: "text-yellow-700 dark:text-yellow-400" },
  calves:      { bg: "bg-emerald-100 dark:bg-emerald-950/40", text: "text-emerald-700 dark:text-emerald-400" },
  abs:         { bg: "bg-rose-100 dark:bg-rose-950/40",     text: "text-rose-700 dark:text-rose-400" },
  traps:       { bg: "bg-sky-100 dark:bg-sky-950/40",       text: "text-sky-700 dark:text-sky-400" },
  forearms:    { bg: "bg-stone-100 dark:bg-stone-950/40",   text: "text-stone-700 dark:text-stone-400" },
};

function formatLabel(group: string): string {
  return group.replace(/_/g, " ");
}

export function MuscleGroupBadge({
  group,
  className,
}: {
  group: string;
  className?: string;
}) {
  const style = MUSCLE_GROUP_STYLES[group] ?? {
    bg: "bg-gray-100 dark:bg-gray-900/40",
    text: "text-gray-700 dark:text-gray-400",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
        style.bg,
        style.text,
        className
      )}
    >
      {formatLabel(group)}
    </span>
  );
}
