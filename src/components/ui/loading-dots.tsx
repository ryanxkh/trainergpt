import { cn } from "@/lib/utils";

export function LoadingDots({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1", className)}>
      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-current [animation-delay:-0.3s]" />
      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-current [animation-delay:-0.15s]" />
      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-current" />
    </span>
  );
}
