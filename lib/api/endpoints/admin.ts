import type {
  AdminDayBookingsPageApi,
  AdminKpiDrilldownPageApi,
  AdminSportDrilldownPageApi,
  DashboardMetricsApi,
  SportBookingBreakdownApi,
} from "@/types/api";
import type { ApiClient } from "../client";

export function createAdminEndpoints(client: ApiClient) {
  return {
    getDashboardMetrics: () =>
      client.get<DashboardMetricsApi>("/admin/dashboard/metrics"),
    getSportBookingBreakdown: (sport: string) =>
      client.get<SportBookingBreakdownApi>("/admin/dashboard/metrics/by-sport", {
        params: { sport },
      }),
    getSportBreakdownDrilldown: (params: {
      sport: string;
      dimension: "role" | "bookingType" | "accountType";
      value: string;
      page?: number;
      pageSize?: number;
    }) =>
      client.get<AdminSportDrilldownPageApi>("/admin/dashboard/metrics/by-sport/drilldown", {
        params: {
          sport: params.sport,
          dimension: params.dimension,
          value: params.value,
          page: String(params.page ?? 0),
          pageSize: String(params.pageSize ?? 40),
        },
      }),
    getKpiDrilldown: (params: { metric: string; page?: number; pageSize?: number }) =>
      client.get<AdminKpiDrilldownPageApi>("/admin/dashboard/metrics/kpi-drilldown", {
        params: {
          metric: params.metric,
          page: String(params.page ?? 0),
          pageSize: String(params.pageSize ?? 40),
        },
      }),
    getDayCourtBookings: (params: { date: string; page?: number; pageSize?: number }) =>
      client.get<AdminDayBookingsPageApi>("/admin/dashboard/metrics/day-bookings", {
        params: {
          date: params.date,
          page: String(params.page ?? 0),
          pageSize: String(params.pageSize ?? 40),
        },
      }),
  };
}

export type AdminEndpoints = ReturnType<typeof createAdminEndpoints>;
