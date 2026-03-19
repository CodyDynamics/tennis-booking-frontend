"use client";

/**
 * Global loading overlay (tennis balls) for:
 * - Next.js App Router segment transitions (via RouteSegmentLoadingBridge in app/(app)/loading.tsx)
 * - React Query: initial fetches + mutations (background refetch excluded)
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useIsFetching, useIsMutating } from "@tanstack/react-query";
import { TennisBallsLoader } from "@/components/ui/tennis-balls-loader";

type AppLoadingContextValue = {
  registerRouteLoading: (delta: number) => void;
};

const AppLoadingContext = createContext<AppLoadingContextValue | null>(null);

/** Query keys that should not dim the whole app (inline / modal polling). */
const SKIP_GLOBAL_LOADER_KEYS = new Set(["courtAvailability"]);

function shouldCountQueryForGlobalLoader(query: {
  queryKey: readonly unknown[];
  state: { status: string; fetchStatus: string };
}): boolean {
  const key = query.queryKey[0];
  if (typeof key === "string" && SKIP_GLOBAL_LOADER_KEYS.has(key)) {
    return false;
  }
  /* Initial load / no cached data yet */
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

  const pendingQueries = useIsFetching({
    predicate: shouldCountQueryForGlobalLoader,
  });
  const pendingMutations = useIsMutating();
  const queryBusy = pendingQueries > 0 || pendingMutations > 0;
  const routeBusy = routeDepth > 0;
  const rawBusy = routeBusy || queryBusy;

  const [showOverlay, setShowOverlay] = useState(false);
  const showTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (rawBusy) {
      if (hideTimerRef.current) {
        clearTimeout(hideTimerRef.current);
        hideTimerRef.current = null;
      }
      if (showTimerRef.current) clearTimeout(showTimerRef.current);
      showTimerRef.current = setTimeout(() => setShowOverlay(true), 160);
    } else {
      if (showTimerRef.current) {
        clearTimeout(showTimerRef.current);
        showTimerRef.current = null;
      }
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
      hideTimerRef.current = setTimeout(() => setShowOverlay(false), 140);
    }
    return () => {
      if (showTimerRef.current) clearTimeout(showTimerRef.current);
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    };
  }, [rawBusy]);

  const message = routeBusy
    ? "Đang tải trang…"
    : pendingMutations > 0
      ? "Đang xử lý…"
      : "Đang tải dữ liệu…";

  const contextValue = useMemo<AppLoadingContextValue>(
    () => ({ registerRouteLoading }),
    [registerRouteLoading],
  );

  return (
    <AppLoadingContext.Provider value={contextValue}>
      {children}
      <TennisBallsLoader
        open={showOverlay}
        message={message}
        lockScroll={showOverlay}
        zIndex={110}
      />
    </AppLoadingContext.Provider>
  );
}
