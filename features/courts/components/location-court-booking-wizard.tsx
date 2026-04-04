"use client";

import { useMemo, useEffect, useRef, useState, useCallback } from "react";
import toast from "react-hot-toast";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Calendar as CalendarGrid } from "@/components/ui/calendar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import type { CourtBooking } from "@/types";
import { ApiError } from "@/lib/api";
import { motion } from "framer-motion";

type Sport = string;
type CourtType = "indoor" | "outdoor";

const DURATIONS = [30, 60, 90] as const;

/** 30-minute steps for “search available time” range (venue-friendly window). */
const TIME_OPTIONS: string[] = (() => {
  const out: string[] = [];
  for (let h = 5; h <= 23; h++) {
    for (const m of [0, 30]) {
      if (h === 23 && m === 30) break;
      out.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
    }
  }
  return out;
})();

/** Default time window shown in “Search for available times” (must exist in TIME_OPTIONS). */
const DEFAULT_TIME_FROM = "08:00";
const DEFAULT_TIME_TO = "11:00";

/** Public booking activity order (Tennis → Pickleball → Ball Machine). */
const ACTIVITY_ORDER = ["tennis", "pickleball", "ball-machine"] as const;

function activitySortIndex(code: string): number {
  const i = (ACTIVITY_ORDER as readonly string[]).indexOf(code);
  return i === -1 ? ACTIVITY_ORDER.length + 1 : i;
}

function sportButtonLabel(code: string, name: string): string {
  if (code === "ball-machine") return "Ball Machine";
  return name;
}

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

/** US 12-hour clock for display (e.g. 8:00 AM, 1:30 PM). */
function formatTimeAmPm(hhmm: string): string {
  const t = wallShort(hhmm);
  const [hStr, mi] = t.split(":");
  const h = Number(hStr);
  const suffix = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${mi} ${suffix}`;
}

function toMinutes(t: string) {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

/** Compact time dropdown; width follows label text (e.g. 8:00 AM). */
function WizardTimeSelect({
  value,
  options,
  onChange,
}: {
  value: string | null | undefined;
  options: string[];
  onChange: (v: string) => void;
}) {
  return (
    <Select value={value ?? undefined} onValueChange={onChange}>
      <SelectTrigger className="h-9 w-fit max-w-[9rem] shrink-0 px-2.5 text-xs rounded-lg [&>span]:whitespace-nowrap">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map((t) => (
          <SelectItem key={t} value={t} className="text-xs">
            {formatTimeAmPm(t)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

/** Active (non-cancelled) court booking on this calendar day, excluding the row being rescheduled. */
function hasOtherCourtBookingOnDate(
  bookings: CourtBooking[] | undefined,
  ymd: string,
  excludeBookingId: string | null,
): boolean {
  if (!bookings?.length) return false;
  return bookings.some(
    (b) =>
      b.bookingStatus !== "cancelled" &&
      b.bookingDate.slice(0, 10) === ymd &&
      b.id !== excludeBookingId,
  );
}

export function LocationCourtBookingWizard({
  locationId,
  areaId,
  locationName,
  locationTimezone,
  prefill,
  onPrefillConsumed,
  userCourtBookings,
}: {
  locationId: string;
  areaId?: string;
  locationName: string;
  locationTimezone: string;
  prefill?: LocationBookingPrefill | null;
  onPrefillConsumed?: () => void;
  /** Used to enforce one booking per day before Search (server enforces on confirm). */
  userCourtBookings?: CourtBooking[];
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

  const [bookingDate, setBookingDate] = useState<string | null>(null);

  useEffect(() => {
    setBookingDate((d) =>
      d != null && d < todayVenueYmd ? todayVenueYmd : d,
    );
  }, [todayVenueYmd]);

  const [sport, setSport] = useState<Sport | null>(null);
  const [courtType, setCourtType] = useState<CourtType | null>(null);
  const [durationMinutes, setDurationMinutes] = useState<number | null>(null);
  const [timeFrom, setTimeFrom] = useState<string | null>(DEFAULT_TIME_FROM);
  const [timeTo, setTimeTo] = useState<string | null>(DEFAULT_TIME_TO);
  /** User clicked Search — show inline validation for empty fields. */
  const [searchAttempted, setSearchAttempted] = useState(false);
  /** Last successful Search — fetch slots and show grid until filters change. */
  const [searchCommitted, setSearchCommitted] = useState(false);
  /** Time window applied on last successful Search (filters displayed slots). */
  const [appliedTimeFrom, setAppliedTimeFrom] = useState<string | null>(null);
  const [appliedTimeTo, setAppliedTimeTo] = useState<string | null>(null);

  const [selectedSlot, setSelectedSlot] = useState<CourtSlotApi | null>(null);
  const [bookError, setBookError] = useState<string | null>(null);
  const [slotAutoTarget, setSlotAutoTarget] = useState<{
    start: string;
    end: string;
  } | null>(null);
  const lastPrefillIdRef = useRef(0);
  const skipNextFilterResetRef = useRef(false);
  /** Increment when user picks a date before choosing activity — retriggers motion wrapper. */
  const [activityAttentionKey, setActivityAttentionKey] = useState(0);

  const selectedCalendarDate = useMemo(
    () =>
      bookingDate
        ? parse(bookingDate, "yyyy-MM-dd", new Date())
        : undefined,
    [bookingDate],
  );

  const timeToOptions = useMemo(() => {
    if (!timeFrom) return TIME_OPTIONS;
    const f = toMinutes(timeFrom);
    return TIME_OPTIONS.filter((t) => toMinutes(t) > f);
  }, [timeFrom]);

  useEffect(() => {
    if (!timeFrom || !timeTo) return;
    if (toMinutes(timeTo) <= toMinutes(timeFrom)) {
      const later = TIME_OPTIONS.filter(
        (t) => toMinutes(t) > toMinutes(timeFrom),
      );
      setTimeTo(
        later[0] ?? TIME_OPTIONS[TIME_OPTIONS.length - 1] ?? DEFAULT_TIME_TO,
      );
    }
  }, [timeFrom, timeTo]);

  // Clear selection when filters change (skip once after prefill applies — same render updates all filters)
  useEffect(() => {
    if (skipNextFilterResetRef.current) {
      skipNextFilterResetRef.current = false;
      return;
    }
    setSelectedSlot(null);
    setBookError(null);
    setSlotAutoTarget(null);
    setSearchCommitted(false);
    setAppliedTimeFrom(null);
    setAppliedTimeTo(null);
  }, [sport, courtType, bookingDate, durationMinutes, timeFrom, timeTo]);

  useEffect(() => {
    if (!prefill || prefill.requestId === lastPrefillIdRef.current) return;
    lastPrefillIdRef.current = prefill.requestId;
    skipNextFilterResetRef.current = true;
    setSport(prefill.sport);
    setCourtType(prefill.courtType);
    setBookingDate(prefill.bookingDate);
    setDurationMinutes(prefill.durationMinutes);
    const t0 = wallShort(prefill.startTime);
    const t1 = wallShort(prefill.endTime);
    setTimeFrom(t0);
    setTimeTo(t1);
    setAppliedTimeFrom(t0);
    setAppliedTimeTo(t1);
    setSearchCommitted(true);
    setSearchAttempted(false);
    setSelectedSlot(null);
    setBookError(null);
    setSlotAutoTarget({
      start: t0,
      end: t1,
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
    const scopedCourts = areaId
      ? locationCourts.filter((c) => c.areaId === areaId)
      : locationCourts;
    for (const c of scopedCourts) {
      if (c.sports?.length) {
        for (const code of c.sports) allowed.add(String(code));
      } else if (c.sport) allowed.add(String(c.sport));
    }
    allowed.add("ball-machine");
    return sportsData
      .filter((s) => allowed.has(s.code))
      .sort((a, b) => activitySortIndex(a.code) - activitySortIndex(b.code));
  }, [sportsData, locationCourts, areaId]);

  const courtTypeOptions = useMemo<CourtType[]>(() => {
    if (!sport) return [];
    if (sport === "ball-machine") return ["outdoor"];
    const types = new Set<CourtType>();
    const scopedCourts = areaId
      ? locationCourts.filter((c) => c.areaId === areaId)
      : locationCourts;
    for (const c of scopedCourts) {
      const supports =
        c.sports?.length > 0 ? c.sports.includes(sport) : c.sport === sport;
      if (!supports) continue;
      const envs = c.courtTypes?.length ? c.courtTypes : [c.type];
      for (const t of envs) {
        if (t === "indoor" || t === "outdoor") types.add(t);
      }
    }
    return Array.from(types);
  }, [locationCourts, sport, areaId]);

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
      searchCommitted &&
        sport &&
        courtType &&
        bookingDate &&
        durationMinutes != null
        ? {
          locationId,
          ...(areaId ? { areaId } : {}),
          sport,
          courtType,
          bookingDate,
          durationMinutes,
          ...(editingBookingId ? { excludeBookingId: editingBookingId } : {}),
        }
        : null,
    [
      searchCommitted,
      locationId,
      areaId,
      sport,
      courtType,
      bookingDate,
      durationMinutes,
      editingBookingId,
    ],
  );

  const {
    data: slotsData,
    isLoading: loadingSlots,
    isError: slotsError,
    error: slotsErr,
    refetch,
  } = useCourtSlots(slotsParams, Boolean(slotsParams));

  const filteredSlots = useMemo(() => {
    const slots = slotsData?.slots;
    if (!slots?.length || !appliedTimeFrom || !appliedTimeTo) return slots ?? [];
    const fromM = toMinutes(appliedTimeFrom);
    const toM = toMinutes(appliedTimeTo);
    if (toM <= fromM) return [];
    return slots.filter((s) => {
      const ss = toMinutes(s.startTime);
      const se = toMinutes(s.endTime);
      return ss < toM && se > fromM;
    });
  }, [slotsData, appliedTimeFrom, appliedTimeTo]);

  // ── Slot hold (soft-lock via WebSocket) ──────────────────────────────────
  const {
    holdCounts,
    myHoldKey,
    requestSlotHold,
    releaseSlotHold,
    notifySlotBooked,
    connected: wsConnected,
  } = useSlotHold({
    locationId,
    sport,
    courtType,
    date: bookingDate ?? null,
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
    if (prev && !selectedSlot && sport && courtType && bookingDate) {
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
      if (!sport || !courtType || !bookingDate) return;
      const key = slotHoldKey(
        sport,
        courtType,
        bookingDate,
        slot.startTime,
        slot.endTime,
      );

      if (
        selectedSlot &&
        slotHoldKey(
          sport,
          courtType,
          bookingDate,
          selectedSlot.startTime,
          selectedSlot.endTime,
        ) === key
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

  const handleSearch = useCallback(() => {
    setSearchAttempted(true);
    if (!bookingDate) return;
    if (sportOptions.length > 0 && !sport) return;
    if (sport && courtTypeOptions.length === 0) return;
    if (sport && courtTypeOptions.length > 0 && !courtType) return;
    if (durationMinutes == null) return;
    if (!timeFrom || !timeTo) return;
    if (toMinutes(timeTo) <= toMinutes(timeFrom)) return;
    if (
      hasOtherCourtBookingOnDate(
        userCourtBookings,
        bookingDate,
        editingBookingId,
      )
    ) {
      toast.error(
        "You already have a court booking on this date. Only one booking per day is allowed.",
      );
      return;
    }
    setSearchCommitted(true);
    setAppliedTimeFrom(timeFrom);
    setAppliedTimeTo(timeTo);
  }, [
    bookingDate,
    sport,
    sportOptions.length,
    courtType,
    courtTypeOptions.length,
    durationMinutes,
    timeFrom,
    timeTo,
    userCourtBookings,
    editingBookingId,
  ]);

  useEffect(() => {
    if (!slotAutoTarget || !slotsData?.slots?.length || !sport || !courtType)
      return;
    const match = slotsData.slots.find(
      (s) =>
        wallShort(s.startTime) === slotAutoTarget.start &&
        wallShort(s.endTime) === slotAutoTarget.end,
    );
    if (!match) {
      setSlotAutoTarget(null);
      toast.error(
        "That time slot is not available on the current grid. Pick another time.",
      );
      return;
    }
    handleSelectSlot(match);
    setSlotAutoTarget(null);
  }, [slotAutoTarget, slotsData, sport, courtType, handleSelectSlot]);

  const slotMutationPending =
    createSlotBooking.isPending || updateSlotBooking.isPending;
  const canBook =
    !!selectedSlot &&
    !!sport &&
    !!courtType &&
    !!bookingDate &&
    !slotMutationPending;

  const handleConfirmBooking = async () => {
    if (!selectedSlot || !canBook || !bookingDate) return;
    setBookError(null);
    const payload = {
      locationId,
      ...(areaId ? { areaId } : {}),
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
          typeof msg === "string"
            ? msg
            : Array.isArray(msg)
              ? msg.join(", ")
              : e.message;
        setBookError(text);
        toast.error(text);
      } else {
        const text = e instanceof Error ? e.message : "Booking failed";
        setBookError(text);
        toast.error(text);
      }
    }
  };

  const clearBookingFormState = useCallback(() => {
    if (selectedSlot && sport && courtType && bookingDate) {
      releaseSlotHold({
        sport,
        courtType,
        date: bookingDate,
        startTime: selectedSlot.startTime,
        endTime: selectedSlot.endTime,
      });
    }
    setSelectedSlot(null);
    setSport(null);
    setCourtType(null);
    setDurationMinutes(null);
    setBookingDate(null);
    setTimeFrom(DEFAULT_TIME_FROM);
    setTimeTo(DEFAULT_TIME_TO);
    setSearchAttempted(false);
    setSearchCommitted(false);
    setAppliedTimeFrom(null);
    setAppliedTimeTo(null);
    setBookError(null);
    setEditingBookingId(null);
    setSlotAutoTarget(null);
    setActivityAttentionKey(0);
  }, [selectedSlot, sport, courtType, bookingDate, releaseSlotHold]);

  const handleCancelSelections = clearBookingFormState;

  const handleCalendarSelect = useCallback(
    (d: Date) => {
      const ymd = format(d, "yyyy-MM-dd");
      setBookingDate(ymd);
      if (!sport) {
        setActivityAttentionKey((k) => k + 1);
      }
    },
    [sport],
  );

  const readyToConfirm = !!(
    sport &&
    courtType &&
    selectedSlot &&
    bookingDate
  );

  return (
    <Card className="w-full border-slate-200 dark:border-slate-800 shadow-sm rounded-2xl">
      <CardHeader className="space-y-1 pb-0 pt-4 px-4 sm:px-6">
        <CardTitle className="text-lg sm:text-xl flex items-center gap-2 pb-0">
          Book a court · {locationName}
          <span
            title={wsConnected ? "Live availability connected" : "Connecting…"}
            className={cn(
              "inline-block h-2 w-2 rounded-full flex-shrink-0",
              wsConnected ? "bg-green-500" : "bg-yellow-400 animate-pulse",
            )}
          />
        </CardTitle>
        {/* <CardDescription className="text-xs sm:text-sm leading-snug">
          Pick a date, activity, duration, and the time window you want. Tap
          Search to see open slots; the system assigns a court when you confirm.
        </CardDescription> */}
        {editingBookingId && (
          <div className="mt-3 flex flex-wrap items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-100">
            <span className="font-medium">
              Rescheduling an existing booking.
            </span>
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

      <CardContent className="px-4 pb-4 pt-2 sm:px-6">
        <div className="grid grid-cols-1 sm:grid-cols-[auto_minmax(0,1fr)] gap-6 sm:gap-6 sm:items-start">
          {/* ── Left: date picker (column only as wide as calendar) ── */}
          <div className="space-y-2 w-full max-w-[15rem] mx-auto sm:mx-0 sm:w-max shrink-0">
            <Label className="text-sm font-semibold">Select a date</Label>
            <CalendarGrid
              size="compact"
              selectedDate={selectedCalendarDate}
              onSelectDate={handleCalendarSelect}
              isDateDisabled={(d) => format(d, "yyyy-MM-dd") < todayVenueYmd}
              className="border rounded-lg p-0 shadow-none w-full max-w-[15rem]"
            />
            {searchAttempted && !bookingDate && (
              <p className="text-sm text-destructive" role="alert">
                Please select a date.
              </p>
            )}
          </div>

          {/* ── Right: fills remaining width next to calendar ── */}
          <div className="flex flex-col min-w-0 w-full space-y-4 sm:border-l sm:pl-6 dark:border-slate-800">
            <motion.div
              key={activityAttentionKey}
              className="rounded-lg p-1 -m-1"
              initial={false}
              animate={
                activityAttentionKey > 0 && !sport
                  ? {
                    boxShadow: [
                      "0 0 0 0px rgba(234,88,12,0)",
                      "0 0 0 3px rgba(234,88,12,0.45)",
                      "0 0 0 0px rgba(234,88,12,0)",
                    ],
                    scale: [1, 1.01, 1],
                  }
                  : false
              }
              transition={{ duration: 0.5, ease: "easeOut" }}
            >
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5">
                  <span className="text-sm font-bold shrink-0">
                    Activity:
                  </span>
                  <div className="flex flex-wrap items-center gap-1">
                    {sportOptions.length === 0 ? (
                      <span className="text-xs text-muted-foreground">
                        No activities at this venue.
                      </span>
                    ) : (
                      sportOptions.map((s) => (
                        <Button
                          key={s.code}
                          type="button"
                          size="sm"
                          variant={sport === s.code ? "default" : "outline"}
                          className="h-8 rounded-full px-3 text-xs font-semibold"
                          onClick={() => {
                            setSport(s.code as Sport);
                            setActivityAttentionKey(0);
                          }}
                        >
                          {sportButtonLabel(s.code, s.name)}
                        </Button>
                      ))
                    )}
                  </div>
                </div>
                {sport && courtTypeOptions.length > 0 && (
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5 pl-0 sm:pl-0">
                    <span className="text-sm font-bold shrink-0">
                      Indoor / outdoor:
                    </span>
                    <div className="flex flex-wrap items-center gap-1">
                      {courtTypeOptions.map((t) => (
                        <Button
                          key={t}
                          type="button"
                          size="sm"
                          variant={courtType === t ? "default" : "outline"}
                          className="h-8 rounded-full px-3 text-xs font-semibold capitalize"
                          onClick={() => setCourtType(t)}
                        >
                          {t === "indoor" ? "Indoor" : "Outdoor"}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
            {searchAttempted && sportOptions.length > 0 && !sport && (
              <p className="text-sm text-destructive -mt-2" role="alert">
                Please select an activity.
              </p>
            )}
            {searchAttempted &&
              !!sport &&
              courtTypeOptions.length > 1 &&
              !courtType && (
                <p className="text-sm text-destructive -mt-2" role="alert">
                  Please select indoor or outdoor.
                </p>
              )}
            {searchAttempted &&
              !!sport &&
              courtTypeOptions.length === 0 && (
                <p className="text-sm text-destructive -mt-2" role="alert">
                  No court environment for this activity at this venue.
                </p>
              )}

            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                <span className="text-sm font-bold text-foreground shrink-0">
                  Duration:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {DURATIONS.map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setDurationMinutes(d)}
                      className={cn(
                        "rounded-full px-3.5 py-1.5 text-xs font-semibold border transition-all",
                        durationMinutes === d
                          ? "bg-primary text-primary-foreground border-primary shadow-sm hover:bg-primary-hover"
                          : "bg-background text-foreground border-slate-200 dark:border-slate-700 hover:border-primary hover:text-primary",
                      )}
                    >
                      {d} min
                    </button>
                  ))}
                </div>
              </div>
              {searchAttempted && durationMinutes == null && (
                <p className="text-sm text-destructive pt-0.5" role="alert">
                  Please select a duration.
                </p>
              )}
            </div>

            <div className="space-y-1.5 w-full">
              {/* &lt;1180px: title, then From+To on one row */}
              <div className="min-[1180px]:hidden space-y-2">
                <span className="text-sm font-bold text-foreground">
                  Search for available times:
                </span>
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5 min-w-0">
                  <span className="text-xs font-semibold text-muted-foreground shrink-0">
                    From
                  </span>
                  <WizardTimeSelect
                    value={timeFrom}
                    options={TIME_OPTIONS}
                    onChange={setTimeFrom}
                  />
                  <span className="text-xs font-semibold text-muted-foreground shrink-0">
                    To
                  </span>
                  <WizardTimeSelect
                    value={timeTo}
                    options={timeToOptions}
                    onChange={setTimeTo}
                  />
                </div>
              </div>

              {/* ≥1180px: one line */}
              <div className="hidden min-[1180px]:flex flex-nowrap items-center gap-x-2 gap-y-2">
                <span className="text-sm font-bold text-foreground shrink-0">
                  Search for available times:
                </span>
                <span className="text-xs font-semibold text-muted-foreground shrink-0">
                  From
                </span>
                <WizardTimeSelect
                  value={timeFrom}
                  options={TIME_OPTIONS}
                  onChange={setTimeFrom}
                />
                <span className="text-xs font-semibold text-muted-foreground shrink-0">
                  To
                </span>
                <WizardTimeSelect
                  value={timeTo}
                  options={timeToOptions}
                  onChange={setTimeTo}
                />
              </div>
              {searchAttempted && (!timeFrom || !timeTo) && (
                <p className="text-sm text-destructive" role="alert">
                  Please select an available time range.
                </p>
              )}
              {searchAttempted &&
                timeFrom &&
                timeTo &&
                toMinutes(timeTo) <= toMinutes(timeFrom) && (
                  <p className="text-sm text-destructive" role="alert">
                    End time must be after start time.
                  </p>
                )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                className="rounded-full px-8 h-10 text-sm font-semibold"
                onClick={handleSearch}
              >
                Search
              </Button>
              <Button
                type="button"
                variant="outline"
                className="rounded-full px-6 h-10 text-sm font-semibold"
                onClick={clearBookingFormState}
              >
                Clear
              </Button>
            </div>

            {/* Time slots: directly under Search, same column as filters */}
            {searchCommitted && (
              <div className="space-y-3 pt-4 border-t border-slate-200 dark:border-slate-800">
                {loadingSlots && (
                  <GlobalLoadingPlaceholder minHeight="min-h-[160px]" />
                )}

                {slotsError && (
                  <p className="text-sm text-destructive">
                    {(slotsErr as Error)?.message ??
                      "Could not load available slots."}
                  </p>
                )}

                {!loadingSlots &&
                  slotsData &&
                  slotsData.slots.length === 0 &&
                  bookingDate && (
                    <p className="text-sm text-muted-foreground">
                      No slots available for this combination. Try a different
                      date or duration.
                    </p>
                  )}

                {!loadingSlots &&
                  slotsData &&
                  slotsData.slots.length > 0 &&
                  filteredSlots.length === 0 && (
                    <p className="text-sm text-muted-foreground">
                      No slots overlap your selected time window. Widen the
                      range or tap Search again.
                    </p>
                  )}

                {!loadingSlots &&
                  filteredSlots.length > 0 &&
                  sport &&
                  courtType &&
                  bookingDate && (
                    <div className="space-y-2 rounded-xl border border-slate-200/80 dark:border-slate-700/80 bg-slate-50/50 dark:bg-slate-950/30 p-3">
                      <p className="text-xs text-muted-foreground leading-snug">
                        Select a time slot. A court will be automatically
                        assigned.
                      </p>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                        {filteredSlots.map((slot) => {
                          const key = slotHoldKey(
                            sport,
                            courtType,
                            bookingDate,
                            slot.startTime,
                            slot.endTime,
                          );
                          const isSelected =
                            myHoldKey === key ||
                            (selectedSlot?.startTime === slot.startTime &&
                              selectedSlot?.endTime === slot.endTime);
                          const holdCount = holdCounts[key] ?? 0;

                          const slotStart = toMinutes(slot.startTime);
                          const slotEnd = toMinutes(slot.endTime);
                          const events: Array<{ t: number; delta: number }> =
                            [];
                          for (const h of currentIntervalHolds) {
                            const overlapStart = Math.max(slotStart, h.start);
                            const overlapEnd = Math.min(slotEnd, h.end);
                            if (overlapStart < overlapEnd) {
                              events.push({
                                t: overlapStart,
                                delta: h.count,
                              });
                              events.push({
                                t: overlapEnd,
                                delta: -h.count,
                              });
                            }
                          }
                          events.sort((a, b) =>
                            a.t === b.t ? a.delta - b.delta : a.t - b.t,
                          );
                          let active = 0;
                          let maxConcurrentHolds = 0;
                          for (const e of events) {
                            active += e.delta;
                            if (active > maxConcurrentHolds)
                              maxConcurrentHolds = active;
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
                                "relative rounded-lg border p-2 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                                isSelected
                                  ? "bg-primary hover:bg-primary-hover text-primary-foreground border-primary shadow-sm scale-[1.02]"
                                  : isFull
                                    ? "bg-slate-100 dark:bg-slate-800 text-muted-foreground border-slate-200 dark:border-slate-700 opacity-60 cursor-not-allowed"
                                    : "bg-background border-slate-200 dark:border-slate-700 hover:border-primary hover:shadow-sm cursor-pointer",
                              )}
                            >
                              <div className="font-semibold text-xs leading-tight">
                                {formatTimeAmPm(slot.startTime)}
                              </div>
                              {holdCount > 0 && !isFull && (
                                <div
                                  className={cn(
                                    "absolute top-1 right-1 h-1.5 w-1.5 rounded-full",
                                    isSelected
                                      ? "bg-primary-foreground/70"
                                      : "bg-amber-400",
                                  )}
                                  title={`${holdCount} user${holdCount > 1 ? "s" : ""} holding`}
                                />
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
              </div>
            )}
          </div>
        </div>

        {bookError && (
          <p className="text-sm text-destructive font-medium mt-3">
            {bookError}
          </p>
        )}

        {/* ── Booking summary: only after activity + type + slot are chosen ── */}
        {readyToConfirm && selectedSlot && (
          <div className="mt-3 w-fit max-w-full rounded-lg border border-primary/30 bg-primary/5 dark:bg-primary/10 p-3 space-y-2">
            <h3 className="font-semibold text-[11px] text-muted-foreground uppercase tracking-wide">
              Your selection
            </h3>
            <ul className="text-xs space-y-0.5">
              <li>
                <span className="font-medium">
                  {sport
                    ? sportButtonLabel(
                      sport,
                      sportOptions.find((s) => s.code === sport)?.name ??
                      sport,
                    )
                    : "-"}
                </span>{" "}
                <span className="text-muted-foreground capitalize">
                  · {courtType ?? "-"}
                </span>
              </li>
              <li className="font-medium">
                {selectedCalendarDate
                  ? format(selectedCalendarDate, "EEEE, MMMM d, yyyy")
                  : "—"}
              </li>
              <li>
                <span className="font-semibold">
                  {formatTimeAmPm(selectedSlot.startTime)} –{" "}
                  {formatTimeAmPm(selectedSlot.endTime)}
                </span>{" "}
                <span className="text-muted-foreground">
                  ({selectedSlot.durationMinutes} min)
                </span>
              </li>
              <li className="text-muted-foreground text-[11px] leading-snug">
                {editingBookingId
                  ? "Confirm to update your booking to this slot (court may change)."
                  : "A court will be assigned automatically at booking time."}
              </li>
            </ul>

            <div className="flex flex-wrap gap-2 pt-0.5">
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="rounded-full px-5 h-9 text-xs"
                disabled={slotMutationPending}
                onClick={handleCancelSelections}
              >
                Cancel
              </Button>
              <Button
                type="button"
                size="sm"
                className="rounded-full px-6 h-9 text-xs font-semibold"
                disabled={!canBook || slotMutationPending}
                onClick={handleConfirmBooking}
              >
                {slotMutationPending
                  ? editingBookingId
                    ? "Updating…"
                    : "Confirming…"
                  : "Confirm Booking"}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
