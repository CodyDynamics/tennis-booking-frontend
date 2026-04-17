"use client";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { GlobalLoadingPlaceholder } from "@/components/ui/global-loading-placeholder";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import type { AdminCourtBookingRowApi } from "@/lib/api/endpoints/bookings";
import type { CourtBookingWindowAdminApi } from "@/lib/api/endpoints/courts";
import { useAuth } from "@/lib/auth-store";
import { useSlotHold } from "@/lib/hooks/use-slot-hold";
import {
    useAdminCourtBookings,
    useBookableLocations,
    useCourtBookingWindows,
    useCourts,
    useLocations,
} from "@/lib/queries";
import { cn } from "@/lib/utils";
import type { Court } from "@/types";
import {
    addMonths,
    format,
    isSameDay,
    parse,
    startOfMonth,
    subMonths,
} from "date-fns";
import { motion } from "framer-motion";
import {
    Activity,
    BadgeCheck,
    RefreshCw,
    UserRound
} from "lucide-react";
import {
    useCallback,
    useEffect,
    useLayoutEffect,
    useMemo,
    useRef,
    useState,
    type ReactNode,
} from "react";
import { useAdmin } from "../admin-context";
import { AdminCourtFormDialog } from "../components/admin-court-form-dialog";
import {
    CourtCalendarAvailabilityLine,
    formatCourtBookingWindowsAsLines,
} from "../court-availability-format";
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

/** First visible hour row when opening this page (grid starts at {@link FIRST_HOUR}). */
const INITIAL_SCROLL_HOUR = 5;
const CALENDAR_VISUAL_SCALE = 3 / 3;

function TwoThirdsCalendar({ children }: { children: ReactNode }) {
  const innerRef = useRef<HTMLDivElement>(null);
  const [boxHeight, setBoxHeight] = useState<number>();

  useLayoutEffect(() => {
    const el = innerRef.current;
    if (!el) return;
    const update = () => setBoxHeight(el.getBoundingClientRect().height);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <div
      className="relative flex justify-center overflow-hidden"
      style={{ height: boxHeight, minHeight: boxHeight === undefined ? 200 : undefined }}
    >
      <div
        ref={innerRef}
        className="absolute top-0 left-0 w-full origin-top"
        style={{
          transform: `scale(${CALENDAR_VISUAL_SCALE})`,
          transformOrigin: "top center",
        }}
      >
        {children}
      </div>
    </div>
  );
}

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

function formatBookingDateLabel(bookingDate: string): string {
  const ymdOnly = bookingDate.slice(0, 10);
  return format(parse(ymdOnly, "yyyy-MM-dd", new Date()), "EEE, MMM d, yyyy");
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

const USER_BOOKING_BASE = [
  "#2563eb",
  "#7c3aed",
  "#0891b2",
  "#be185d",
  "#0d9488",
  "#4f46e5",
  "#16a34a",
] as const;

const BOOKING_ACCENT = [
  "#9333ea",
  "#ec4899",
  "#e11d48",
  "#f59e0b",
  "#06b6d4",
  "#3b82f6",
  "#14b8a6",
  "#22c55e",
] as const;

function stableHash(value: string): number {
  let h = 0;
  for (let i = 0; i < value.length; i++) h = (h * 31 + value.charCodeAt(i)) >>> 0;
  return h >>> 0;
}

function bookingVisual(userId: string | undefined, bookingId: string) {
  const seed = userId?.trim() ? userId : bookingId;
  const base = USER_BOOKING_BASE[stableHash(seed) % USER_BOOKING_BASE.length];
  const accent = BOOKING_ACCENT[stableHash(`${bookingId}:${seed}`) % BOOKING_ACCENT.length];
  return {
    bgColor: base,
    accentColor: accent,
    borderColor: "rgba(255,255,255,0.34)",
    badgeBg: "rgba(255,255,255,0.16)",
  };
}

function toTitle(value: string | null | undefined): string {
  if (!value) return "Unknown";
  return value
    .replace(/_/g, " ")
    .split(" ")
    .filter(Boolean)
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase())
    .join(" ");
}

function initials(name: string): string {
  const parts = name.split(" ").filter(Boolean);
  if (parts.length === 0) return "U";
  if (parts.length === 1) return parts[0]?.slice(0, 1).toUpperCase() ?? "U";
  return `${parts[0]?.slice(0, 1) ?? ""}${parts[1]?.slice(0, 1) ?? ""}`.toUpperCase();
}

function statusTone(status: string | null | undefined): string {
  const normalized = (status ?? "").toLowerCase();
  if (normalized === "confirmed") return "bg-emerald-100 text-emerald-700";
  if (normalized === "pending") return "bg-amber-100 text-amber-700";
  if (normalized === "cancelled") return "bg-rose-100 text-rose-700";
  return "bg-slate-100 text-slate-700";
}

function computeOverlayLanes(
  list: AdminCourtBookingRowApi[],
): Map<string, { lane: number }> {
  const rows = [...list]
    .map((b) => ({
      id: b.id,
      start: timeToMinutes(b.startTime),
      end: timeToMinutes(b.endTime),
      duration: Math.max(1, timeToMinutes(b.endTime) - timeToMinutes(b.startTime)),
    }))
    .sort((a, b) => {
      if (a.start !== b.start) return a.start - b.start;
      if (a.duration !== b.duration) return b.duration - a.duration;
      return a.id.localeCompare(b.id);
    });

  const active: { end: number; lane: number }[] = [];
  const lanes = new Map<string, { lane: number }>();

  for (const row of rows) {
    for (let i = active.length - 1; i >= 0; i--) {
      if (active[i] && active[i].end <= row.start) {
        active.splice(i, 1);
      }
    }
    const used = new Set(active.map((x) => x.lane));
    let lane = 0;
    while (used.has(lane)) lane++;
    active.push({ end: row.end, lane });
    lanes.set(row.id, { lane });
  }
  return lanes;
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
  const isSuperAdmin = user?.role === "super_admin";
  const { locationId: adminLocationId } = useAdmin();
  const scopedLocationId = adminLocationId !== "all" ? adminLocationId : undefined;

  const { data: locations = [] } = useLocations();
  const { data: bookableLocs = [] } = useBookableLocations(user?.role === "super_user");
  const locationsForCourtDialog =
    user?.role === "super_user" && bookableLocs.length > 0 ? bookableLocs : locations;
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
  const [courtEditOpen, setCourtEditOpen] = useState(false);
  const [courtToEdit, setCourtToEdit] = useState<Court | null>(null);
  /** Empty grid cell highlighted after one click; double-click opens create dialog. */
  const [selectedEmptySlot, setSelectedEmptySlot] = useState<{
    courtId: string;
    hour: number;
  } | null>(null);
  const [selectedBookingId, setSelectedBookingId] = useState<string | null>(null);
  const [isMobileViewport, setIsMobileViewport] = useState(false);

  const dateStr = ymd(selectedDate);

  useEffect(() => {
    setSelectedEmptySlot(null);
    setSelectedBookingId(null);
  }, [dateStr, scopedLocationId]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(max-width: 768px)");
    const apply = () => setIsMobileViewport(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  useEffect(() => {
    didInitialGridScrollRef.current = false;
  }, [scopedLocationId]);

  const { data: courts = [], isLoading: courtsLoading } = useCourts({
    locationId: scopedLocationId,
    enabled: !!scopedLocationId,
  });

  const { data: bookingWindows = [], isLoading: windowsLoading } = useCourtBookingWindows({
    enabled: !!scopedLocationId,
  });

  const windowsByCourtId = useMemo(() => {
    const m = new Map<string, CourtBookingWindowAdminApi[]>();
    for (const w of bookingWindows) {
      const arr = m.get(w.courtId) ?? [];
      arr.push(w);
      m.set(w.courtId, arr);
    }
    return m;
  }, [bookingWindows]);

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
  const bookingOverlayByCourt = useMemo(() => {
    const m = new Map<string, Map<string, { lane: number }>>();
    for (const c of columns) {
      const list = bookingsByCourt.get(c.id) ?? [];
      m.set(c.id, computeOverlayLanes(list));
    }
    return m;
  }, [columns, bookingsByCourt]);

  const headerScrollRef = useRef<HTMLDivElement>(null);
  const bodyScrollRef = useRef<HTMLDivElement>(null);
  const scrollLock = useRef(false);
  /** After switching location, scroll time grid so {@link INITIAL_SCROLL_HOUR} AM is at top once. */
  const didInitialGridScrollRef = useRef(false);

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
    setSelectedEmptySlot(null);
    setSelectedBookingId(null);
    setDialogEditingBooking(null);
    setDialogCourt(court);
    setDialogStartHour(hour);
    setDialogStartMinute(0);
    setDialogOpen(true);
  };

  const openEditBooking = (court: CalendarColumnMeta, booking: AdminCourtBookingRowApi) => {
    setSelectedEmptySlot(null);
    setSelectedBookingId(null);
    const { hour, minute } = parseStartHourMinute(booking.startTime);
    setDialogEditingBooking(booking);
    setDialogCourt(court);
    setDialogStartHour(hour);
    setDialogStartMinute(minute);
    setDialogOpen(true);
  };

  const loading = !!scopedLocationId && (courtsLoading || bookingsLoading || windowsLoading);

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

  useLayoutEffect(() => {
    if (!scopedLocationId || loading || columns.length === 0) return;
    if (didInitialGridScrollRef.current) return;
    const body = bodyScrollRef.current;
    if (!body) return;
    const offsetHours = INITIAL_SCROLL_HOUR - FIRST_HOUR;
    body.scrollTop = Math.max(0, offsetHours) * PX_PER_HOUR;
    didInitialGridScrollRef.current = true;
  }, [scopedLocationId, loading, columns.length]);

  return (
    <div className="flex flex-col gap-2 pb-10 lg:flex-row lg:items-start">
      {scopedLocationId ? (
        <>
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
            isSuperAdmin={isSuperAdmin}
          />
          <AdminCourtFormDialog
            open={courtEditOpen}
            onOpenChange={(o) => {
              setCourtEditOpen(o);
              if (!o) setCourtToEdit(null);
            }}
            editingCourt={courtToEdit}
            locations={locationsForCourtDialog}
            adminScopedLocationId={adminLocationId}
          />
        </>
      ) : null}

      <aside className="w-full shrink-0 space-y-3 lg:w-[220px]">
        <div>
          <motion.p
            className="text-xs font-bold uppercase tracking-wider text-sky-700 drop-shadow-sm dark:text-sky-300"
            animate={{
              textShadow: [
                "0 0 0px rgba(14, 165, 233, 0)",
                "0 0 14px rgba(56, 189, 248, 0.55)",
                "0 0 0px rgba(14, 165, 233, 0)",
              ],
            }}
            transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut" }}
          >
            Select date
          </motion.p>
        </div>
        <TwoThirdsCalendar>
          <Calendar
            size="compact"
            selectedDate={selectedDate}
            onSelectDate={setSelectedDate}
            visibleMonth={firstVisibleMonth}
            onVisibleMonthChange={setFirstVisibleMonth}
          />
        </TwoThirdsCalendar>
        <TwoThirdsCalendar>
          <Calendar
            size="compact"
            selectedDate={selectedDate}
            onSelectDate={setSelectedDate}
            visibleMonth={addMonths(firstVisibleMonth, 1)}
            onVisibleMonthChange={(m) => setFirstVisibleMonth(subMonths(m, 1))}
          />
        </TwoThirdsCalendar>
      </aside>

      <section className="min-w-0 flex-1 space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
              Court calendar
            </h1>
            <p className="mt-1 text-slate-600 dark:text-slate-400">
              {format(selectedDate, "EEEE, MMMM d, yyyy")} ·{" "}
              {/* {scopedLocationId ? (
                <span>{bookings.length} booking(s) shown</span>
              ) : (
                <span className="inline-flex items-center gap-1 text-amber-700 dark:text-amber-300">
                  <MapPin className="h-4 w-4 shrink-0" />
                  Choose a location in the sidebar to load courts and bookings.
                </span>
              )} */}
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
                  className="sticky left-0 z-20 flex shrink-0 items-start justify-center border-r border-slate-200 bg-white pt-2 text-xs font-bold text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
                  style={{ width: TIME_COL_WIDTH_PX }}
                >
                  Time
                </div>
                <div className="flex min-w-0 flex-1">
                  {columns.map((c) => {
                    const courtRow = courts.find((x) => x.id === c.id);
                    const availLines = formatCourtBookingWindowsAsLines(windowsByCourtId.get(c.id));
                    const headerTitle = [c.name, ...availLines].join("\n");
                    return (
                      <div
                        key={c.id}
                        className="flex min-h-[56px] min-w-0 flex-1 basis-0 items-start justify-center border-r border-slate-100 px-1 py-2 text-center text-xs font-semibold text-slate-800 last:border-r-0 dark:border-slate-800 dark:text-slate-100"
                      >
                        {courtRow ? (
                          <button
                            type="button"
                            className="flex w-full flex-col items-start justify-start gap-0.5 rounded-lg px-1 py-1 text-left transition-colors hover:bg-slate-100 dark:hover:bg-slate-800/80"
                            title={`Double-click to edit ${c.name}${availLines.length ? `\n${availLines.join("\n")}` : ""}`}
                            aria-label={`Court ${c.name}. Double-click to edit.`}
                            onDoubleClick={() => {
                              setCourtToEdit(courtRow);
                              setCourtEditOpen(true);
                            }}
                          >
                            <span className="line-clamp-2 break-words leading-tight">{c.name}</span>
                            {availLines.length ? (
                              <span className="max-w-full space-y-0.5 text-[10px] leading-tight text-slate-500 dark:text-slate-400">
                                {availLines.map((line, li) => (
                                  <CourtCalendarAvailabilityLine
                                    key={`${c.id}-avail-${li}`}
                                    line={line}
                                  />
                                ))}
                              </span>
                            ) : null}
                          </button>
                        ) : (
                          <div className="flex flex-col items-start justify-start gap-0.5 text-left" title={headerTitle}>
                            <span className="line-clamp-2 break-words leading-tight">{c.name}</span>
                            {availLines.length ? (
                              <span className="max-w-full space-y-0.5 text-[10px] leading-tight text-slate-500 dark:text-slate-400">
                                {availLines.map((line, li) => (
                                  <CourtCalendarAvailabilityLine
                                    key={`${c.id}-avail-${li}`}
                                    line={line}
                                  />
                                ))}
                              </span>
                            ) : null}
                          </div>
                        )}
                      </div>
                    );
                  })}
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
                          const isSlotSelected =
                            selectedEmptySlot?.courtId === court.id &&
                            selectedEmptySlot.hour === hour;
                          return (
                            <button
                              key={`hit-${court.id}-${hour}`}
                              type="button"
                              aria-pressed={isSlotSelected}
                              aria-label={`${court.name} at ${hour}:00. Click to select, double-click to book.`}
                              title="Click to select · Double-click to create booking"
                              className={cn(
                                "absolute right-0 left-0 z-[1] cursor-pointer border-b border-transparent",
                                isSlotSelected
                                  ? "bg-sky-500/10 dark:bg-sky-400/10"
                                  : "hover:bg-sky-500/10 dark:hover:bg-sky-400/10",
                              )}
                              style={{
                                top: i * PX_PER_HOUR,
                                height: PX_PER_HOUR,
                              }}
                              onClick={() =>
                                setSelectedEmptySlot({ courtId: court.id, hour })
                              }
                              onDoubleClick={() => openBookingDialog(court, hour)}
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
                          const visual = bookingVisual(b.userId, b.id);
                          const overlayLane =
                            bookingOverlayByCourt.get(court.id)?.get(b.id)?.lane ?? 0;
                          const laneOffsetPx = Math.min(overlayLane * 8, 24);
                          const duration = Math.max(
                            1,
                            timeToMinutes(b.endTime) - timeToMinutes(b.startTime),
                          );
                          const zIndex = 20 + Math.max(0, 600 - duration) + overlayLane;
                          const selected = selectedBookingId === b.id;
                          const detailsPanel = (
                            <>
                              <div
                                className="px-4 py-2 text-white"
                                style={{
                                  backgroundColor: visual.bgColor,
                                  borderBottom: "1px solid rgba(255,255,255,0.25)",
                                }}
                              >
                                <div className="flex items-center gap-3">
                                  <p className="text-xl font-bold leading-none tracking-tight">
                                    {court.name}
                                  </p>
                                  <span
                                    className={cn(
                                      "rounded-full border border-white/35 px-3 py-1 text-sm font-semibold text-white",
                                      statusTone(b.bookingStatus),
                                    )}
                                    style={{ backgroundColor: visual.badgeBg }}
                                  >
                                    {toTitle(b.bookingStatus)}
                                  </span>
                                </div>
                                <p className="mt-1 text-sm font-bold leading-tight text-white">
                                  {formatBookingDateLabel(
                                    typeof b.bookingDate === "string"
                                      ? b.bookingDate
                                      : dateStr,
                                  )}{" "}
                                  · {formatTimeRange12(b.startTime, b.endTime)}
                                </p>
                              </div>
                              <div className="space-y-3 p-5 text-[14px] text-slate-700 dark:text-slate-200">
                                <p className="flex items-center gap-3 font-semibold text-slate-900 dark:text-slate-100">
                                  <Activity className="h-4 w-4 text-pink-500" />
                                  {formatSportCourtLine(b.sport, b.courtType)}
                                </p>
                                <p className="flex items-center gap-3">
                                  <UserRound className="h-4 w-4 text-slate-500" />
                                  <span className="font-semibold text-slate-600 dark:text-slate-300">
                                    {isSuperAdmin ? "Owner:" : "Customer:"}
                                  </span>
                                  <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 dark:border-slate-700 dark:bg-slate-800">
                                    <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-indigo-200 text-[11px] font-bold text-indigo-700 dark:bg-indigo-700 dark:text-indigo-100">
                                      {initials(
                                        b.user?.fullName?.trim() ||
                                          b.user?.email ||
                                          "Unknown",
                                      )}
                                    </span>
                                    <span className="font-semibold text-slate-900 dark:text-slate-100">
                                      {b.user?.fullName?.trim() ||
                                        b.user?.email ||
                                        "Unknown"}
                                    </span>
                                  </span>
                                </p>
                                <p className="flex items-center gap-3">
                                  <BadgeCheck className="h-4 w-4 text-slate-500" />
                                  <span className="font-semibold text-slate-600 dark:text-slate-300">
                                    Status:
                                  </span>
                                  <span className="font-semibold text-slate-900 dark:text-slate-100">
                                    {toTitle(b.bookingStatus)}
                                  </span>
                                </p>
                              </div>
                              <div className="px-5 pb-5">
                                <Button
                                  type="button"
                                  size="sm"
                                  className="ml-auto rounded-full bg-indigo-500 px-4 hover:bg-indigo-600"
                                  onClick={() => {
                                    setSelectedBookingId(null);
                                    openEditBooking(court, b);
                                  }}
                                >
                                  Edit
                                </Button>
                              </div>
                            </>
                          );
                          return isMobileViewport ? (
                            <Dialog
                              key={b.id}
                              open={selected}
                              onOpenChange={(open) =>
                                setSelectedBookingId(open ? b.id : null)
                              }
                            >
                              <button
                                type="button"
                                className="absolute right-1 left-1 z-[3] flex cursor-pointer flex-col items-start justify-start overflow-hidden rounded-lg border-0 py-1 pr-1.5 pl-3 text-left text-[10px] leading-snug text-white shadow-sm sm:text-[11px]"
                                style={{
                                  ...style,
                                  left: `${4 + laneOffsetPx}px`,
                                  backgroundColor: visual.bgColor,
                                  border: `1px solid ${visual.borderColor}`,
                                  zIndex,
                                  boxShadow: selected
                                    ? "0 0 0 2px rgba(255,255,255,0.65)"
                                    : undefined,
                                }}
                                title="Click to view details · Double-click to edit booking"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedEmptySlot(null);
                                  setSelectedBookingId((prev) =>
                                    prev === b.id ? null : b.id,
                                  );
                                }}
                                onDoubleClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedBookingId(null);
                                  openEditBooking(court, b);
                                }}
                              >
                                <span
                                  aria-hidden
                                  className="absolute inset-y-0 left-0 w-1.5"
                                  style={{ backgroundColor: visual.accentColor }}
                                />
                                <div className="truncate font-semibold">{name} booked</div>
                                <div className="truncate opacity-95">
                                  {formatTimeRange12(b.startTime, b.endTime)}
                                </div>
                                <div className="truncate opacity-90">
                                  {formatSportCourtLine(b.sport, b.courtType)}
                                </div>
                              </button>
                              <DialogContent className="w-[min(92vw,440px)] overflow-hidden rounded-3xl border border-slate-200 p-0 shadow-xl dark:border-slate-700">
                                {detailsPanel}
                              </DialogContent>
                            </Dialog>
                          ) : (
                            <Popover
                              key={b.id}
                              open={selected}
                              onOpenChange={(open) =>
                                setSelectedBookingId(open ? b.id : null)
                              }
                            >
                              <PopoverTrigger asChild>
                                <button
                                  type="button"
                                  className="absolute right-1 left-1 z-[3] flex cursor-pointer flex-col items-start justify-start overflow-hidden rounded-lg border-0 py-1 pr-1.5 pl-3 text-left text-[10px] leading-snug text-white shadow-sm sm:text-[11px]"
                                  style={{
                                    ...style,
                                    left: `${4 + laneOffsetPx}px`,
                                    backgroundColor: visual.bgColor,
                                    border: `1px solid ${visual.borderColor}`,
                                    zIndex,
                                    boxShadow: selected
                                      ? "0 0 0 2px rgba(255,255,255,0.65)"
                                      : undefined,
                                  }}
                                  title="Click to view details · Double-click to edit booking"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedEmptySlot(null);
                                    setSelectedBookingId((prev) =>
                                      prev === b.id ? null : b.id,
                                    );
                                  }}
                                  onDoubleClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedBookingId(null);
                                    openEditBooking(court, b);
                                  }}
                                >
                                  <span
                                    aria-hidden
                                    className="absolute inset-y-0 left-0 w-1.5"
                                    style={{ backgroundColor: visual.accentColor }}
                                  />
                                  <div className="truncate font-semibold">{name} booked</div>
                                  <div className="truncate opacity-95">
                                    {formatTimeRange12(b.startTime, b.endTime)}
                                  </div>
                                  <div className="truncate opacity-90">
                                    {formatSportCourtLine(b.sport, b.courtType)}
                                  </div>
                                </button>
                              </PopoverTrigger>
                              <PopoverContent
                                align="start"
                                side="right"
                                className="w-[440px] overflow-hidden rounded-3xl border border-slate-200 p-0 shadow-xl dark:border-slate-700"
                              >
                                {detailsPanel}
                              </PopoverContent>
                            </Popover>
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
