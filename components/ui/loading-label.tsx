"use client";

import type { ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

/** Spinner + text for primary buttons during async submit */
export function LoadingLabel({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <span className={cn("inline-flex items-center justify-center gap-2", className)}>
      <Loader2 className="h-4 w-4 animate-spin shrink-0 text-current" aria-hidden />
      <span>{children}</span>
    </span>
  );
}

/** Centered spinner for card / page shells */
export function LoadingShell({
  message = "Loading",
  className,
}: {
  message?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 py-10 text-muted-foreground",
        className
      )}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <Loader2 className="h-9 w-9 animate-spin text-primary" aria-hidden />
      <p className="text-sm font-medium">{message}</p>
    </div>
  );
}
