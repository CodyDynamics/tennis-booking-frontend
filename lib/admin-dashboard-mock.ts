import type {
  AdminDayBookingsPageApi,
  AdminKpiDrilldownPageApi,
  AdminSportDrilldownPageApi,
  DashboardMetricsApi,
  SportBookingBreakdownApi,
} from "@/types/api";

/** Demo drill-down when clicking a bar in mock mode */
export const MOCK_SPORT_BREAKDOWNS: Record<string, SportBookingBreakdownApi> = {
  tennis: {
    sport: "tennis",
    windowDays: 14,
    totalBookings: 412,
    byRole: [
      { role: "student", count: 268 },
      { role: "coach", count: 96 },
      { role: "admin", count: 48 },
    ],
    byBookingType: [
      { bookingType: "COURT_ONLY", count: 351 },
      { bookingType: "COURT_COACH", count: 61 },
    ],
    byAccountType: [
      { accountType: "normal", count: 298 },
      { accountType: "membership", count: 104 },
      { accountType: "system", count: 10 },
    ],
  },
  pickleball: {
    sport: "pickleball",
    windowDays: 14,
    totalBookings: 186,
    byRole: [
      { role: "student", count: 142 },
      { role: "coach", count: 32 },
      { role: "admin", count: 12 },
    ],
    byBookingType: [
      { bookingType: "COURT_ONLY", count: 170 },
      { bookingType: "COURT_COACH", count: 16 },
    ],
    byAccountType: [
      { accountType: "normal", count: 150 },
      { accountType: "membership", count: 36 },
    ],
  },
  "ball-machine": {
    sport: "ball-machine",
    windowDays: 14,
    totalBookings: 52,
    byRole: [
      { role: "student", count: 40 },
      { role: "coach", count: 12 },
    ],
    byBookingType: [{ bookingType: "COURT_ONLY", count: 52 }],
    byAccountType: [
      { accountType: "normal", count: 44 },
      { accountType: "membership", count: 8 },
    ],
  },
  unknown: {
    sport: "unknown",
    windowDays: 14,
    totalBookings: 9,
    byRole: [
      { role: "student", count: 5 },
      { role: "No role", count: 4 },
    ],
    byBookingType: [{ bookingType: "COURT_ONLY", count: 9 }],
    byAccountType: [{ accountType: "normal", count: 9 }],
  },
};

/** Demo dataset when admin toggles “Mockup data” on the dashboard */
export const MOCK_ADMIN_DASHBOARD_METRICS: DashboardMetricsApi = {
  totals: {
    usersActive: 1284,
    courts: 42,
    locations: 8,
    courtBookingsOpen: 316,
    coachSessionsScheduled: 54,
    coaches: 19,
    revenue14d: 42890.5,
  },
  dailyCourtBookings: [
    { date: "2026-03-14", count: 12 },
    { date: "2026-03-15", count: 18 },
    { date: "2026-03-16", count: 15 },
    { date: "2026-03-17", count: 22 },
    { date: "2026-03-18", count: 28 },
    { date: "2026-03-19", count: 31 },
    { date: "2026-03-20", count: 26 },
    { date: "2026-03-21", count: 35 },
    { date: "2026-03-22", count: 40 },
    { date: "2026-03-23", count: 33 },
    { date: "2026-03-24", count: 29 },
    { date: "2026-03-25", count: 37 },
    { date: "2026-03-26", count: 44 },
    { date: "2026-03-27", count: 38 },
  ],
  bookingsBySport: [
    { sport: "tennis", count: 412 },
    { sport: "pickleball", count: 186 },
    { sport: "ball-machine", count: 52 },
    { sport: "unknown", count: 9 },
  ],
  dailyRevenue: [
    { date: "2026-03-14", revenue: 980 },
    { date: "2026-03-15", revenue: 1420 },
    { date: "2026-03-16", revenue: 1188 },
    { date: "2026-03-17", revenue: 1760 },
    { date: "2026-03-18", revenue: 2240 },
    { date: "2026-03-19", revenue: 2480 },
    { date: "2026-03-20", revenue: 2080 },
    { date: "2026-03-21", revenue: 2800 },
    { date: "2026-03-22", revenue: 3200 },
    { date: "2026-03-23", revenue: 2640 },
    { date: "2026-03-24", revenue: 2320 },
    { date: "2026-03-25", revenue: 2960 },
    { date: "2026-03-26", revenue: 3520 },
    { date: "2026-03-27", revenue: 3040 },
  ],
};

/** Mock distinct bookers for sport breakdown drill-down (not 1:1 with booking count). */
export function mockSportDrilldownPage(
  sport: string,
  dimension: "role" | "bookingType" | "accountType",
  value: string,
  bookingSegmentCount: number,
  page: number,
  pageSize: number,
): AdminSportDrilldownPageApi {
  const total = Math.max(
    1,
    Math.min(200, Math.ceil(bookingSegmentCount * 0.42)),
  );
  const start = page * pageSize;
  const len = Math.max(0, Math.min(pageSize, total - start));
  const items = Array.from({ length: len }, (_, i) => {
    const n = start + i + 1;
    return {
      userId: `mock-${sport}-${dimension}-${n}`,
      email: `player.${sport}.${n}@demo.test`,
      fullName: `Demo Player ${n}`,
      bookingCount: 1 + (n % 5),
      phone: `+1555${String(1000000 + n).slice(-7)}`,
      homeAddress: `${100 + (n % 900)} Mock St, Demo City`,
      primaryCourtName: `Court ${(n % 8) + 1} — Springpark`,
    };
  });
  return {
    sport,
    dimension,
    filterValue: value,
    total,
    page,
    pageSize,
    items,
  };
}

export function mockKpiDrilldownPage(
  metric: string,
  total: number,
  page: number,
  pageSize: number,
): AdminKpiDrilldownPageApi {
  const start = page * pageSize;
  const len = Math.max(0, Math.min(pageSize, total - start));
  const rows = Array.from({ length: len }, (_, i) => {
    const n = start + i + 1;
    return {
      id: `kpi-${metric}-${n}`,
      title: `${metric} row ${n}`,
      subtitle: `demo-${n}@example.com`,
      meta: `ID #${1000 + n}`,
    };
  });
  return { metric, total, page, pageSize, rows };
}

export function mockDayBookingsPage(
  date: string,
  bookingsThatDay: number,
  page: number,
  pageSize: number,
): AdminDayBookingsPageApi {
  const total = bookingsThatDay;
  const start = page * pageSize;
  const len = Math.max(0, Math.min(pageSize, total - start));
  const rows = Array.from({ length: len }, (_, i) => {
    const n = start + i;
    const h = 8 + (n % 8);
    const m = n % 2 === 0 ? "00" : "30";
    return {
      id: `day-${date}-${n}`,
      bookingDate: date,
      startTime: `${String(h).padStart(2, "0")}:${m}:00`,
      endTime: `${String(h + 1).padStart(2, "0")}:${m}:00`,
      sport: n % 3 === 0 ? "pickleball" : "tennis",
      userName: `Guest ${n + 1}`,
      userEmail: `guest.${n + 1}@demo.test`,
      courtName: `Court ${(n % 12) + 1}`,
      totalPrice: String(24 + (n % 5) * 8),
    };
  });
  return { date, total, page, pageSize, rows };
}
