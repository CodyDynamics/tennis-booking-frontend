import type { DashboardMetricsApi } from "@/types/api";
import type { ApiClient } from "../client";

export function createAdminEndpoints(client: ApiClient) {
  return {
    getDashboardMetrics: () =>
      client.get<DashboardMetricsApi>("/admin/dashboard/metrics"),
  };
}

export type AdminEndpoints = ReturnType<typeof createAdminEndpoints>;
