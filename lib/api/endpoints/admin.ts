import type { DashboardMetricsApi, SportBookingBreakdownApi } from "@/types/api";
import type { ApiClient } from "../client";

export function createAdminEndpoints(client: ApiClient) {
  return {
    getDashboardMetrics: () =>
      client.get<DashboardMetricsApi>("/admin/dashboard/metrics"),
    getSportBookingBreakdown: (sport: string) =>
      client.get<SportBookingBreakdownApi>("/admin/dashboard/metrics/by-sport", {
        params: { sport },
      }),
  };
}

export type AdminEndpoints = ReturnType<typeof createAdminEndpoints>;
