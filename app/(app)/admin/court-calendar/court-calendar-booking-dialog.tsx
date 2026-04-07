"use client";

import { useEffect, useMemo, useState } from "react";
import { addDays, endOfYear, format, getDay, isAfter, parse, startOfDay } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useAdminCancelCourtBooking,
  useAdminCancelCourtBookingSeries,
  useAdminCreateCourtCalendarBatch,
  useAdminUpdateCourtBooking,
} from "@/lib/queries";
import type { AdminCourtBookingRowApi } from "@/lib/api/endpoints/bookings";
import { ApiError } from "@/lib/api";
import toast from "react-hot-toast";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { normalizeGridTime, TIME_OPTIONS, toAmPmLabel } from "../court-form-shared";

export type CalendarColumnMeta = {
  id: string;
  name: string;
  sport: string;
  /** Lowercase indoor | outdoor for slot API */
  courtTypeForSlot: string;
  areaId?: string | null;
};

const DURATION_OPTIONS = [30, 60, 90] as const;

/** Monday=1 … Sunday=0 (Date.getDay()) */
const WEEKDAY_BUTTONS: { label: string; dow: number }[] = [
  { label: "Monday", dow: 1 },
  { label: "Tuesday", dow: 2 },
  { label: "Wednesday", dow: 3 },
  { label: "Thursday", dow: 4 },
  { label: "Friday", dow: 5 },
  { label: "Saturday", dow: 6 },
  { label: "Sunday", dow: 0 },
];

/** Cap per request (matches API) — avoids huge payloads/timeouts. */
const MAX_DATES_PER_SUBMIT = 400;

type WeeklyEndMode = "year_end" | "until_date" | "count";

function padTime(hour: number, minute: number): string {
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

function parseWallParts(t: string): { h: number; m: number } {
  const [hs, ms] = t.split(":");
  const h = Number(hs);
  const m = Number(ms ?? 0);
  return {
    h: Number.isFinite(h) ? h : 0,
    m: Number.isFinite(m) ? m : 0,
  };
}

function timeStrToMinutes(t: string): number {
  const n = normalizeGridTime(t);
  const { h, m } = parseWallParts(n);
  return h * 60 + m;
}

function addMinutesWallClock(
  startHour: number,
  startMinute: number,
  add: number,
): { end: string; crossesMidnight: boolean } {
  const startTotal = startHour * 60 + startMinute;
  const endTotal = startTotal + add;
  if (endTotal >= 24 * 60) {
    return { end: "", crossesMidnight: true };
  }
  const eh = Math.floor(endTotal / 60);
  const em = endTotal % 60;
  return { end: padTime(eh, em), crossesMidnight: false };
}

/** Next grid slot time (from `TIME_OPTIONS`) with end minutes ≥ start + `minGapMinutes`. */
function defaultEndSlot(startHhmm: string, minGapMinutes: number): string {
  const startM = timeStrToMinutes(startHhmm);
  const target = startM + minGapMinutes;
  for (const t of TIME_OPTIONS) {
    if (timeStrToMinutes(t) >= target) return t;
  }
  return TIME_OPTIONS[TIME_OPTIONS.length - 1] ?? "23:30";
}

function firstDateOnOrAfterAnchor(anchorYmd: string, targetDow: number): Date {
  let d = startOfDay(parse(anchorYmd, "yyyy-MM-dd", new Date()));
  for (let i = 0; i < 370; i++) {
    if (getDay(d) === targetDow) return d;
    d = addDays(d, 1);
  }
  return startOfDay(parse(anchorYmd, "yyyy-MM-dd", new Date()));
}

function computeBookingDates(
  anchorYmd: string,
  selectedDows: Set<number>,
  opts: {
    repeatWeekly: boolean;
    endMode: WeeklyEndMode;
    untilYmd: string;
    occurrencesPerWeekday: number;
  },
): string[] {
  const anchor = startOfDay(parse(anchorYmd, "yyyy-MM-dd", new Date()));
  const out = new Set<string>();

  if (selectedDows.size === 0) {
    out.add(format(anchor, "yyyy-MM-dd"));
    return Array.from(out).sort();
  }

  if (!opts.repeatWeekly) {
    for (const dow of Array.from(selectedDows)) {
      const d = firstDateOnOrAfterAnchor(anchorYmd, dow);
      out.add(format(d, "yyyy-MM-dd"));
    }
    return Array.from(out).sort();
  }

  const yearEnd = endOfYear(anchor);

  for (const dow of Array.from(selectedDows)) {
    let d = firstDateOnOrAfterAnchor(anchorYmd, dow);
    if (opts.endMode === "count") {
      const n = Math.max(1, Math.min(Math.floor(opts.occurrencesPerWeekday), MAX_DATES_PER_SUBMIT));
      for (let i = 0; i < n; i++) {
        out.add(format(d, "yyyy-MM-dd"));
        d = addDays(d, 7);
      }
    } else {
      const endBound =
        opts.endMode === "until_date"
          ? startOfDay(parse(opts.untilYmd, "yyyy-MM-dd", new Date()))
          : yearEnd;
      while (!isAfter(d, endBound)) {
        out.add(format(d, "yyyy-MM-dd"));
        d = addDays(d, 7);
      }
    }
  }

  return Array.from(out).sort();
}

function nearestDuration(mins: number): (typeof DURATION_OPTIONS)[number] {
  if ((DURATION_OPTIONS as readonly number[]).includes(mins)) {
    return mins as (typeof DURATION_OPTIONS)[number];
  }
  return DURATION_OPTIONS.reduce((a, b) =>
    Math.abs(b - mins) < Math.abs(a - mins) ? b : a,
  );
}

export function CourtCalendarBookingDialog(props: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  locationTimezone?: string | null;
  bookingDate: string;
  column: CalendarColumnMeta | null;
  startHour: number;
  startMinute?: number;
  editingBooking: AdminCourtBookingRowApi | null;
  isSuperAdmin: boolean;
}) {
  const {
    open,
    onOpenChange,
    locationTimezone,
    bookingDate,
    column,
    startHour,
    startMinute: startMinuteProp = 0,
    editingBooking,
    isSuperAdmin,
  } = props;

  const isEdit = Boolean(editingBooking);

  const [durationMinutes, setDurationMinutes] =
    useState<(typeof DURATION_OPTIONS)[number]>(60);
  const [startMinute, setStartMinute] = useState(0);
  const [rangeStart, setRangeStart] = useState("09:00");
  const [rangeEnd, setRangeEnd] = useState("10:00");
  const [selectedDows, setSelectedDows] = useState<Set<number>>(new Set());
  const [repeatWeekly, setRepeatWeekly] = useState(false);
  const [weeklyEndMode, setWeeklyEndMode] = useState<WeeklyEndMode>("year_end");
  const [untilDateYmd, setUntilDateYmd] = useState("");
  const [occurrenceCount, setOccurrenceCount] = useState(12);
  /** When true, one summary email lists all created dates (batch only). */
  const [sendConfirmationEmail, setSendConfirmationEmail] = useState(false);

  const adminBatch = useAdminCreateCourtCalendarBatch();
  const updateCourt = useAdminUpdateCourtBooking();
  const adminCancel = useAdminCancelCourtBooking();
  const cancelSeries = useAdminCancelCourtBookingSeries();

  const anchorYearEndYmd = useMemo(
    () => format(endOfYear(parse(bookingDate, "yyyy-MM-dd", new Date())), "yyyy-MM-dd"),
    [bookingDate],
  );

  useEffect(() => {
    if (!open || !column) return;
    setUntilDateYmd(anchorYearEndYmd);
    setWeeklyEndMode("year_end");
    setOccurrenceCount(12);
    if (editingBooking) {
      const { h, m } = parseWallParts(editingBooking.startTime);
      setDurationMinutes(nearestDuration(editingBooking.durationMinutes));
      setStartMinute(m);
      setSelectedDows(new Set());
      setRepeatWeekly(false);
      setSendConfirmationEmail(false);
      if (isSuperAdmin) {
        setRangeStart(normalizeGridTime(editingBooking.startTime));
        setRangeEnd(normalizeGridTime(editingBooking.endTime));
      }
    } else {
      setDurationMinutes(60);
      setStartMinute(startMinuteProp);
      setSelectedDows(new Set());
      setRepeatWeekly(false);
      setSendConfirmationEmail(false);
      const startHhmm = padTime(startHour, startMinuteProp);
      setRangeStart(normalizeGridTime(startHhmm));
      setRangeEnd(defaultEndSlot(normalizeGridTime(startHhmm), 60));
    }
  }, [open, column?.id, startHour, startMinuteProp, bookingDate, editingBooking, isSuperAdmin, anchorYearEndYmd]);

  const startTimeStandard = useMemo(
    () => padTime(startHour, startMinute),
    [startHour, startMinute],
  );

  const { end: endTimeStandard, crossesMidnight: crossesStandard } = useMemo(
    () => addMinutesWallClock(startHour, startMinute, durationMinutes),
    [startHour, startMinute, durationMinutes],
  );

  const superRangeInvalid = useMemo(() => {
    if (!isSuperAdmin) return false;
    const a = timeStrToMinutes(rangeStart);
    const b = timeStrToMinutes(rangeEnd);
    return b <= a;
  }, [isSuperAdmin, rangeStart, rangeEnd]);

  const superCrossesMidnight = false;

  const startTime = isSuperAdmin ? normalizeGridTime(rangeStart) : startTimeStandard;
  const endTime = isSuperAdmin ? normalizeGridTime(rangeEnd) : endTimeStandard;
  const crossesMidnight = isSuperAdmin ? superCrossesMidnight : crossesStandard;
  const effectiveDurationMinutes = useMemo(() => {
    if (isSuperAdmin) {
      return Math.max(1, timeStrToMinutes(rangeEnd) - timeStrToMinutes(rangeStart));
    }
    return durationMinutes;
  }, [isSuperAdmin, rangeEnd, rangeStart, durationMinutes]);

  const datesPreview = useMemo(() => {
    if (isEdit) return [];
    return computeBookingDates(bookingDate, selectedDows, {
      repeatWeekly: selectedDows.size > 0 && repeatWeekly,
      endMode: weeklyEndMode,
      untilYmd: untilDateYmd || anchorYearEndYmd,
      occurrencesPerWeekday: occurrenceCount,
    });
  }, [
    isEdit,
    bookingDate,
    selectedDows,
    repeatWeekly,
    weeklyEndMode,
    untilDateYmd,
    anchorYearEndYmd,
    occurrenceCount,
  ]);

  const dateLabel = useMemo(() => {
    const d = parse(bookingDate, "yyyy-MM-dd", new Date());
    return format(d, "EEEE, MMM d, yyyy");
  }, [bookingDate]);

  const editDateLabel = useMemo(() => {
    if (!editingBooking?.bookingDate) return dateLabel;
    const raw = editingBooking.bookingDate;
    const ymd = typeof raw === "string" ? raw.slice(0, 10) : format(raw as Date, "yyyy-MM-dd");
    return format(parse(ymd, "yyyy-MM-dd", new Date()), "EEEE, MMM d, yyyy");
  }, [editingBooking, dateLabel]);

  const busy =
    adminBatch.isPending ||
    updateCourt.isPending ||
    adminCancel.isPending ||
    cancelSeries.isPending;

  useEffect(() => {
    if (selectedDows.size === 0) setRepeatWeekly(false);
  }, [selectedDows.size]);

  const toggleDow = (dow: number) => {
    setSelectedDows((prev) => {
      const next = new Set(prev);
      if (next.has(dow)) next.delete(dow);
      else next.add(dow);
      return next;
    });
  };

  const submit = async () => {
    if (!column) return;
    if (isSuperAdmin && superRangeInvalid) {
      toast.error("End time must be after start time.");
      return;
    }
    if (!isSuperAdmin && crossesMidnight) {
      toast.error("End time would pass midnight. Choose a shorter duration or earlier start.");
      return;
    }

    if (selectedDows.size > 0 && repeatWeekly && weeklyEndMode === "until_date") {
      const anchor = startOfDay(parse(bookingDate, "yyyy-MM-dd", new Date()));
      const until = startOfDay(parse(untilDateYmd || anchorYearEndYmd, "yyyy-MM-dd", new Date()));
      if (isAfter(anchor, until)) {
        toast.error("End date must be on or after the calendar date.");
        return;
      }
    }

    try {
      if (isEdit && editingBooking) {
        const ymd =
          typeof editingBooking.bookingDate === "string"
            ? editingBooking.bookingDate.slice(0, 10)
            : format(editingBooking.bookingDate as Date, "yyyy-MM-dd");
        await updateCourt.mutateAsync({
          id: editingBooking.id,
          body: {
            bookingDate: ymd,
            startTime,
            endTime,
          },
        });
        toast.success("Booking updated.");
        onOpenChange(false);
        return;
      }

      if (datesPreview.length > MAX_DATES_PER_SUBMIT) {
        toast.error(
          `Too many dates (${datesPreview.length}). Max ${MAX_DATES_PER_SUBMIT}. Narrow weekdays, end sooner, or lower the occurrence count.`,
        );
        return;
      }

      const seriesId =
        datesPreview.length > 1 && typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : undefined;

      const res = await adminBatch.mutateAsync({
        courtId: column.id,
        bookingDates: datesPreview,
        startTime,
        endTime,
        durationMinutes: effectiveDurationMinutes,
        ...(seriesId ? { adminCalendarSeriesId: seriesId } : {}),
        sendConfirmationEmail,
      });

      for (const err of res.errors) {
        toast.error(`${err.bookingDate}: ${err.message}`);
      }
      if (res.created.length > 0) {
        toast.success(
          res.created.length === 1
            ? sendConfirmationEmail
              ? "Court booking created. Confirmation email sent."
              : "Court booking created."
            : `${res.created.length} court bookings created.${
                sendConfirmationEmail ? " One summary email sent." : ""
              }`,
        );
      }
      if (res.errors.length === 0 && res.created.length === datesPreview.length) {
        onOpenChange(false);
      }
    } catch (e) {
      const msg =
        e instanceof ApiError
          ? e.message
          : e instanceof Error
            ? e.message
            : "Could not save.";
      toast.error(msg);
    }
  };

  const handleCancelSeries = async () => {
    const sid = editingBooking?.adminCalendarSeriesId;
    if (!sid) return;
    if (
      !window.confirm(
        "Cancel every booking in this series (same recurring / multi-date batch)? This removes all linked slots; confirmation emails are not sent for each date.",
      )
    ) {
      return;
    }
    try {
      const res = await cancelSeries.mutateAsync(sid);
      toast.success(
        res.cancelledCount === 1
          ? "1 booking in the series was cancelled."
          : `${res.cancelledCount} bookings in the series were cancelled.`,
      );
      onOpenChange(false);
    } catch (e) {
      const msg =
        e instanceof ApiError
          ? e.message
          : e instanceof Error
            ? e.message
            : "Could not cancel series.";
      toast.error(msg);
    }
  };

  const handleAdminCancel = async () => {
    if (!editingBooking || !isSuperAdmin) return;
    if (
      !window.confirm(
        "Cancel this booking for the customer? This cannot be undone from the calendar.",
      )
    ) {
      return;
    }
    try {
      await adminCancel.mutateAsync(editingBooking.id);
      toast.success("Booking cancelled.");
      onOpenChange(false);
    } catch (e) {
      const msg =
        e instanceof ApiError
          ? e.message
          : e instanceof Error
            ? e.message
            : "Could not cancel.";
      toast.error(msg);
    }
  };

  if (!column) return null;

  const timeBlockInvalid = isSuperAdmin ? superRangeInvalid : crossesMidnight;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md rounded-2xl sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit booking" : "New booking"}</DialogTitle>
          <DialogDescription>
            Times are validated in the venue timezone
            {locationTimezone ? ` (${locationTimezone})` : ""}.{" "}
            {isEdit
              ? "Update the time slot for this reservation."
              : "The booking is created for your signed-in account."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2 text-sm">
          <div className="rounded-xl border border-slate-100 bg-slate-50/80 px-3 py-2 dark:border-slate-800 dark:bg-slate-900/60">
            <p className="font-semibold text-slate-900 dark:text-white">{column.name}</p>
            <p className="text-slate-600 dark:text-slate-400">{isEdit ? editDateLabel : dateLabel}</p>
            <p className="mt-1 tabular-nums text-slate-700 dark:text-slate-300">
              {timeBlockInvalid ? (
                <span className="text-amber-800 dark:text-amber-200">
                  {isSuperAdmin
                    ? `${startTime} – ${endTime} (end must be after start)`
                    : `${startTime} – (past midnight — pick a shorter duration)`}
                </span>
              ) : (
                <>
                  {startTime} – {endTime} ({effectiveDurationMinutes} min)
                </>
              )}
            </p>
          </div>

          {isSuperAdmin ? (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>From</Label>
                <Select value={rangeStart} onValueChange={setRangeStart}>
                  <SelectTrigger className="rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="max-h-72">
                    {TIME_OPTIONS.map((t) => (
                      <SelectItem key={t} value={t}>
                        {toAmPmLabel(t)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>To</Label>
                <Select value={rangeEnd} onValueChange={setRangeEnd}>
                  <SelectTrigger className="rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="max-h-72">
                    {TIME_OPTIONS.map((t) => (
                      <SelectItem key={t} value={t}>
                        {toAmPmLabel(t)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <Label>Duration (minutes)</Label>
              <div className="flex gap-2">
                {DURATION_OPTIONS.map((m) => (
                  <Button
                    key={m}
                    type="button"
                    variant={durationMinutes === m ? "default" : "outline"}
                    className="h-10 flex-1 rounded-xl"
                    onClick={() => setDurationMinutes(m)}
                  >
                    {m}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {!isEdit ? (
            <div className="space-y-2">
              <Label>Apply to weekdays</Label>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Leave none selected to book only the date shown in the calendar. Select days for the
                next occurrence of each (on or after the calendar date). Turn on{" "}
                <span className="font-medium text-slate-600 dark:text-slate-300">Repeat weekly</span>{" "}
                to add more dates using the end rule below.
              </p>
              <div className="flex flex-wrap gap-1.5">
                {WEEKDAY_BUTTONS.map(({ label, dow }) => {
                  const on = selectedDows.has(dow);
                  return (
                    <Button
                      key={dow}
                      type="button"
                      size="sm"
                      variant={on ? "default" : "outline"}
                      className={cn("h-8 rounded-lg px-2.5 text-xs", on && "shadow-sm")}
                      onClick={() => toggleDow(dow)}
                    >
                      {label.slice(0, 3)}
                    </Button>
                  );
                })}
              </div>

              {selectedDows.size > 0 ? (
                <div className="space-y-3 border-t border-slate-100 pt-3 dark:border-slate-800">
                  <label className="flex cursor-pointer items-center gap-2">
                    <Checkbox
                      checked={repeatWeekly}
                      onCheckedChange={(c) => setRepeatWeekly(c === true)}
                    />
                    <span className="text-sm font-medium leading-none">Repeat weekly</span>
                  </label>

                  {repeatWeekly ? (
                    <RadioGroup
                      value={weeklyEndMode}
                      onValueChange={(v) => setWeeklyEndMode(v as WeeklyEndMode)}
                      className="space-y-2"
                    >
                      <div className="flex cursor-pointer items-start gap-2 rounded-lg border border-slate-100 p-2 dark:border-slate-800">
                        <RadioGroupItem value="year_end" id="we-year" className="mt-0.5" />
                        <Label htmlFor="we-year" className="cursor-pointer text-sm font-normal leading-snug">
                          <span className="font-medium">Until end of </span>
                          {format(endOfYear(parse(bookingDate, "yyyy-MM-dd", new Date())), "yyyy")}
                        </Label>
                      </div>
                      <div className="rounded-lg border border-slate-100 p-2 dark:border-slate-800">
                        <div className="flex cursor-pointer items-start gap-2">
                          <RadioGroupItem value="until_date" id="we-until" className="mt-0.5" />
                          <div className="min-w-0 flex-1 space-y-1">
                            <Label htmlFor="we-until" className="cursor-pointer text-sm font-medium leading-snug">
                              Until a date
                            </Label>
                            {weeklyEndMode === "until_date" ? (
                              <Input
                                type="date"
                                className="h-9 rounded-lg"
                                value={untilDateYmd}
                                min={bookingDate}
                                onChange={(e) => setUntilDateYmd(e.target.value)}
                              />
                            ) : null}
                          </div>
                        </div>
                      </div>
                      <div className="rounded-lg border border-slate-100 p-2 dark:border-slate-800">
                        <div className="flex cursor-pointer items-start gap-2">
                          <RadioGroupItem value="count" id="we-count" className="mt-0.5" />
                          <div className="min-w-0 flex-1 space-y-1">
                            <Label htmlFor="we-count" className="cursor-pointer text-sm font-medium leading-snug">
                              Number of times per weekday
                            </Label>
                            {weeklyEndMode === "count" ? (
                              <Input
                                type="number"
                                min={1}
                                max={MAX_DATES_PER_SUBMIT}
                                className="h-9 rounded-lg"
                                value={occurrenceCount}
                                onChange={(e) =>
                                  setOccurrenceCount(
                                    Math.max(
                                      1,
                                      Math.min(MAX_DATES_PER_SUBMIT, Number(e.target.value) || 1),
                                    ),
                                  )
                                }
                              />
                            ) : null}
                          </div>
                        </div>
                      </div>
                    </RadioGroup>
                  ) : null}
                </div>
              ) : null}

              <p className="text-xs tabular-nums text-slate-600 dark:text-slate-400">
                {datesPreview.length} booking{datesPreview.length === 1 ? "" : "s"} will be created
                {datesPreview.length > 12
                  ? ` (first: ${datesPreview[0]}, …)`
                  : datesPreview.length
                    ? `: ${datesPreview.join(", ")}`
                    : ""}
              </p>
              <label className="flex cursor-pointer items-center gap-2 border-t border-slate-100 pt-3 dark:border-slate-800">
                <Checkbox
                  checked={sendConfirmationEmail}
                  onCheckedChange={(c) => setSendConfirmationEmail(c === true)}
                />
                <span className="text-sm font-medium leading-none">Send confirmation email</span>
              </label>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                If checked, the customer gets <strong>one</strong> email listing every date above. Leave
                unchecked to avoid email when creating many slots.
              </p>
            </div>
          ) : null}

          {isEdit && editingBooking?.adminCalendarSeriesId ? (
            <div className="border-t border-slate-100 pt-3 dark:border-slate-800">
              <Button
                type="button"
                variant="outline"
                className="w-full rounded-xl border-amber-600/70 text-amber-900 hover:bg-amber-50 dark:border-amber-500/60 dark:text-amber-100 dark:hover:bg-amber-950/40"
                disabled={busy}
                onClick={() => void handleCancelSeries()}
              >
                Cancel entire series (all linked dates)
              </Button>
              <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">
                Removes every pending/confirmed booking that was created with this recurring or
                multi-date batch.
              </p>
            </div>
          ) : null}

          {isEdit && isSuperAdmin ? (
            <div className="border-t border-slate-100 pt-3 dark:border-slate-800">
              <Button
                type="button"
                variant="destructive"
                className="w-full rounded-xl"
                disabled={busy}
                onClick={() => void handleAdminCancel()}
              >
                Cancel this booking only (customer)
              </Button>
            </div>
          ) : null}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            className="rounded-xl"
            onClick={() => onOpenChange(false)}
            disabled={busy}
          >
            Cancel
          </Button>
          <Button
            type="button"
            className="rounded-xl"
            onClick={() => void submit()}
            disabled={busy || timeBlockInvalid}
          >
            {busy ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving…
              </>
            ) : isEdit ? (
              "Update booking"
            ) : (
              "Create booking"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
