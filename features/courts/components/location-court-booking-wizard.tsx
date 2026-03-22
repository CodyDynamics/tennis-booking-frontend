"use client";

import { useMemo, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarGrid } from "@/components/ui/calendar";
import {
  useCourtWizardWindows,
  useCourtWizardAvailability,
  useCreateCourtBooking,
} from "@/lib/queries";
import { useAuth } from "@/lib/auth-store";
import { GlobalLoadingPlaceholder } from "@/components/ui/global-loading-placeholder";
import { format, parse } from "date-fns";
import { formatInTimeZone } from "date-fns-tz";
import { CalendarIcon, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CourtWizardSlotApi } from "@/types/api";
import { ApiError } from "@/lib/api";
import { formatCurrency } from "@/lib/format";

function wallTimeShort(t: string) {
  const p = t.split(":");
  return `${p[0]?.padStart(2, "0")}:${p[1]?.padStart(2, "0")}`;
}

type Sport = "tennis" | "pickleball";
type CourtType = "indoor" | "outdoor";

function slotKey(s: CourtWizardSlotApi) {
  return `${s.startTime}|${s.endTime}`;
}

export function LocationCourtBookingWizard({
  locationId,
  locationName,
  locationTimezone,
}: {
  locationId: string;
  locationName: string;
  locationTimezone: string;
}) {
  const tz = locationTimezone || "UTC";
  const router = useRouter();
  const { user } = useAuth();
  const createBooking = useCreateCourtBooking();

  const todayVenueYmd = useMemo(
    () => formatInTimeZone(new Date(), tz, "yyyy-MM-dd"),
    [tz],
  );

  const [bookingDate, setBookingDate] = useState(() =>
    formatInTimeZone(new Date(), tz, "yyyy-MM-dd"),
  );
  const [datePickerOpen, setDatePickerOpen] = useState(false);

  useEffect(() => {
    setBookingDate((d) => (d < todayVenueYmd ? todayVenueYmd : d));
  }, [todayVenueYmd]);

  const [sport, setSport] = useState<Sport>("pickleball");
  const [courtType, setCourtType] = useState<CourtType>("indoor");
  const [windowId, setWindowId] = useState<string>("");
  const [durationMinutes, setDurationMinutes] = useState<number>(60);

  const [selectedSlot, setSelectedSlot] = useState<CourtWizardSlotApi | null>(null);
  const [selectedCourtId, setSelectedCourtId] = useState<string | null>(null);
  const [bookError, setBookError] = useState<string | null>(null);

  const selectedCalendarDate = useMemo(
    () => parse(bookingDate, "yyyy-MM-dd", new Date()),
    [bookingDate],
  );

  const { data: windows = [], isLoading: loadingWindows } = useCourtWizardWindows(
    locationId,
    sport,
    courtType,
    true,
  );

  const selectedWindow = useMemo(
    () => windows.find((w) => w.id === windowId) ?? null,
    [windows, windowId],
  );

  useEffect(() => {
    if (windows.length === 0) {
      setWindowId("");
      return;
    }
    if (!windowId || !windows.some((w) => w.id === windowId)) {
      setWindowId(windows[0].id);
    }
  }, [windows, windowId]);

  useEffect(() => {
    if (!selectedWindow?.allowedDurationMinutes?.length) return;
    if (!selectedWindow.allowedDurationMinutes.includes(durationMinutes)) {
      setDurationMinutes(selectedWindow.allowedDurationMinutes[0]);
    }
  }, [selectedWindow, durationMinutes]);

  const availabilityParams =
    windowId && bookingDate
      ? {
          locationId,
          sport,
          courtType,
          bookingDate,
          windowId,
          durationMinutes,
        }
      : null;

  const {
    data: availability,
    isLoading: loadingAvail,
    isError: availError,
    error: availErr,
    refetch,
    isFetching,
  } = useCourtWizardAvailability(availabilityParams, Boolean(availabilityParams));

  useEffect(() => {
    setSelectedSlot(null);
    setSelectedCourtId(null);
    setBookError(null);
  }, [sport, courtType, bookingDate, windowId, durationMinutes]);

  const courtInfoById = useMemo(() => {
    const m = new Map<string, { name: string; pricePerHourPublic: string }>();
    for (const c of availability?.courts ?? []) {
      m.set(c.id, { name: c.name, pricePerHourPublic: c.pricePerHourPublic });
    }
    return m;
  }, [availability?.courts]);

  const formatHourly = (publicRate: string) =>
    `${formatCurrency(parseFloat(publicRate || "0"))}/hr`;

  const canBook =
    !!availability &&
    !!selectedSlot &&
    !!selectedCourtId &&
    selectedSlot.availableCourtIds.includes(selectedCourtId);

  const handleBookNow = async () => {
    if (!availability || !selectedSlot || !selectedCourtId || !canBook) return;
    setBookError(null);
    try {
      await createBooking.mutateAsync({
        userId: user?.id,
        courtId: selectedCourtId,
        bookingDate: availability.bookingDate,
        startTime: wallTimeShort(selectedSlot.startTime),
        endTime: wallTimeShort(selectedSlot.endTime),
        durationMinutes: selectedSlot.durationMinutes,
        locationBookingWindowId: availability.windowId,
      });
      router.push("/booking-history");
    } catch (e) {
      if (e instanceof ApiError) {
        const msg = e.body?.message;
        setBookError(
          typeof msg === "string" ? msg : Array.isArray(msg) ? msg.join(", ") : e.message,
        );
      } else {
        setBookError(e instanceof Error ? e.message : "Booking failed");
      }
    }
  };

  return (
    <Card className="mb-10 border-slate-200 dark:border-slate-800 shadow-sm">
      <CardHeader>
        <CardTitle className="text-xl">Book a court · {locationName}</CardTitle>
        <CardDescription>
          Choose sport, indoor/outdoor, date, window, and duration. Pick a time slot and a court,
          then confirm. Past calendar days are disabled vs venue time (<span className="font-medium">{tz}</span>
          ); saved times are <span className="font-medium">UTC</span> in the database.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex flex-wrap gap-4 items-end">
          <div className="space-y-2 min-w-[140px]">
            <Label>Sport</Label>
            <Select value={sport} onValueChange={(v) => setSport(v as Sport)}>
              <SelectTrigger className="w-[160px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="tennis">Tennis</SelectItem>
                <SelectItem value="pickleball">Pickleball</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2 min-w-[140px]">
            <Label>Indoor / outdoor</Label>
            <Select value={courtType} onValueChange={(v) => setCourtType(v as CourtType)}>
              <SelectTrigger className="w-[160px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="indoor">Indoor</SelectItem>
                <SelectItem value="outdoor">Outdoor</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2 min-w-[200px]">
            <Label>Date</Label>
            <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full min-w-[200px] justify-start text-left font-normal"
                >
                  <CalendarIcon className="mr-2 h-4 w-4 opacity-70" />
                  {format(selectedCalendarDate, "PPP")}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <CalendarGrid
                  className="border-0 shadow-none"
                  selectedDate={selectedCalendarDate}
                  onSelectDate={(d) => {
                    // Use the calendar cell’s local YYYY-MM-DD so the highlighted day matches selection
                    // (formatInTimeZone on the click instant caused off-by-one vs the grid).
                    setBookingDate(format(d, "yyyy-MM-dd"));
                    setDatePickerOpen(false);
                  }}
                  isDateDisabled={(d) => format(d, "yyyy-MM-dd") < todayVenueYmd}
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>

        {loadingWindows ? (
          <GlobalLoadingPlaceholder minHeight="min-h-[120px]" />
        ) : windows.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No booking windows configured for {sport} + {courtType} at this location. Try another
            combination or contact the venue.
          </p>
        ) : (
          <div className="flex flex-wrap gap-4 items-end">
            <div className="space-y-2 min-w-[220px] flex-1">
              <Label>Time window</Label>
              <Select value={windowId} onValueChange={setWindowId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select window" />
                </SelectTrigger>
                <SelectContent>
                  {windows.map((w) => (
                    <SelectItem key={w.id} value={w.id}>
                      {wallTimeShort(w.windowStartTime)} – {wallTimeShort(w.windowEndTime)} (grid{" "}
                      {w.slotGridMinutes}m)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 min-w-[140px]">
              <Label>Duration</Label>
              <Select
                value={String(durationMinutes)}
                onValueChange={(v) => setDurationMinutes(parseInt(v, 10))}
              >
                <SelectTrigger className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(selectedWindow?.allowedDurationMinutes ?? [30, 60, 90]).map((m) => (
                    <SelectItem key={m} value={String(m)}>
                      {m} min
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button type="button" variant="secondary" onClick={() => refetch()} disabled={isFetching}>
              {isFetching ? "Loading…" : "Refresh slots"}
            </Button>
          </div>
        )}

        {availError && (
          <p className="text-sm text-destructive">
            {(availErr as Error)?.message ?? "Could not load availability."}
          </p>
        )}

        {loadingAvail && availabilityParams && (
          <GlobalLoadingPlaceholder minHeight="min-h-[160px]" />
        )}

        {!loadingAvail && availability && availability.slots.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Select a slot (row), then a court. Choose a row first — court buttons appear for that
              time.
            </p>
            <div className="rounded-lg border border-slate-200 dark:border-slate-800 overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 dark:bg-slate-900/80">
                  <tr>
                    <th className="text-left p-3 font-semibold">Slot</th>
                    <th className="text-left p-3 font-semibold">Courts with space</th>
                  </tr>
                </thead>
                <tbody>
                  {availability.slots.map((slot) => {
                    const key = slotKey(slot);
                    const rowSelected = selectedSlot && slotKey(selectedSlot) === key;
                    return (
                      <tr
                        key={key}
                        role="button"
                        tabIndex={0}
                        onClick={() => {
                          setSelectedSlot(slot);
                          setSelectedCourtId(null);
                        }}
                        onKeyDown={(ev) => {
                          if (ev.key === "Enter" || ev.key === " ") {
                            ev.preventDefault();
                            setSelectedSlot(slot);
                            setSelectedCourtId(null);
                          }
                        }}
                        className={cn(
                          "border-t border-slate-200 dark:border-slate-800 cursor-pointer transition-colors",
                          rowSelected && "bg-primary/10 dark:bg-primary/20",
                        )}
                      >
                        <td className="p-3 whitespace-nowrap align-top">
                          {wallTimeShort(slot.startTime)} – {wallTimeShort(slot.endTime)}
                        </td>
                        <td className="p-3">
                          {slot.availableCourtIds.length === 0 ? (
                            <span className="text-muted-foreground">Full</span>
                          ) : (
                            <div className="flex flex-wrap gap-2">
                              {slot.availableCourtIds.map((cid) => {
                                const picked =
                                  rowSelected && selectedCourtId === cid;
                                return (
                                  <div key={cid} className="flex items-center gap-1">
                                    <Button
                                      type="button"
                                      variant={picked ? "default" : "outline"}
                                      size="sm"
                                      className="rounded-full gap-1.5 h-auto py-1.5 px-3"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setSelectedSlot(slot);
                                        setSelectedCourtId(cid);
                                      }}
                                    >
                                      <span className="font-medium">
                                        {courtInfoById.get(cid)?.name ?? cid.slice(0, 8)}
                                      </span>
                                      <span
                                        className={cn(
                                          "text-xs opacity-90",
                                          picked ? "text-primary-foreground/90" : "text-muted-foreground",
                                        )}
                                      >
                                        {formatHourly(courtInfoById.get(cid)?.pricePerHourPublic ?? "0")}
                                      </span>
                                    </Button>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" asChild>
                                      <Link
                                        href={`/locations/${locationId}/courts/${cid}`}
                                        title="Court details"
                                        onClick={(e) => e.stopPropagation()}
                                      >
                                        <ExternalLink className="h-3.5 w-3.5" />
                                      </Link>
                                    </Button>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {!loadingAvail && availability && availability.slots.length === 0 && availability.courts.length > 0 && (
          <p className="text-sm text-muted-foreground">
            No slots fit this duration inside the selected window (try another duration or window).
          </p>
        )}

        {selectedSlot && selectedCourtId && availability && (
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/40 p-4 space-y-2">
            <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
              Your selection
            </h3>
            <ul className="text-sm space-y-1 list-disc list-inside">
              <li>
                <span className="font-medium capitalize">{sport}</span> ·{" "}
                <span className="capitalize">{courtType}</span>
              </li>
              <li>{format(selectedCalendarDate, "EEEE, MMMM d, yyyy")}</li>
              <li>
                {wallTimeShort(selectedSlot.startTime)} – {wallTimeShort(selectedSlot.endTime)} (
                {selectedSlot.durationMinutes} min)
              </li>
              <li>
                Court:{" "}
                <span className="font-medium">
                  {courtInfoById.get(selectedCourtId)?.name ?? selectedCourtId}
                </span>
                {(() => {
                  const info = courtInfoById.get(selectedCourtId);
                  if (!info) return null;
                  return (
                    <span className="text-muted-foreground">
                      {" "}
                      — public rate {formatHourly(info.pricePerHourPublic)}
                    </span>
                  );
                })()}
              </li>
            </ul>
          </div>
        )}

        {bookError && <p className="text-sm text-destructive">{bookError}</p>}

        <div className="pt-2">
          <Button
            type="button"
            size="lg"
            className="rounded-full px-10"
            disabled={!canBook || createBooking.isPending}
            onClick={handleBookNow}
          >
            {createBooking.isPending ? "Booking…" : "Book now"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
