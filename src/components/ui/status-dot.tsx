import { cn } from "@/lib/utils";

type StatusDotProps = {
  state: "active" | "completed" | "planned" | "abandoned" | "error" | "ready";
  label?: string;
  className?: string;
};

export function StatusDot({ state, label, className }: StatusDotProps) {
  return (
    <span className={cn("inline-flex items-center gap-1.5", className)}>
      <span
        className={cn(
          "h-2 w-2 rounded-full shrink-0",
          state === "active" && "bg-blue-500 animate-pulse",
          state === "completed" && "bg-green-500",
          state === "planned" && "bg-muted-foreground/40",
          state === "abandoned" && "bg-amber-500",
          state === "error" && "bg-destructive",
          state === "ready" && "bg-green-500",
        )}
      />
      {label && (
        <span className="text-xs text-muted-foreground capitalize">
          {label}
        </span>
      )}
    </span>
  );
}
