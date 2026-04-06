"use client";

import {
  useMemo,
  useRef,
  useState,
  useCallback,
  useLayoutEffect,
} from "react";
import { addMonths, format, isSameDay, startOfMonth, subMonths } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import { useAdmin } from "../admin-context";
import { useAdminCourtBookings, useCourts, useLocations } from "@/lib/queries";
import type { AdminCourtBookingRowApi } from "@/lib/api/endpoints/bookings";
import type { Court } from "@/types";
import { Button } from "@/components/ui/button";
import { GlobalLoadingPlaceholder } from "@/components/ui/global-loading-placeholder";
import { MapPin, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSlotHold } from "@/lib/hooks/use-slot-hold";
import { useAuth } from "@/lib/auth-store";
import {
  CourtCalendarBookingDialog,
  type CalendarColumnMeta,
} from "./court-calendar-booking-dialog";

const TIME_COL_WIDTH_PX = 52;
/** Minimum total width before horizontal scroll; columns grow to fill above this. */
const MIN_COURT_COL_PX = 100;
/** Grid covers 1:00–24:00 (hour blocks labeled 1 AM … 11 PM). */
const FIRST_HOUR = 1;
const LAST_HOUR_START = 23;
const PX_PER_HOUR = 52;
const HOUR_COUNT = LAST_HOUR_START - FIRST_HOUR + 1;
const GRID_HEIGHT_PX = HOUR_COUNT * PX_PER_HOUR;
const GRID_START_MINUTES = FIRST_HOUR * 60;
const GRID_END_MINUTES = 24 * 60;
const GRID_SPAN_MINUTES = GRID_END_MINUTES - GRID_START_MINUTES;

function ymd(d: Date): string {
  return format(d, "yyyy-MM-dd");
}

function timeToMinutes(t: string): number {
  const parts = t.split(":");
  const h = Number(parts[0]);
  const m = Number(parts[1] ?? 0);
  if (Number.isNaN(h)) return 0;
  return h * 60 + (Number.isNaN(m) ? 0 : m);
}

function formatTimeRange12(startTime: string, endTime: string): string {
  const pad = (t: string) => t.slice(0, 5);
  const base = new Date(2000, 0, 1);
  const [sh, sm] = pad(startTime).split(":").map(Number);
  const [eh, em] = pad(endTime).split(":").map(Number);
  const a = new Date(base);
  a.setHours(sh, sm ?? 0, 0, 0);
  const b = new Date(base);
  b.setHours(eh, em ?? 0, 0, 0);
  return `${format(a, "h:mm a")} – ${format(b, "h:mm a")}`;
}

function primaryCourtType(c: Court): string {
  const t = c.courtTypes?.[0] ?? c.type ?? "outdoor";
  return t === "indoor" ? "indoor" : "outdoor";
}

function buildColumns(
  courts: Court[],
  bookings: AdminCourtBookingRowApi[],
): CalendarColumnMeta[] {
  const byId = new Map<string, Court>();
  for (const c of courts) byId.set(c.id, c);
  const ordered: CalendarColumnMeta[] = [...courts]
    .filter((c) => c.status !== "maintenance")
    .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }))
    .map((c) => ({
      id: c.id,
      name: c.name,
      sport: (c.sports?.[0] ?? c.sport ?? "tennis").toLowerCase(),
      courtTypeForSlot: primaryCourtType(c),
      areaId: c.areaId ?? null,
    }));

  const seen = new Set(ordered.map((c) => c.id));
  for (const b of bookings) {
    if (seen.has(b.courtId)) continue;
    seen.add(b.courtId);
    const c = byId.get(b.courtId);
    const name = b.court?.name ?? c?.name ?? `Court ${b.courtId.slice(0, 8)}…`;
    ordered.push({
      id: b.courtId,
      name,
      sport: (b.sport ?? c?.sports?.[0] ?? c?.sport ?? "tennis").toLowerCase(),
      courtTypeForSlot: c ? primaryCourtType(c) : "outdoor",
      areaId: c?.areaId ?? null,
    });
  }
  return ordered;
}

function bookingBlockStyle(startTime: string, endTime: string): React.CSSProperties | null {
  let sm = timeToMinutes(startTime);
  let em = timeToMinutes(endTime);
  if (em <= sm) return null;
  sm = Math.max(sm, GRID_START_MINUTES);
  em = Math.min(em, GRID_END_MINUTES);
  if (em <= GRID_START_MINUTES || sm >= GRID_END_MINUTES) return null;
  const topPct = ((sm - GRID_START_MINUTES) / GRID_SPAN_MINUTES) * 100;
  const heightPct = ((em - sm) / GRID_SPAN_MINUTES) * 100;
  return {
    top: `${topPct}%`,
    height: `${heightPct}%`,
    /** Short slots (e.g. 30m) would be a few px tall; keep labels readable. */
    minHeight: 52,
  };
}

const USER_BOOKING_BG = [
  "#2563eb",
  "#0891b2",
  "#7c3aed",
  "#c026d3",
  "#db2777",
  "#ea580c",
  "#16a34a",
  "#ca8a04",
  "#4f46e5",
  "#0d9488",
  "#be123c",
  "#4338ca",
] as const;

function stableUserColorIndex(userId: string): number {
  let h = 0;
  for (let i = 0; i < userId.length; i++) h = (h * 31 + userId.charCodeAt(i)) >>> 0;
  return h % USER_BOOKING_BG.length;
}

function bookingBgForUser(userId: string | undefined): string {
  if (!userId) return "#64748b";
  return USER_BOOKING_BG[stableUserColorIndex(userId)];
}

function formatSportCourtLine(
  sport: string | null | undefined,
  courtType: string | null | undefined,
): string {
  const raw = (sport?.trim() || "court").replace(/_/g, " ");
  const sportLabel = raw.replace(/\b\w/g, (c) => c.toUpperCase());
  const t = courtType?.toLowerCase();
  const env =
    t === "indoor" || t === "outdoor"
      ? t.charAt(0).toUpperCase() + t.slice(1)
      : courtType?.trim() || "—";
  return `${sportLabel} · ${env}`;
}

function parseStartHourMinute(startTime: string): { hour: number; minute: number } {
  const [hs, ms] = startTime.split(":");
  const hour = Number(hs);
  const minute = Number(ms ?? 0);
  return {
    hour: Number.isFinite(hour) ? hour : 0,
    minute: Number.isFinite(minute) ? minute : 0,
  };
}

export default function AdminCourtCalendarPage() {
  const { user } = useAuth();
  const { locationId: adminLocationId } = useAdmin();
  const scopedLocationId = adminLocationId !== "all" ? adminLocationId : undefined;

  const { data: locations = [] } = useLocations();
  const locationTimezone = useMemo(() => {
    if (!scopedLocationId) return null;
    return locations.find((l) => l.id === scopedLocationId)?.timezone ?? null;
  }, [locations, scopedLocationId]);

  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [firstVisibleMonth, setFirstVisibleMonth] = useState(() => startOfMonth(new Date()));

  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogCourt, setDialogCourt] = useState<CalendarColumnMeta | null>(null);
  const [dialogStartHour, setDialogStartHour] = useState(9);
  const [dialogStartMinute, setDialogStartMinute] = useState(0);
  const [dialogEditingBooking, setDialogEditingBooking] =
    useState<AdminCourtBookingRowApi | null>(null);

  const dateStr = ymd(selectedDate);

  const { data: courts = [], isLoading: courtsLoading } = useCourts({
    locationId: scopedLocationId,
    enabled: !!scopedLocationId,
  });

  const {
    data: bookingsRaw = [],
    isLoading: bookingsLoading,
    isFetching: bookingsFetching,
    refetch: refetchBookings,
  } = useAdminCourtBookings({
    locationId: scopedLocationId,
    from: dateStr,
    to: dateStr,
    enabled: !!scopedLocationId,
  });

  useSlotHold({
    locationId: scopedLocationId ?? null,
    sport: null,
    courtType: null,
    date: null,
    displayName: "Admin calendar",
    onAvailabilityChanged: () => {
      void refetchBookings();
    },
  });

  const bookings = useMemo(
    () => bookingsRaw.filter((b) => b.bookingStatus !== "cancelled"),
    [bookingsRaw],
  );

  const columns = useMemo(
    () => buildColumns(courts, bookings),
    [courts, bookings],
  );

  const n = columns.length;
  const rowMinWidthPx = Math.max(100, n * MIN_COURT_COL_PX);

  const bookingsByCourt = useMemo(() => {
    const m = new Map<string, AdminCourtBookingRowApi[]>();
    for (const b of bookings) {
      const list = m.get(b.courtId) ?? [];
      list.push(b);
      m.set(b.courtId, list);
    }
    m.forEach((list) => {
      list.sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime));
    });
    return m;
  }, [bookings]);

  const headerScrollRef = useRef<HTMLDivElement>(null);
  const bodyScrollRef = useRef<HTMLDivElement>(null);
  const scrollLock = useRef(false);

  /**
   * Body uses overflow-y; vertical scrollbar steals width. Header has no v-scroll, so we pad it by
   * the same width so court columns line up with the grid below.
   */
  const [bodyVScrollbarPadPx, setBodyVScrollbarPadPx] = useState(0);

  const syncHorizontalScroll = useCallback((source: "header" | "body", left: number) => {
    if (scrollLock.current) return;
    scrollLock.current = true;
    const headerEl = headerScrollRef.current;
    const bodyEl = bodyScrollRef.current;
    const other = source === "header" ? bodyEl : headerEl;
    if (other && Math.abs(other.scrollLeft - left) > 1) {
      other.scrollLeft = left;
    }
    requestAnimationFrame(() => {
      scrollLock.current = false;
    });
  }, []);

  const nowLineStyle = useMemo(() => {
    if (!isSameDay(selectedDate, new Date())) return null;
    const now = new Date();
    const mins = now.getHours() * 60 + now.getMinutes();
    if (mins < GRID_START_MINUTES || mins > GRID_END_MINUTES) return null;
    const topPct = ((mins - GRID_START_MINUTES) / GRID_SPAN_MINUTES) * 100;
    return { top: `${topPct}%` };
  }, [selectedDate]);

  const openBookingDialog = (court: CalendarColumnMeta, hour: number) => {
    setDialogEditingBooking(null);
    setDialogCourt(court);
    setDialogStartHour(hour);
    setDialogStartMinute(0);
    setDialogOpen(true);
  };

  const openEditBooking = (court: CalendarColumnMeta, booking: AdminCourtBookingRowApi) => {
    const { hour, minute } = parseStartHourMinute(booking.startTime);
    setDialogEditingBooking(booking);
    setDialogCourt(court);
    setDialogStartHour(hour);
    setDialogStartMinute(minute);
    setDialogOpen(true);
  };

  const loading = !!scopedLocationId && (courtsLoading || bookingsLoading);

  useLayoutEffect(() => {
    const body = bodyScrollRef.current;
    if (!body) {
      setBodyVScrollbarPadPx(0);
      return;
    }

    const measure = () => {
      const w = body.offsetWidth - body.clientWidth;
      setBodyVScrollbarPadPx(Math.max(0, w));
    };

    measure();
    const raf = requestAnimationFrame(measure);

    const ro = new ResizeObserver(() => {
      requestAnimationFrame(measure);
    });
    ro.observe(body);
    const inner = body.firstElementChild;
    if (inner instanceof HTMLElement) {
      ro.observe(inner);
    }

    window.addEventListener("resize", measure);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [scopedLocationId, loading, columns.length, n, bookings.length, rowMinWidthPx]);

  return (
    <div className="flex flex-col gap-6 pb-10 lg:flex-row lg:items-start">
      {scopedLocationId ? (
        <CourtCalendarBookingDialog
          open={dialogOpen}
          onOpenChange={(v) => {
            setDialogOpen(v);
            if (!v) {
              setDialogCourt(null);
              setDialogEditingBooking(null);
            }
          }}
          locationTimezone={locationTimezone}
          bookingDate={dateStr}
          column={dialogCourt}
          startHour={dialogStartHour}
          startMinute={dialogStartMinute}
          editingBooking={dialogEditingBooking}
          isSuperAdmin={user?.role === "super_admin"}
        />
      ) : null}

      <aside className="w-full shrink-0 space-y-4 lg:w-[280px]">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Select date
          </p>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Two consecutive months; pick a day to load the court grid.
          </p>
        </div>
        <Calendar
          size="compact"
          selectedDate={selectedDate}
          onSelectDate={setSelectedDate}
          visibleMonth={firstVisibleMonth}
          onVisibleMonthChange={setFirstVisibleMonth}
        />
        <Calendar
          size="compact"
          selectedDate={selectedDate}
          onSelectDate={setSelectedDate}
          visibleMonth={addMonths(firstVisibleMonth, 1)}
          onVisibleMonthChange={(m) => setFirstVisibleMonth(subMonths(m, 1))}
        />
      </aside>

      <section className="min-w-0 flex-1 space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
              Court calendar
            </h1>
            <p className="mt-1 text-slate-600 dark:text-slate-400">
              {format(selectedDate, "EEEE, MMMM d, yyyy")} ·{" "}
              {scopedLocationId ? (
                <span>{bookings.length} booking(s) shown</span>
              ) : (
                <span className="inline-flex items-center gap-1 text-amber-700 dark:text-amber-300">
                  <MapPin className="h-4 w-4 shrink-0" />
                  Choose a location in the sidebar to load courts and bookings.
                </span>
              )}
            </p>
          </div>
          {scopedLocationId ? (
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="shrink-0 rounded-xl"
              title="Reload bookings"
              aria-label="Reload bookings from server"
              disabled={bookingsFetching}
              onClick={() => void refetchBookings()}
            >
              <RefreshCw
                className={cn("h-4 w-4", bookingsFetching && "animate-spin")}
                aria-hidden
              />
            </Button>
          ) : null}
        </div>

        {!scopedLocationId ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-white/80 p-10 text-center text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-900/50 dark:text-slate-400">
            Location scope is set to all locations. Select a single branch under Location in the left
            sidebar to view the schedule for that venue.
          </div>
        ) : loading ? (
          <GlobalLoadingPlaceholder minHeight="min-h-[420px]" className="rounded-2xl" />
        ) : columns.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
            No courts for this location.
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div
              ref={headerScrollRef}
              className="overflow-x-auto border-b border-slate-200 dark:border-slate-800"
              style={{ paddingRight: bodyVScrollbarPadPx }}
              onScroll={(e) => syncHorizontalScroll("header", e.currentTarget.scrollLeft)}
            >
              <div
                className="flex min-w-full"
                style={{ minWidth: rowMinWidthPx }}
              >
                <div
                  className="sticky left-0 z-20 flex shrink-0 items-center justify-center border-r border-slate-200 bg-white text-xs font-medium text-slate-400 dark:border-slate-800 dark:bg-slate-900"
                  style={{ width: TIME_COL_WIDTH_PX }}
                >
                  Time
                </div>
                <div className="flex min-w-0 flex-1">
                  {columns.map((c) => (
                    <div
                      key={c.id}
                      className="flex min-h-[48px] min-w-0 flex-1 basis-0 items-center justify-center border-r border-slate-100 px-1 py-3 text-center text-xs font-semibold text-slate-800 last:border-r-0 dark:border-slate-800 dark:text-slate-100"
                      title={c.name}
                    >
                      <span className="line-clamp-2 break-words">{c.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div
              ref={bodyScrollRef}
              className="scrollbar-app max-h-[min(72vh,880px)] overflow-auto [scrollbar-gutter:stable]"
              onScroll={(e) => syncHorizontalScroll("body", e.currentTarget.scrollLeft)}
            >
              <div className="flex min-w-full" style={{ minWidth: rowMinWidthPx }}>
                <div
                  className="shrink-0 border-r border-slate-200 dark:border-slate-800"
                  style={{ width: TIME_COL_WIDTH_PX }}
                >
                  {Array.from({ length: HOUR_COUNT }, (_, i) => FIRST_HOUR + i).map((hour) => (
                    <div
                      key={hour}
                      className="flex items-start justify-end pr-2 text-[11px] font-medium tabular-nums text-slate-500 dark:text-slate-400"
                      style={{ height: PX_PER_HOUR }}
                    >
                      {format(new Date(2000, 0, 1, hour, 0, 0, 0), "h a")}
                    </div>
                  ))}
                </div>

                <div
                  className="relative flex min-w-0 flex-1"
                  style={{ height: GRID_HEIGHT_PX }}
                >
                  {nowLineStyle ? (
                    <div
                      className="pointer-events-none absolute right-0 left-0 z-10 border-t-2 border-red-500"
                      style={nowLineStyle}
                    >
                      <div className="absolute -left-1 -top-1.5 h-3 w-3 rounded-full bg-red-500" />
                    </div>
                  ) : null}

                  {columns.map((court) => {
                    const list = bookingsByCourt.get(court.id) ?? [];
                    return (
                      <div
                        key={court.id}
                        className="relative min-h-0 min-w-0 flex-1 basis-0 border-r border-slate-100 last:border-r-0 dark:border-slate-800"
                      >
                        <div className="pointer-events-none absolute inset-0 flex flex-col">
                          {Array.from({ length: HOUR_COUNT }, (_, i) => (
                            <div
                              key={i}
                              className="shrink-0 border-b border-slate-100 dark:border-slate-800"
                              style={{ height: PX_PER_HOUR }}
                            />
                          ))}
                        </div>

                        {Array.from({ length: HOUR_COUNT }, (_, i) => {
                          const hour = FIRST_HOUR + i;
                          return (
                            <button
                              key={`hit-${court.id}-${hour}`}
                              type="button"
                              aria-label={`Book ${court.name} at ${hour}:00`}
                              className="absolute right-0 left-0 z-[1] cursor-pointer border-b border-transparent hover:bg-sky-500/10 dark:hover:bg-sky-400/10"
                              style={{
                                top: i * PX_PER_HOUR,
                                height: PX_PER_HOUR,
                              }}
                              onClick={() => openBookingDialog(court, hour)}
                            />
                          );
                        })}

                        {list.map((b) => {
                          const style = bookingBlockStyle(b.startTime, b.endTime);
                          if (!style) return null;
                          const name =
                            b.user?.fullName?.trim() ||
                            b.user?.email ||
                            "Booked";
                          const bg = bookingBgForUser(b.userId);
                          return (
                            <button
                              key={b.id}
                              type="button"
                              className="absolute right-1 left-1 z-[3] cursor-pointer overflow-hidden rounded-lg border-0 px-1.5 py-1 text-left text-[10px] leading-snug text-white shadow-sm sm:text-[11px]"
                              style={{
                                ...style,
                                backgroundColor: bg,
                              }}
                              title="Edit booking"
                              onClick={(e) => {
                                e.stopPropagation();
                                openEditBooking(court, b);
                              }}
                            >
                              <div className="truncate font-semibold">{name} booked</div>
                              <div className="truncate opacity-95">
                                {formatTimeRange12(b.startTime, b.endTime)}
                              </div>
                              <div className="truncate opacity-90">
                                {formatSportCourtLine(b.sport, b.courtType)}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
