import { cn } from "@/lib/utils";

/**
 * Giữ chỗ layout khi đang tải — không vẽ spinner (overlay tennis do AppLoadingProvider).
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
