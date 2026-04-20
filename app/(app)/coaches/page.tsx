"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { useRouter } from "next/navigation";
import type { AdminCourtBookingRowApi } from "@/lib/api/endpoints/bookings";
import { useAuth } from "@/lib/auth-store";
import {
  useAdminCourtBookings,
  useCoachCalendarBookings,
  useCoaches,
  useCourts,
  useLocations,
} from "@/lib/queries";
import { GlobalLoadingPlaceholder } from "@/components/ui/global-loading-placeholder";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { addMonths, format, startOfMonth, subMonths } from "date-fns";
import { CalendarDays, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Court } from "@/types";
import { CourtCalendarBookingDialog, type CalendarColumnMeta } from "../admin/court-calendar/court-calendar-booking-dialog";
import { CourtBookingDetailsCard } from "@/components/calendar/court-booking-details-card";

const TIME_COL_WIDTH_PX = 52;
const MIN_COURT_COL_PX = 100;
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
  const [h, m] = t.split(":").map(Number);
  if (Number.isNaN(h)) return 0;
  return h * 60 + (Number.isNaN(m) ? 0 : m);
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

function formatTimeRange12(startTime: string, endTime: string): string {
  const base = new Date(2000, 0, 1);
  const [sh, sm] = startTime.slice(0, 5).split(":").map(Number);
  const [eh, em] = endTime.slice(0, 5).split(":").map(Number);
  const a = new Date(base);
  a.setHours(sh, sm ?? 0, 0, 0);
  const b = new Date(base);
  b.setHours(eh, em ?? 0, 0, 0);
  return `${format(a, "h:mm a")} - ${format(b, "h:mm a")}`;
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
      : courtType?.trim() || "-";
  return `${sportLabel} · ${env}`;
}

function bookingBlockStyle(startTime: string, endTime: string): CSSProperties | null {
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
    minHeight: 52,
  };
}

function primaryCourtType(c: Court): string {
  const t = c.courtTypes?.[0] ?? c.type ?? "outdoor";
  return t === "indoor" ? "indoor" : "outdoor";
}

function buildColumns(courts: Court[], bookings: AdminCourtBookingRowApi[]): CalendarColumnMeta[] {
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
    ordered.push({
      id: b.courtId,
      name: b.court?.name ?? c?.name ?? `Court ${b.courtId.slice(0, 8)}...`,
      sport: (b.sport ?? c?.sports?.[0] ?? c?.sport ?? "tennis").toLowerCase(),
      courtTypeForSlot: c ? primaryCourtType(c) : "outdoor",
      areaId: c?.areaId ?? null,
    });
  }
  return ordered;
}

export default function CoachesPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const isSuperAdmin = user?.role === "super_admin";
  const isCoach = user?.role === "coach";
  const coachMembershipLocationIds = useMemo(() => {
    if (!isCoach) return [];
    return (user?.memberships ?? [])
      .filter((m) => ["active", "grace", "pending_payment"].includes((m.status ?? "").toLowerCase()))
      .map((m) => m.locationId);
  }, [isCoach, user?.memberships]);
  const coachPrimaryLocationId = coachMembershipLocationIds[0] ?? null;

  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [firstVisibleMonth, setFirstVisibleMonth] = useState(() => startOfMonth(new Date()));
  const [selectedCoachFilter, setSelectedCoachFilter] = useState("all");
  const [selectedLocationFilter, setSelectedLocationFilter] = useState("all");
  const [selectedBookingId, setSelectedBookingId] = useState<string | null>(null);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogCourt, setDialogCourt] = useState<CalendarColumnMeta | null>(null);
  const [dialogStartHour, setDialogStartHour] = useState(9);
  const [dialogStartMinute, setDialogStartMinute] = useState(0);
  const [dialogEditingBooking, setDialogEditingBooking] =
    useState<AdminCourtBookingRowApi | null>(null);

  const { data: coaches = [] } = useCoaches();
  const { data: locations = [] } = useLocations();
  const effectiveLocationId = useMemo(() => {
    if (isCoach) return coachPrimaryLocationId;
    if (isSuperAdmin) return selectedLocationFilter === "all" ? null : selectedLocationFilter;
    return null;
  }, [isCoach, coachPrimaryLocationId, isSuperAdmin, selectedLocationFilter]);
  const { data: courts = [], isLoading: courtsLoading } = useCourts({
    enabled: isAuthenticated,
    locationId: effectiveLocationId ?? undefined,
  });

  const dateStr = ymd(selectedDate);
  const adminBookingsQuery = useAdminCourtBookings({
    locationId: effectiveLocationId ?? undefined,
    from: dateStr,
    to: dateStr,
    enabled: isAuthenticated && isSuperAdmin,
  });
  const coachBookingsQuery = useCoachCalendarBookings({
    from: dateStr,
    to: dateStr,
    enabled: isAuthenticated && isCoach,
  });
  const bookingsRaw = useMemo(
    () =>
      isSuperAdmin
        ? adminBookingsQuery.data ?? []
        : isCoach
          ? coachBookingsQuery.data ?? []
          : [],
    [isSuperAdmin, adminBookingsQuery.data, isCoach, coachBookingsQuery.data],
  );
  const bookingsLoading = isSuperAdmin
    ? adminBookingsQuery.isLoading
    : isCoach
      ? coachBookingsQuery.isLoading
      : false;
  const bookingsFetching = isSuperAdmin
    ? adminBookingsQuery.isFetching
    : isCoach
      ? coachBookingsQuery.isFetching
      : false;
  const bookingsError = isSuperAdmin
    ? adminBookingsQuery.error
    : isCoach
      ? coachBookingsQuery.error
      : null;
  const refetchBookings = () =>
    isSuperAdmin ? adminBookingsQuery.refetch() : coachBookingsQuery.refetch();


  const myCoachProfile = useMemo(
    () => coaches.find((c) => c.userId === user?.id),
    [coaches, user?.id],
  );

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) {
      router.replace("/login?next=%2Fcoaches");
    }
  }, [authLoading, isAuthenticated, router]);

  useEffect(() => {
    if (isCoach && myCoachProfile) {
      setSelectedCoachFilter(myCoachProfile.id);
    }
  }, [isCoach, myCoachProfile]);
  useEffect(() => {
    if (isCoach) {
      setSelectedLocationFilter(coachPrimaryLocationId ?? "all");
    }
  }, [isCoach, coachPrimaryLocationId]);

  const openEditBooking = (court: CalendarColumnMeta, booking: AdminCourtBookingRowApi) => {
    const { hour, minute } = parseStartHourMinute(booking.startTime);
    setDialogEditingBooking(booking);
    setDialogCourt(court);
    setDialogStartHour(hour);
    setDialogStartMinute(minute);
    setDialogOpen(true);
  };

  const visibleBookings = useMemo(() => {
    const base = bookingsRaw.filter((b) => b.bookingStatus !== "cancelled" && !!b.coachId);
    const locationScoped =
      effectiveLocationId == null ? base : base.filter((b) => b.locationId === effectiveLocationId);
    if (isCoach) {
      if (!myCoachProfile?.id) return [];
      return locationScoped.filter((b) => b.coachId === myCoachProfile.id);
    }
    if (isSuperAdmin) {
      if (selectedCoachFilter === "all") return locationScoped;
      return locationScoped.filter((b) => b.coachId === selectedCoachFilter);
    }
    return [];
  }, [bookingsRaw, effectiveLocationId, isCoach, myCoachProfile?.id, isSuperAdmin, selectedCoachFilter]);

  const columns = useMemo(
    () => buildColumns(courts, visibleBookings),
    [courts, visibleBookings],
  );
  const rowMinWidthPx = Math.max(100, columns.length * MIN_COURT_COL_PX);

  const bookingsByCourt = useMemo(() => {
    const map = new Map<string, AdminCourtBookingRowApi[]>();
    for (const booking of visibleBookings) {
      const list = map.get(booking.courtId) ?? [];
      list.push(booking);
      map.set(booking.courtId, list);
    }
    map.forEach((list) =>
      list.sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime)),
    );
    return map;
  }, [visibleBookings]);

  const headerScrollRef = useRef<HTMLDivElement>(null);
  const bodyScrollRef = useRef<HTMLDivElement>(null);
  const scrollLock = useRef(false);
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

  if (authLoading || !isAuthenticated) {
    return (
      <div className="container mx-auto px-4 py-8">
        <GlobalLoadingPlaceholder minHeight="min-h-[50vh]" />
      </div>
    );
  }

  if (courtsLoading || bookingsLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <GlobalLoadingPlaceholder minHeight="min-h-[50vh]" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 px-4 py-6 lg:flex-row lg:items-start">
      <CourtCalendarBookingDialog
        open={dialogOpen}
        onOpenChange={(v) => {
          setDialogOpen(v);
          if (!v) {
            setDialogCourt(null);
            setDialogEditingBooking(null);
          }
        }}
        locationTimezone={null}
        coachLocationId={effectiveLocationId ?? dialogEditingBooking?.locationId ?? null}
        bookingDate={dateStr}
        column={dialogCourt}
        startHour={dialogStartHour}
        startMinute={dialogStartMinute}
        editingBooking={dialogEditingBooking}
        isSuperAdmin={isSuperAdmin}
      />

      <aside className="w-full shrink-0 space-y-3 lg:w-[220px]">
        <p className="text-xs font-bold uppercase tracking-wider text-sky-700 dark:text-sky-300">
          Select date
        </p>
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
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
              Coaches Calendar
            </h1>
            <p className="mt-1 text-slate-600 dark:text-slate-400">
              {format(selectedDate, "EEEE, MMMM d, yyyy")}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {isSuperAdmin ? (
              <>
                <Select value={selectedLocationFilter} onValueChange={setSelectedLocationFilter}>
                  <SelectTrigger className="w-[240px] rounded-xl">
                    <SelectValue placeholder="Filter by location" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All locations</SelectItem>
                    {locations.map((location) => (
                      <SelectItem key={location.id} value={location.id}>
                        {location.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={selectedCoachFilter} onValueChange={setSelectedCoachFilter}>
                  <SelectTrigger className="w-[240px] rounded-xl">
                    <SelectValue placeholder="Filter by coach" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All assigned coaches</SelectItem>
                    {coaches.map((coach) => (
                      <SelectItem key={coach.id} value={coach.id}>
                        {coach.user?.fullName ||
                          coach.user?.email ||
                          `Coach ${coach.id.slice(0, 8)}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </>
            ) : null}
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="shrink-0 rounded-xl"
              disabled={bookingsFetching}
              onClick={() => void refetchBookings()}
            >
              <RefreshCw className={cn("h-4 w-4", bookingsFetching && "animate-spin")} />
            </Button>
          </div>
        </div>

        {bookingsError ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/20 dark:text-rose-300">
            Failed to load booking calendar data. Please check your permission and try again.
          </div>
        ) : columns.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
            <div className="mb-2 inline-flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
              <CalendarDays className="h-5 w-5" />
            </div>
            <p>No coach bookings found for the selected date.</p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div
              ref={headerScrollRef}
              className="overflow-x-auto border-b border-slate-200 dark:border-slate-800"
              onScroll={(e) => syncHorizontalScroll("header", e.currentTarget.scrollLeft)}
            >
              <div className="flex min-w-full" style={{ minWidth: rowMinWidthPx }}>
                <div
                  className="sticky left-0 z-20 flex shrink-0 items-start justify-center border-r border-slate-200 bg-white pt-2 text-xs font-bold text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
                  style={{ width: TIME_COL_WIDTH_PX }}
                >
                  Time
                </div>
                <div className="flex min-w-0 flex-1">
                  {columns.map((c) => (
                    <div
                      key={c.id}
                      className="flex min-h-[56px] min-w-0 flex-1 basis-0 items-start justify-center border-r border-slate-100 px-1 py-2 text-center text-xs font-semibold text-slate-800 last:border-r-0 dark:border-slate-800 dark:text-slate-100"
                    >
                      <span className="line-clamp-2 break-words leading-tight">{c.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div
              ref={bodyScrollRef}
              className="scrollbar-app max-h-[min(72vh,880px)] overflow-auto"
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
                <div className="relative flex min-w-0 flex-1" style={{ height: GRID_HEIGHT_PX }}>
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

                        {list.map((b) => {
                          const style = bookingBlockStyle(b.startTime, b.endTime);
                          if (!style) return null;
                          const selected = selectedBookingId === b.id;
                          const coachDisplayName =
                            coaches.find((c) => c.id === b.coachId)?.user?.fullName ||
                            coaches.find((c) => c.id === b.coachId)?.user?.email ||
                            "Assigned coach";
                          return (
                            <Popover
                              key={b.id}
                              open={selected}
                              onOpenChange={(open) => setSelectedBookingId(open ? b.id : null)}
                            >
                              <PopoverTrigger asChild>
                                <button
                                  type="button"
                                  className="absolute right-1 left-1 z-[3] flex cursor-pointer flex-col items-start justify-start overflow-hidden rounded-lg border border-white/35 bg-teal-600 py-1 pr-1.5 pl-3 text-left text-[10px] leading-snug text-white shadow-sm sm:text-[11px]"
                                  title="Click to view details"
                                  style={style}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedBookingId((prev) => (prev === b.id ? null : b.id));
                                  }}
                                >
                                  <span
                                    aria-hidden
                                    className="absolute inset-y-0 left-0 w-1.5 bg-emerald-500"
                                  />
                                  <div className="truncate font-semibold">
                                    {coachDisplayName}
                                  </div>
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
                                className="w-[380px] overflow-hidden rounded-3xl border border-slate-200 p-0 shadow-xl dark:border-slate-700"
                              >
                                <CourtBookingDetailsCard
                                  courtName={court.name}
                                  bookingDate={typeof b.bookingDate === "string" ? b.bookingDate : dateStr}
                                  startTime={b.startTime}
                                  endTime={b.endTime}
                                  bookingStatus={b.bookingStatus}
                                  sport={b.sport}
                                  courtType={b.courtType}
                                  ownerLabel="Coach"
                                  ownerName={coachDisplayName}
                                  onEdit={
                                    isSuperAdmin
                                      ? () => {
                                          setSelectedBookingId(null);
                                          openEditBooking(court, b);
                                        }
                                      : undefined
                                  }
                                  editLabel="Edit"
                                />
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
