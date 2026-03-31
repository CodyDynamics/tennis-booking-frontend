"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useAdminDashboardMetrics, useAdminSportBookingBreakdown } from "@/lib/queries";
import {
  MOCK_ADMIN_DASHBOARD_METRICS,
  MOCK_SPORT_BREAKDOWNS,
} from "@/lib/admin-dashboard-mock";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { DashboardMetricsApi, SportBookingBreakdownApi } from "@/types/api";
import {
  Activity,
  BarChart3,
  CalendarCheck,
  DollarSign,
  MapPin,
  RefreshCw,
  Sparkles,
  Users,
  X,
} from "lucide-react";
import { GlobalLoadingPlaceholder } from "@/components/ui/global-loading-placeholder";
import { AdminDataSourceToggle, type AdminDataMode } from "@/components/admin/admin-data-source-toggle";

const PIE_COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#a855f7", "#ec4899", "#64748b"];

type SportBarRow = { sportKey: string; name: string; value: number };

function formatBookingTypeLabel(t: string): string {
  if (t === "COURT_ONLY") return "Court only";
  if (t === "COURT_COACH") return "Court + coach";
  return t;
}

function formatAccountTypeLabel(t: string): string {
  if (t === "normal") return "Normal signup";
  if (t === "membership") return "Membership list";
  if (t === "system") return "System / staff";
  return t;
}

function parseSportBarClickEntry(entry: unknown): SportBarRow | null {
  if (!entry || typeof entry !== "object") return null;
  const o = entry as Record<string, unknown>;
  const payload = o.payload as SportBarRow | undefined;
  const sportKey = (payload?.sportKey ?? o.sportKey) as string | undefined;
  const name = (payload?.name ?? o.name) as string | undefined;
  const value = (payload?.value ?? o.value) as number | undefined;
  if (!sportKey || name == null || value == null) return null;
  return { sportKey, name, value };
}

const EMPTY_METRICS: DashboardMetricsApi = {
  totals: {
    usersActive: 0,
    courts: 0,
    locations: 0,
    courtBookingsOpen: 0,
    coachSessionsScheduled: 0,
    coaches: 0,
    revenue14d: 0,
  },
  dailyCourtBookings: [],
  bookingsBySport: [],
  dailyRevenue: [],
};

function KpiCard({
  label,
  value,
  icon: Icon,
  delay,
  accent,
}: {
  label: string;
  value: number | string;
  icon: typeof Users;
  delay: number;
  accent: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
      className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900"
    >
      <div
        className={cn(
          "absolute -right-6 -top-6 h-24 w-24 rounded-full opacity-[0.12] blur-2xl",
          accent,
        )}
      />
      <div className={cn("mb-3 inline-flex rounded-xl p-2.5 text-white shadow-md", accent)}>
        <Icon className="h-5 w-5" />
      </div>
      <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{label}</p>
      <p className="mt-1 text-3xl font-black tracking-tight text-slate-900 dark:text-white">
        {value}
      </p>
    </motion.div>
  );
}

export default function AdminOverviewPage() {
  const [mode, setMode] = useState<AdminDataMode>("mock");
  const [sportSelection, setSportSelection] = useState<{ key: string; label: string } | null>(
    null,
  );
  const {
    data: realMetrics,
    isLoading: realLoading,
    isError: realError,
    refetch,
    isFetching,
  } = useAdminDashboardMetrics(mode === "real");

  const {
    data: breakdownReal,
    isLoading: breakdownLoading,
    isError: breakdownError,
  } = useAdminSportBookingBreakdown(sportSelection?.key ?? null, mode === "real" && !!sportSelection);

  const breakdownMock = useMemo(() => {
    if (!sportSelection || mode !== "mock") return undefined;
    return MOCK_SPORT_BREAKDOWNS[sportSelection.key];
  }, [sportSelection, mode]);

  const breakdown: SportBookingBreakdownApi | undefined =
    mode === "mock" ? breakdownMock : breakdownReal ?? undefined;

  useEffect(() => {
    if (!sportSelection) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSportSelection(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [sportSelection]);

  const metrics: DashboardMetricsApi | null = useMemo(() => {
    if (mode === "mock") return MOCK_ADMIN_DASHBOARD_METRICS;
    if (realLoading && !realMetrics) return null;
    return realMetrics ?? (realError ? EMPTY_METRICS : EMPTY_METRICS);
  }, [mode, realMetrics, realLoading, realError]);

  const pieData = useMemo(() => {
    if (!metrics) return [];
    return metrics.bookingsBySport.map((r) => ({
      sportKey: r.sport,
      name: r.sport === "unknown" ? "Other" : r.sport,
      value: r.count,
    }));
  }, [metrics]);

  return (
    <div className="space-y-10 pb-16 font-sans">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between"
      >
        <div>
          <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-blue-500/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
            <Sparkles className="h-3.5 w-3.5" />
            Analytics
          </div>
          <h1 className="text-4xl font-black tracking-tight text-slate-900 dark:text-white">
            Operations dashboard
          </h1>
          <p className="mt-2 max-w-xl text-slate-600 dark:text-slate-400">
            Live signals from organizations, locations, courts, and bookings — visualized for quick
            decisions.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Data source
          </span>
          <AdminDataSourceToggle mode={mode} onChange={setMode} />
          {mode === "real" && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="rounded-lg"
              onClick={() => refetch()}
              disabled={isFetching}
            >
              <RefreshCw className={cn("h-4 w-4 mr-2", isFetching && "animate-spin")} />
              Refresh
            </Button>
          )}
        </div>
      </motion.div>

      {mode === "real" && realError && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/40 dark:text-amber-100"
        >
          Could not load metrics from the API. Check your session and try refresh, or switch to mock
          data for demos.
        </motion.div>
      )}

      {metrics === null && (
        <GlobalLoadingPlaceholder minHeight="min-h-[320px]" className="rounded-2xl bg-slate-100/50 dark:bg-slate-900/50" />
      )}

      <AnimatePresence mode="wait">
      {metrics && (
      <motion.div
        key={mode}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -6 }}
        transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
        className="space-y-8"
      >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        <KpiCard
          label="Active users"
          value={metrics.totals.usersActive.toLocaleString()}
          icon={Users}
          delay={0.05}
          accent="bg-gradient-to-br from-sky-500 to-blue-600"
        />
        <KpiCard
          label="Courts"
          value={metrics.totals.courts}
          icon={Activity}
          delay={0.1}
          accent="bg-gradient-to-br from-emerald-500 to-teal-600"
        />
        <KpiCard
          label="Locations"
          value={metrics.totals.locations}
          icon={MapPin}
          delay={0.15}
          accent="bg-gradient-to-br from-violet-500 to-purple-600"
        />
        <KpiCard
          label="Open court bookings"
          value={metrics.totals.courtBookingsOpen}
          icon={CalendarCheck}
          delay={0.2}
          accent="bg-gradient-to-br from-sky-500 to-blue-600"
        />
        <KpiCard
          label="Coach sessions (scheduled)"
          value={metrics.totals.coachSessionsScheduled}
          icon={BarChart3}
          delay={0.25}
          accent="bg-gradient-to-br from-cyan-500 to-blue-500"
        />
        <KpiCard
          label="Coaches"
          value={metrics.totals.coaches}
          icon={Users}
          delay={0.3}
          accent="bg-gradient-to-br from-fuchsia-500 to-pink-600"
        />
        <KpiCard
          label="Revenue (14 days)"
          value={`$${metrics.totals.revenue14d.toLocaleString(undefined, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}`}
          icon={DollarSign}
          delay={0.35}
          accent="bg-gradient-to-br from-lime-500 to-emerald-600"
        />
      </div>

      <div className="grid gap-8 lg:grid-cols-5">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="lg:col-span-3 rounded-3xl border border-slate-200 bg-white p-6 shadow-lg dark:border-slate-800 dark:bg-slate-900"
        >
          <div className="mb-6 flex items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">Court bookings / day</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Last 14 days (non-cancelled)
              </p>
            </div>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={metrics.dailyCourtBookings}>
                <defs>
                  <linearGradient id="fillBookings" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200 dark:stroke-slate-700" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11 }}
                  tickFormatter={(v) => v.slice(5)}
                  stroke="#94a3b8"
                />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} stroke="#94a3b8" />
                <Tooltip
                  contentStyle={{
                    borderRadius: 12,
                    border: "1px solid #e2e8f0",
                    boxShadow: "0 10px 40px rgba(15,23,42,0.08)",
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="count"
                  name="Bookings"
                  stroke="#2563eb"
                  strokeWidth={2}
                  fill="url(#fillBookings)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.42 }}
          className="lg:col-span-2 rounded-3xl border border-slate-200 bg-white p-6 shadow-lg dark:border-slate-800 dark:bg-slate-900"
        >
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">By sport</h2>
          <p className="mb-1 text-sm text-slate-500 dark:text-slate-400">
            Last 14 days, non-cancelled — click a bar for role and booking-type breakdown
          </p>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={pieData} layout="vertical" margin={{ left: 8, right: 16 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200 dark:stroke-slate-700" />
                <XAxis type="number" allowDecimals={false} stroke="#94a3b8" />
                <YAxis type="category" dataKey="name" width={88} tick={{ fontSize: 12 }} stroke="#94a3b8" />
                <Tooltip
                  contentStyle={{
                    borderRadius: 12,
                    border: "1px solid #e2e8f0",
                  }}
                />
                <Bar
                  dataKey="value"
                  name="Bookings"
                  radius={[0, 8, 8, 0]}
                  className="cursor-pointer outline-none"
                  onClick={(entry: unknown, index?: number) => {
                    let row = parseSportBarClickEntry(entry);
                    if (!row && typeof index === "number" && pieData[index]) {
                      const d = pieData[index];
                      row = { sportKey: d.sportKey, name: d.name, value: d.value };
                    }
                    if (row) setSportSelection({ key: row.sportKey, label: row.name });
                  }}
                >
                  {pieData.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.08 }}
        className="rounded-3xl border border-slate-200 bg-white p-6 shadow-lg dark:border-slate-800 dark:bg-slate-900"
      >
        <div className="mb-4">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">Court revenue / day</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Sum of booking totals (last 14 days, non-cancelled)
          </p>
        </div>
        <div className="h-[280px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={metrics.dailyRevenue}>
              <defs>
                <linearGradient id="fillRevenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200 dark:stroke-slate-700" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 11 }}
                tickFormatter={(v) => v.slice(5)}
                stroke="#94a3b8"
              />
              <YAxis
                tick={{ fontSize: 11 }}
                stroke="#94a3b8"
                tickFormatter={(v) => `$${v}`}
              />
              <Tooltip
                contentStyle={{
                  borderRadius: 12,
                  border: "1px solid #e2e8f0",
                  boxShadow: "0 10px 40px rgba(15,23,42,0.08)",
                }}
                formatter={(value: number) => [
                  `$${Number(value).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
                  "Revenue",
                ]}
              />
              <Area
                type="monotone"
                dataKey="revenue"
                name="Revenue"
                stroke="#059669"
                strokeWidth={2}
                fill="url(#fillRevenue)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </motion.div>
      </motion.div>
      )}
      </AnimatePresence>

      <AnimatePresence>
        {sportSelection && (
          <>
            <motion.button
              type="button"
              aria-label="Close details"
              className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-[2px]"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setSportSelection(null)}
            />
            <motion.aside
              role="dialog"
              aria-modal="true"
              aria-labelledby="sport-breakdown-title"
              className="fixed right-0 top-0 z-[60] flex h-full w-full max-w-md flex-col border-l border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-950"
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 320 }}
            >
              <div className="flex items-start justify-between gap-3 border-b border-slate-200 px-5 py-4 dark:border-slate-800">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Sport breakdown
                  </p>
                  <h2
                    id="sport-breakdown-title"
                    className="mt-1 text-xl font-bold text-slate-900 dark:text-white"
                  >
                    {sportSelection.label}
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Same 14-day window as the dashboard charts
                  </p>
                </div>
                <button
                  type="button"
                  className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-800 dark:hover:text-white"
                  onClick={() => setSportSelection(null)}
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto px-5 py-4">
                {mode === "real" && breakdownLoading && (
                  <p className="text-sm text-slate-500">Loading breakdown…</p>
                )}
                {mode === "real" && breakdownError && (
                  <p className="text-sm text-amber-700 dark:text-amber-300">
                    Could not load breakdown. Try again or refresh metrics.
                  </p>
                )}
                {mode === "mock" && !breakdown && (
                  <p className="text-sm text-slate-500">No demo breakdown for this sport.</p>
                )}
                {breakdown && (
                  <>
                    <p className="text-2xl font-black tabular-nums text-slate-900 dark:text-white">
                      {breakdown.totalBookings.toLocaleString()}{" "}
                      <span className="text-base font-semibold text-slate-500">bookings</span>
                    </p>
                    <div className="mt-6">
                      <h3 className="text-xs font-bold uppercase tracking-wide text-slate-500">
                        By user role
                      </h3>
                      <ul className="mt-2 space-y-2">
                        {breakdown.byRole.map((r) => (
                          <li
                            key={r.role}
                            className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50/90 px-3 py-2 text-sm dark:border-slate-800 dark:bg-slate-900/60"
                          >
                            <span>{r.role}</span>
                            <span className="font-semibold tabular-nums">{r.count}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div className="mt-6">
                      <h3 className="text-xs font-bold uppercase tracking-wide text-slate-500">
                        Booking type
                      </h3>
                      <ul className="mt-2 space-y-2">
                        {breakdown.byBookingType.map((r) => (
                          <li
                            key={r.bookingType}
                            className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50/90 px-3 py-2 text-sm dark:border-slate-800 dark:bg-slate-900/60"
                          >
                            <span>{formatBookingTypeLabel(r.bookingType)}</span>
                            <span className="font-semibold tabular-nums">{r.count}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div className="mt-6">
                      <h3 className="text-xs font-bold uppercase tracking-wide text-slate-500">
                        Account type (booker)
                      </h3>
                      <ul className="mt-2 space-y-2">
                        {breakdown.byAccountType.map((r) => (
                          <li
                            key={r.accountType}
                            className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50/90 px-3 py-2 text-sm dark:border-slate-800 dark:bg-slate-900/60"
                          >
                            <span>{formatAccountTypeLabel(r.accountType)}</span>
                            <span className="font-semibold tabular-nums">{r.count}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </>
                )}
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
