"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";

/**
 * Key in localStorage: last deployed app version the user has "seen".
 * On each deploy, set NEXT_PUBLIC_APP_VERSION (e.g. to your git tag 1.0.1) in the build;
 * the first visit after a bump runs a one-time client storage wipe + React Query reset.
 * Server-side Redis/session invalidation is separate: use the same version in a deploy
 * script or as a Redis key namespace if needed.
 */
const SEEN_VERSION_KEY = "bt_app_version_seen";

function getDeployedVersion(): string {
  const v = process.env.NEXT_PUBLIC_APP_VERSION?.trim();
  return v && v.length > 0 ? v : "0.0.0";
}

export function DeploymentVersionSync() {
  const queryClient = useQueryClient();
  const didRun = useRef(false);

  useEffect(() => {
    if (didRun.current) return;
    didRun.current = true;
    if (typeof window === "undefined") return;

    const current = getDeployedVersion();
    let previous: string | null = null;
    try {
      previous = localStorage.getItem(SEEN_VERSION_KEY);
    } catch {
      return;
    }

    if (previous === null) {
      try {
        localStorage.setItem(SEEN_VERSION_KEY, current);
      } catch {
        // ignore
      }
      return;
    }

    if (previous === current) return;

    try {
      sessionStorage.clear();
    } catch {
      // ignore
    }
    try {
      const toRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k) toRemove.push(k);
      }
      for (const k of toRemove) {
        localStorage.removeItem(k);
      }
      localStorage.setItem(SEEN_VERSION_KEY, current);
    } catch {
      // ignore
    }
    try {
      queryClient.clear();
    } catch {
      // ignore
    }
  }, [queryClient]);

  return null;
}
