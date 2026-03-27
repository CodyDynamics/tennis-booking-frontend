import { cn } from "@/lib/utils";

/**
 * Reserves layout space while loading — no spinner (tennis overlay from AppLoadingProvider).
 */
export function GlobalLoadingPlaceholder({
  className,
  minHeight = "min-h-[50vh]",
}: {
  className?: string;
  /** Tailwind min-height class */
  minHeight?: string;
}) {
  return (
    <div
      className={cn(minHeight, className)}
      aria-busy="true"
      aria-label="Loading"
    />
  );
}
