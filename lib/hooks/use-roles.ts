"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

/** Only run on client so the request uses the correct API base URL and avoids SSR issues. */
const isClient = typeof window !== "undefined";

export function useRoles() {
  return useQuery({
    queryKey: ["roles"],
    queryFn: () => api.roles.getRoles(),
    staleTime: 5 * 60 * 1000,
    enabled: isClient,
  });
}
