"use client";

/**
 * Global loading overlay for:
 * - App Router segment transitions (RouteSegmentLoadingBridge in app/(app)/loading.tsx)
 * - React Query: *first* fetch of active queries only (status pending + no data). Background
 *   refetches after invalidateQueries keep status "success" while fetching — not counted.
 *
 * Mutations are intentionally *not* driven here: use per-action spinners. Otherwise the overlay
 * outlasts a fast 200ms API when invalidateQueries starts other first-time fetches, or
 * isMutating stacks oddly with the rest of the work.
 */

import { useIsFetching, type Query } from "@tanstack/react-query";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

type AppLoadingContextValue = {
  registerRouteLoading: (delta: number) => void;
};

const AppLoadingContext = createContext<AppLoadingContextValue | null>(null);

/** Query keys that should not dim the whole app (inline / modal polling). */
const SKIP_GLOBAL_LOADER_KEYS = new Set(["courtAvailability"]);

function shouldCountQueryForGlobalLoader(query: Query): boolean {
  const key = query.queryKey[0];
  if (typeof key === "string" && SKIP_GLOBAL_LOADER_KEYS.has(key)) {
    return false;
  }
  return (
    query.state.status === "pending" && query.state.fetchStatus === "fetching"
  );
}

export function RouteSegmentLoadingBridge() {
  const ctx = useContext(AppLoadingContext);
  useEffect(() => {
    if (!ctx) return;
    ctx.registerRouteLoading(1);
    return () => ctx.registerRouteLoading(-1);
  }, [ctx]);
  return null;
}

export function AppLoadingProvider({ children }: { children: React.ReactNode }) {
  const [routeDepth, setRouteDepth] = useState(0);

  const registerRouteLoading = useCallback((delta: number) => {
    setRouteDepth((d) => Math.max(0, d + delta));
  }, []);

  const pendingFirstFetches = useIsFetching({
    type: "active",
    predicate: shouldCountQueryForGlobalLoader,
  });
  const routeBusy = routeDepth > 0;
  const rawBusy = routeBusy || pendingFirstFetches > 0;

  const [showOverlay, setShowOverlay] = useState(false);
  const showTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (rawBusy) {
      if (showTimerRef.current) clearTimeout(showTimerRef.current);
      showTimerRef.current = setTimeout(() => setShowOverlay(true), 200);
    } else {
      if (showTimerRef.current) {
        clearTimeout(showTimerRef.current);
        showTimerRef.current = null;
      }
      setShowOverlay(false);
    }
    return () => {
      if (showTimerRef.current) clearTimeout(showTimerRef.current);
    };
  }, [rawBusy]);

  useEffect(() => {
    if (!showOverlay) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [showOverlay]);

  const message = routeBusy ? "Loading page…" : "Loading data…";

  const contextValue = useMemo<AppLoadingContextValue>(
    () => ({ registerRouteLoading }),
    [registerRouteLoading],
  );

  return (
    <AppLoadingContext.Provider value={contextValue}>
      {children}
      {showOverlay ? (
        <div
          role="status"
          aria-live="polite"
          aria-busy="true"
          aria-label={message}
          className={cn(
            "pointer-events-auto fixed inset-0 z-[110] flex flex-col items-center justify-center",
            "animate-in fade-in-0 duration-200",
          )}
        >
          <div
            className="absolute inset-0 bg-background/80 backdrop-blur-sm dark:bg-black/60"
            aria-hidden
          />
          <div className="relative flex flex-col items-center gap-4">
            <Loader2
              className="h-8 w-8 shrink-0 animate-spin text-primary drop-shadow-sm"
              strokeWidth={2.5}
            />
            <p className="max-w-[min(90vw,20rem)] text-center text-sm font-medium text-foreground">
              {message}
            </p>
          </div>
        </div>
      ) : null}
    </AppLoadingContext.Provider>
  );
}
