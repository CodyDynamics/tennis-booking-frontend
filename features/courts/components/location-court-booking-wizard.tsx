"use client";

import { useMemo, useEffect, useRef, useState, useCallback } from "react";
import toast from "react-hot-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar as CalendarGrid } from "@/components/ui/calendar";
import {
  useCourts,
  useCourtSlots,
  useCreateSlotBooking,
  useUpdateSlotBooking,
  useSports,
} from "@/lib/queries";
import { useAuth } from "@/lib/auth-store";
import { GlobalLoadingPlaceholder } from "@/components/ui/global-loading-placeholder";
import { useSlotHold, slotHoldKey } from "@/lib/hooks/use-slot-hold";
import { format, parse } from "date-fns";
import { formatInTimeZone } from "date-fns-tz";
import { cn } from "@/lib/utils";
import type { CourtSlotApi } from "@/types/api";
import { ApiError } from "@/lib/api";

type Sport = string;
type CourtType = "indoor" | "outdoor";

const DURATIONS = [30, 60, 90] as const;

/** Bump `requestId` each time user chooses “Change time” so the wizard applies prefill once. */
export type LocationBookingPrefill = {
  requestId: number;
  sport: string;
  courtType: CourtType;
  bookingDate: string;
  durationMinutes: number;
  startTime: string;
  endTime: string;
  /** When set, submit updates this booking (PATCH) instead of creating a new row */
  editingBookingId?: string;
};

function wallShort(t: string) {
  const [h, m] = t.split(":");
  return `${h?.padStart(2, "0")}:${m?.padStart(2, "0")}`;
}

function toMinutes(t: string) {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

export function LocationCourtBookingWizard({
  locationId,
  locationName,
  locationTimezone,
  prefill,
  onPrefillConsumed,
}: {
  locationId: string;
  locationName: string;
  locationTimezone: string;
  prefill?: LocationBookingPrefill | null;
  onPrefillConsumed?: () => void;
}) {
  const tz = locationTimezone || "UTC";
  const { user } = useAuth();
  const createSlotBooking = useCreateSlotBooking();
  const updateSlotBooking = useUpdateSlotBooking();
  const [editingBookingId, setEditingBookingId] = useState<string | null>(null);

  const todayVenueYmd = useMemo(
    () => formatInTimeZone(new Date(), tz, "yyyy-MM-dd"),
    [tz],
  );

  const [bookingDate, setBookingDate] = useState(() =>
    formatInTimeZone(new Date(), tz, "yyyy-MM-dd"),
  );

  useEffect(() => {
    setBookingDate((d) => (d < todayVenueYmd ? todayVenueYmd : d));
  }, [todayVenueYmd]);

  const [sport, setSport] = useState<Sport | null>(null);
  const [courtType, setCourtType] = useState<CourtType | null>(null);
  const [durationMinutes, setDurationMinutes] = useState<number>(90);

  const [selectedSlot, setSelectedSlot] = useState<CourtSlotApi | null>(null);
  const [bookError, setBookError] = useState<string | null>(null);
  const [slotAutoTarget, setSlotAutoTarget] = useState<{
    start: string;
    end: string;
  } | null>(null);
  const lastPrefillIdRef = useRef(0);
  const skipNextFilterResetRef = useRef(false);

  const selectedCalendarDate = useMemo(
    () => parse(bookingDate, "yyyy-MM-dd", new Date()),
    [bookingDate],
  );

  // Clear selection when filters change (skip once after prefill applies — same render updates all filters)
  useEffect(() => {
    if (skipNextFilterResetRef.current) {
      skipNextFilterResetRef.current = false;
      return;
    }
    setSelectedSlot(null);
    setBookError(null);
    setSlotAutoTarget(null);
  }, [sport, courtType, bookingDate, durationMinutes]);

  useEffect(() => {
    if (!prefill || prefill.requestId === lastPrefillIdRef.current) return;
    lastPrefillIdRef.current = prefill.requestId;
    skipNextFilterResetRef.current = true;
    setSport(prefill.sport);
    setCourtType(prefill.courtType);
    setBookingDate(prefill.bookingDate);
    setDurationMinutes(prefill.durationMinutes);
    setSelectedSlot(null);
    setBookError(null);
    setSlotAutoTarget({
      start: wallShort(prefill.startTime),
      end: wallShort(prefill.endTime),
    });
    setEditingBookingId(prefill.editingBookingId ?? null);
    onPrefillConsumed?.();
  }, [prefill, onPrefillConsumed]);

  const { data: sportsData = [] } = useSports();
  const { data: locationCourts = [] } = useCourts({
    locationId,
    status: "active",
    enabled: Boolean(locationId),
  });

  const sportOptions = useMemo(() => {
    const allowed = new Set<string>();
    for (const c of locationCourts) {
      if (c.sport) allowed.add(String(c.sport));
    }
    allowed.add("ball-machine");
    return sportsData.filter((s) => allowed.has(s.code));
  }, [sportsData, locationCourts]);

  const courtTypeOptions = useMemo<CourtType[]>(() => {
    if (!sport) return [];
    if (sport === "ball-machine") return ["outdoor"];
    const types = new Set<CourtType>();
    for (const c of locationCourts) {
      if (c.sport !== sport) continue;
      if (c.type === "indoor" || c.type === "outdoor") types.add(c.type);
    }
    return Array.from(types);
  }, [locationCourts, sport]);

  useEffect(() => {
    if (!sport) {
      setCourtType(null);
      return;
    }
    if (!courtType || !courtTypeOptions.includes(courtType)) {
      setCourtType(courtTypeOptions[0] ?? null);
    }
  }, [sport, courtType, courtTypeOptions]);

  const slotsParams = useMemo(
    () =>
      sport && courtType
        ? {
            locationId,
            sport,
            courtType,
            bookingDate,
            durationMinutes,
            ...(editingBookingId ? { excludeBookingId: editingBookingId } : {}),
          }
        : null,
    [locationId, sport, courtType, bookingDate, durationMinutes, editingBookingId],
  );

  const {
    data: slotsData,
    isLoading: loadingSlots,
    isError: slotsError,
    error: slotsErr,
    refetch,
    isFetching,
  } = useCourtSlots(slotsParams, true);

  // ── Slot hold (soft-lock via WebSocket) ──────────────────────────────────
  const { holdCounts, myHoldKey, requestSlotHold, releaseSlotHold, notifySlotBooked, connected: wsConnected } =
    useSlotHold({
      locationId,
      sport,
      courtType,
      date: bookingDate,
      displayName: user?.fullName ?? "A guest",
      onAvailabilityChanged: () => {
        setSelectedSlot(null);
        setBookError(null);
        refetch();
      },
    });

  // Build interval holds for current sport/courtType/date from socket map:
  // key format: "sport|courtType|date|startTime|endTime" -> count
  const currentIntervalHolds = useMemo(() => {
    const items: Array<{ start: number; end: number; count: number }> = [];
    for (const [key, count] of Object.entries(holdCounts)) {
      if (!count) continue;
      const [kSport, kCourtType, kDate, kStart, kEnd] = key.split("|");
      if (
        kSport !== sport ||
        kCourtType !== courtType ||
        kDate !== bookingDate ||
        !kStart ||
        !kEnd
      ) {
        continue;
      }
      items.push({
        start: toMinutes(kStart),
        end: toMinutes(kEnd),
        count,
      });
    }
    return items;
  }, [holdCounts, sport, courtType, bookingDate]);

  // Release hold when slot is deselected (slot cleared by filter change above)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const prevSelectedSlotRef = useRef<CourtSlotApi | null>(null);
  useEffect(() => {
    const prev = prevSelectedSlotRef.current;
    if (prev && !selectedSlot && sport && courtType) {
      releaseSlotHold({
        sport,
        courtType,
        date: bookingDate,
        startTime: prev.startTime,
        endTime: prev.endTime,
      });
    }
    prevSelectedSlotRef.current = selectedSlot;
  });

  const handleSelectSlot = useCallback(
    (slot: CourtSlotApi) => {
      if (!sport || !courtType) return;
      const key = slotHoldKey(sport, courtType, bookingDate, slot.startTime, slot.endTime);

      if (
        selectedSlot &&
        slotHoldKey(sport, courtType, bookingDate, selectedSlot.startTime, selectedSlot.endTime) === key
      ) {
        releaseSlotHold({
          sport,
          courtType,
          date: bookingDate,
          startTime: slot.startTime,
          endTime: slot.endTime,
        });
        setSelectedSlot(null);
        return;
      }

      setSelectedSlot(slot);
      setBookError(null);
      requestSlotHold({
        sport,
        courtType,
        date: bookingDate,
        startTime: slot.startTime,
        endTime: slot.endTime,
      });
    },
    [sport, courtType, bookingDate, selectedSlot, releaseSlotHold, requestSlotHold],
  );

  useEffect(() => {
    if (!slotAutoTarget || !slotsData?.slots?.length || !sport || !courtType) return;
    const match = slotsData.slots.find(
      (s) =>
        wallShort(s.startTime) === slotAutoTarget.start &&
        wallShort(s.endTime) === slotAutoTarget.end,
    );
    if (!match) {
      setSlotAutoTarget(null);
      toast.error("That time slot is not available on the current grid. Pick another time.");
      return;
    }
    handleSelectSlot(match);
    setSlotAutoTarget(null);
  }, [slotAutoTarget, slotsData, sport, courtType, handleSelectSlot]);

  const slotMutationPending =
    createSlotBooking.isPending || updateSlotBooking.isPending;
  const canBook =
    !!selectedSlot && !!sport && !!courtType && !slotMutationPending;

  const handleBookNow = async () => {
    if (!selectedSlot || !canBook) return;
    setBookError(null);
    const payload = {
      locationId,
      sport: sport!,
      courtType: courtType!,
      bookingDate,
      startTime: wallShort(selectedSlot.startTime),
      endTime: wallShort(selectedSlot.endTime),
      durationMinutes: selectedSlot.durationMinutes,
    };
    try {
      if (editingBookingId) {
        await updateSlotBooking.mutateAsync({
          bookingId: editingBookingId,
          ...payload,
        });
        setEditingBookingId(null);
        toast.success("Booking updated!");
      } else {
        await createSlotBooking.mutateAsync(payload);
        toast.success("Court booked successfully!");
      }
      notifySlotBooked({
        sport: sport!,
        courtType: courtType!,
        date: bookingDate,
        startTime: selectedSlot.startTime,
        endTime: selectedSlot.endTime,
      });
      setSelectedSlot(null);
    } catch (e) {
      if (e instanceof ApiError) {
        const msg = e.body?.message;
        const text =
          typeof msg === "string" ? msg : Array.isArray(msg) ? msg.join(", ") : e.message;
        setBookError(text);
        toast.error(text);
      } else {
        const text = e instanceof Error ? e.message : "Booking failed";
        setBookError(text);
        toast.error(text);
      }
    }
  };

  return (
    <Card className="w-full border-slate-200 dark:border-slate-800 shadow-sm rounded-2xl">
      <CardHeader>
        <CardTitle className="text-xl flex items-center gap-2">
          Book a court · {locationName}
          <span
            title={wsConnected ? "Live availability connected" : "Connecting…"}
            className={cn(
              "inline-block h-2 w-2 rounded-full flex-shrink-0",
              wsConnected ? "bg-green-500" : "bg-yellow-400 animate-pulse",
            )}
          />
        </CardTitle>
        <CardDescription>
          Choose sport, indoor/outdoor, date, and duration. The system will automatically assign a
          court for your selected time slot.
        </CardDescription>
        {editingBookingId && (
          <div className="mt-3 flex flex-wrap items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-100">
            <span className="font-medium">Rescheduling an existing booking.</span>
            <button
              type="button"
              className="text-amber-800 underline underline-offset-2 hover:text-amber-950 dark:text-amber-200"
              onClick={() => {
                setEditingBookingId(null);
                setSelectedSlot(null);
                setBookError(null);
              }}
            >
              Cancel reschedule
            </button>
          </div>
        )}
      </CardHeader>

      <CardContent>
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-6">
          {/* ── Left column: filters + slot grid ── */}
          <div className="space-y-5">
            {/* Sport + Court Type */}
            <div className="flex flex-wrap gap-4">
              <div className="space-y-2">
                <Label>Select Activity</Label>
                <Select value={sport ?? ""} onValueChange={(v) => setSport(v as Sport)}>
                  <SelectTrigger className="w-[160px]">
                    <SelectValue placeholder="Select sport" />
                  </SelectTrigger>
                  <SelectContent>
                    {sportOptions.map((s) => (
                      <SelectItem key={s.code} value={s.code}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {sport && (
                <div className="space-y-2">
                  <Label>Indoor / Outdoor</Label>
                  <Select
                    value={courtType ?? ""}
                    onValueChange={(v) => setCourtType(v as CourtType)}
                  >
                    <SelectTrigger className="w-[160px]">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      {courtTypeOptions.map((t) => (
                        <SelectItem key={t} value={t}>
                          {t === "indoor" ? "Indoor" : "Outdoor"}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            {/* Duration pills */}
            <div className="space-y-2">
              <Label>Duration</Label>
              <div className="flex gap-2">
                {DURATIONS.map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setDurationMinutes(d)}
                    className={cn(
                      "rounded-full px-5 py-2 text-sm font-semibold border transition-all",
                      durationMinutes === d
                        ? "bg-primary text-primary-foreground border-primary shadow"
                        : "bg-background text-foreground border-slate-200 dark:border-slate-700 hover:border-primary hover:text-primary",
                    )}
                  >
                    {d} min
                  </button>
                ))}
              </div>
            </div>

            {/* Slot grid */}
            {loadingSlots && (
              <GlobalLoadingPlaceholder minHeight="min-h-[160px]" />
            )}

            {slotsError && (
              <p className="text-sm text-destructive">
                {(slotsErr as Error)?.message ?? "Could not load available slots."}
              </p>
            )}

            {!loadingSlots && slotsData && slotsData.slots.length === 0 && (
              <p className="text-sm text-muted-foreground">
                No slots available for this combination. Try a different date or duration.
              </p>
            )}

            {!loadingSlots && slotsData && slotsData.slots.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">
                    Select a time slot. A court will be automatically assigned.
                  </p>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => refetch()}
                    disabled={isFetching}
                    className="text-xs"
                  >
                    {isFetching ? "Refreshing…" : "↺ Refresh"}
                  </Button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                  {slotsData.slots.map((slot) => {
                    const key = slotHoldKey(sport!, courtType!, bookingDate, slot.startTime, slot.endTime);
                    const isSelected = myHoldKey === key || (selectedSlot?.startTime === slot.startTime && selectedSlot?.endTime === slot.endTime);
                    const holdCount = holdCounts[key] ?? 0;

                    // Cross-duration overlap-aware hold load:
                    // For a slot [S,E), we reduce capacity by the MAX concurrent holds within [S,E),
                    // not just exact-key holds. This fixes 30m holds affecting 60m/90m slots correctly.
                    const slotStart = toMinutes(slot.startTime);
                    const slotEnd = toMinutes(slot.endTime);
                    const events: Array<{ t: number; delta: number }> = [];
                    for (const h of currentIntervalHolds) {
                      const overlapStart = Math.max(slotStart, h.start);
                      const overlapEnd = Math.min(slotEnd, h.end);
                      if (overlapStart < overlapEnd) {
                        events.push({ t: overlapStart, delta: h.count });
                        events.push({ t: overlapEnd, delta: -h.count });
                      }
                    }
                    events.sort((a, b) => (a.t === b.t ? a.delta - b.delta : a.t - b.t));
                    let active = 0;
                    let maxConcurrentHolds = 0;
                    for (const e of events) {
                      active += e.delta;
                      if (active > maxConcurrentHolds) maxConcurrentHolds = active;
                    }

                    const realAvailable = Math.max(
                      0,
                      slot.availableCount - maxConcurrentHolds,
                    );
                    const isFull = realAvailable <= 0 && !isSelected;

                    return (
                      <button
                        key={key}
                        type="button"
                        disabled={isFull}
                        onClick={() => !isFull && handleSelectSlot(slot)}
                        className={cn(
                          "relative rounded-xl border p-3 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                          isSelected
                            ? "bg-primary text-primary-foreground border-primary shadow-md scale-[1.02]"
                            : isFull
                              ? "bg-slate-100 dark:bg-slate-800 text-muted-foreground border-slate-200 dark:border-slate-700 opacity-60 cursor-not-allowed"
                              : "bg-background border-slate-200 dark:border-slate-700 hover:border-primary hover:shadow-sm cursor-pointer",
                        )}
                      >
                        <div className="font-semibold text-sm">
                          {wallShort(slot.startTime)}
                        </div>
                        {/* <div className={cn("text-xs mt-0.5", isSelected ? "text-primary-foreground/80" : "text-muted-foreground")}>
                          – {wallShort(slot.endTime)}
                        </div>
                        <div className={cn(
                          "text-xs mt-1.5 font-medium",
                          isFull
                            ? "text-muted-foreground"
                            : isSelected
                              ? "text-primary-foreground/90"
                              : realAvailable <= 1
                                ? "text-amber-600 dark:text-amber-400"
                                : "text-emerald-600 dark:text-emerald-400",
                        )}>
                          {isFull ? "Full" : `${realAvailable} left`}
                        </div> */}
                        {holdCount > 0 && !isFull && (
                          <div className={cn(
                            "absolute top-2 right-2 h-2 w-2 rounded-full",
                            isSelected ? "bg-primary-foreground/70" : "bg-amber-400",
                          )} title={`${holdCount} user${holdCount > 1 ? "s" : ""} holding`} />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {bookError && (
              <p className="text-sm text-destructive font-medium">{bookError}</p>
            )}
          </div>

          {/* ── Right column: calendar ── */}
          <div className="space-y-3 lg:border-l lg:pl-6 dark:border-slate-800">
            <Label>Date</Label>
            <CalendarGrid
              selectedDate={selectedCalendarDate}
              onSelectDate={(d) => setBookingDate(format(d, "yyyy-MM-dd"))}
              isDateDisabled={(d) => format(d, "yyyy-MM-dd") < todayVenueYmd}
              className="border rounded-xl p-0 shadow-none"
            />
          </div>
        </div>

        {/* ── Booking summary + confirm ── */}
        {selectedSlot && (
          <div className="mt-6 rounded-xl border border-primary/30 bg-primary/5 dark:bg-primary/10 p-4 space-y-3">
            <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
              Your selection
            </h3>
            <ul className="text-sm space-y-1">
              <li>
                <span className="font-medium capitalize">{sport ?? "-"}</span>{" "}
                <span className="text-muted-foreground capitalize">· {courtType ?? "-"}</span>
              </li>
              <li className="font-medium">{format(selectedCalendarDate, "EEEE, MMMM d, yyyy")}</li>
              <li>
                <span className="font-semibold">
                  {wallShort(selectedSlot.startTime)} – {wallShort(selectedSlot.endTime)}
                </span>{" "}
                <span className="text-muted-foreground">({selectedSlot.durationMinutes} min)</span>
              </li>
              <li className="text-muted-foreground text-xs">
                {editingBookingId
                  ? "Confirm to update your booking to this slot (court may change)."
                  : "A court will be assigned automatically at booking time."}
              </li>
            </ul>

            <Button
              type="button"
              size="lg"
              className="w-full sm:w-auto rounded-full px-10 mt-1"
              disabled={!canBook || slotMutationPending}
              onClick={handleBookNow}
            >
              {slotMutationPending
                ? editingBookingId
                  ? "Updating…"
                  : "Booking…"
                : editingBookingId
                  ? "Update now"
                  : "Book now"}
            </Button>
          </div>
        )}

        {!selectedSlot && (
          <div className="mt-4 pt-2">
            <Button
              type="button"
              size="lg"
              className="rounded-full px-10"
              disabled
            >
              {editingBookingId ? "Update now" : "Book now"}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
