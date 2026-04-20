"use client";

import { Button } from "@/components/ui/button";
import { DatePickerField } from "@/components/ui/date-picker-field";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { ApiError } from "@/lib/api";
import type { AdminCourtBookingRowApi } from "@/lib/api/endpoints/bookings";
import {
    useAdminCancelCourtBooking,
    useAdminCancelCourtBookingSeries,
    useAdminCreateCourtCalendarBatch,
    useAssignableCoaches,
    useAdminUpdateCourtBooking,
} from "@/lib/queries";
import { cn } from "@/lib/utils";
import {
  addDays,
  differenceInCalendarDays,
  endOfYear,
  format,
  getDay,
  isAfter,
  parse,
  startOfDay,
} from "date-fns";
import { Loader2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
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

type RecurrencePattern = "daily" | "weekly";
type RecurrenceEndMode = "end_by" | "end_after" | "no_end";
type ConfirmAction = "cancel_series" | "cancel_booking";

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

function computeBookingDates(
  anchorYmd: string,
  opts: {
    pattern: RecurrencePattern;
    interval: number;
    selectedDows: Set<number>;
    rangeStartYmd: string;
    endMode: RecurrenceEndMode;
    endByYmd: string;
    endAfterOccurrences: number;
  },
): string[] {
  const anchor = startOfDay(parse(anchorYmd, "yyyy-MM-dd", new Date()));
  const start = startOfDay(parse(opts.rangeStartYmd || anchorYmd, "yyyy-MM-dd", new Date()));
  const interval = Math.max(1, Math.min(365, Math.floor(opts.interval)));
  const endBy = startOfDay(parse(opts.endByYmd, "yyyy-MM-dd", new Date()));
  const maxOccurrences =
    opts.endMode === "end_after"
      ? Math.max(1, Math.min(MAX_DATES_PER_SUBMIT, Math.floor(opts.endAfterOccurrences)))
      : MAX_DATES_PER_SUBMIT;
  const allowedDows =
    opts.pattern === "weekly"
      ? opts.selectedDows.size > 0
        ? opts.selectedDows
        : new Set<number>([getDay(start)])
      : new Set<number>();

  const out: string[] = [];
  let cursor = start;

  for (let safety = 0; safety < 5000; safety++) {
    if (opts.endMode === "end_by" && isAfter(cursor, endBy)) break;
    if (out.length >= maxOccurrences) break;

    const diffDays = differenceInCalendarDays(cursor, start);
    let matchesPattern = false;
    if (opts.pattern === "daily") {
      matchesPattern = diffDays >= 0 && diffDays % interval === 0;
    } else {
      const weekOffset = Math.floor(diffDays / 7);
      matchesPattern =
        diffDays >= 0 && weekOffset % interval === 0 && allowedDows.has(getDay(cursor));
    }
    if (matchesPattern) out.push(format(cursor, "yyyy-MM-dd"));

    cursor = addDays(cursor, 1);
    if (opts.endMode === "no_end" && out.length >= MAX_DATES_PER_SUBMIT) break;
  }

  return Array.from(new Set(out)).sort();
}

function nearestDuration(mins: number): (typeof DURATION_OPTIONS)[number] {
  if ((DURATION_OPTIONS as readonly number[]).includes(mins)) {
    return mins as (typeof DURATION_OPTIONS)[number];
  }
  return DURATION_OPTIONS.reduce((a, b) =>
    Math.abs(b - mins) < Math.abs(a - mins) ? b : a,
  );
}

function RecurrencePatternSection(props: {
  pattern: RecurrencePattern;
  onPatternChange: (v: RecurrencePattern) => void;
  interval: number;
  onIntervalChange: (v: number) => void;
  selectedDows: Set<number>;
  onToggleDow: (dow: number) => void;
  rangeStartYmd: string;
  onRangeStartChange: (v: string) => void;
  endMode: RecurrenceEndMode;
  onEndModeChange: (v: RecurrenceEndMode) => void;
  endByYmd: string;
  onEndByYmdChange: (v: string) => void;
  endAfterOccurrences: number;
  onEndAfterOccurrencesChange: (v: number) => void;
  startMinDate: Date;
}) {
  const {
    pattern,
    onPatternChange,
    interval,
    onIntervalChange,
    selectedDows,
    onToggleDow,
    rangeStartYmd,
    onRangeStartChange,
    endMode,
    onEndModeChange,
    endByYmd,
    onEndByYmdChange,
    endAfterOccurrences,
    onEndAfterOccurrencesChange,
    startMinDate,
  } = props;

  return (
    <div className="space-y-3 border-t border-slate-100 pt-3 text-[15px] dark:border-slate-800">
      <p className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
        Recurrence pattern
      </p>

      <RadioGroup
        value={pattern}
        onValueChange={(v) => onPatternChange(v as RecurrencePattern)}
        className="grid grid-cols-2 gap-2"
      >
        <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-700">
          <RadioGroupItem id="rp-daily" value="daily" />
          <Label htmlFor="rp-daily" className="cursor-pointer text-[15px] font-medium">Daily</Label>
        </label>
        <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-700">
          <RadioGroupItem id="rp-weekly" value="weekly" />
          <Label htmlFor="rp-weekly" className="cursor-pointer text-[15px] font-medium">Weekly</Label>
        </label>
      </RadioGroup>

      <div className="rounded-md border border-slate-200 bg-slate-50/60 px-3 py-2 dark:border-slate-700 dark:bg-slate-900/50">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[15px] text-slate-700 dark:text-slate-200">Recur every</span>
          <Input
            type="number"
            min={1}
            max={365}
            value={interval}
            onChange={(e) => onIntervalChange(Math.max(1, Math.min(365, Number(e.target.value) || 1)))}
            className="h-9 w-[110px] rounded-md text-[15px]"
            inputMode="numeric"
            aria-label="Recurrence interval"
          />
          <span className="text-[15px] text-slate-700 dark:text-slate-200">
            {pattern === "daily" ? "day(s)" : "week(s)"}
            {pattern === "weekly" ? " on:" : ""}
          </span>
        </div>
      </div>

      {pattern === "weekly" ? (
        <div className="grid grid-cols-2 gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 sm:grid-cols-3 lg:grid-cols-4 dark:border-slate-700 dark:bg-slate-900/40">
          {WEEKDAY_BUTTONS.map(({ label, dow }) => {
            const on = selectedDows.has(dow);
            return (
              <Button
                key={dow}
                type="button"
                size="sm"
                variant="ghost"
                className={cn(
                  "h-8 justify-start rounded-md border px-2 text-[15px]",
                  on
                    ? "border-primary bg-primary text-primary-foreground hover:bg-primary/90"
                    : "border-slate-300 bg-white text-slate-800 hover:bg-slate-100 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800",
                )}
                onClick={() => onToggleDow(dow)}
              >
                {label}
              </Button>
            );
          })}
        </div>
      ) : null}

      <fieldset className="space-y-3 rounded-sm border border-slate-200 p-3 dark:border-slate-700">
        <legend className="px-1 text-[15px] font-medium text-slate-700 dark:text-slate-300">
          Range of recurrence
        </legend>
        <RadioGroup
          value={endMode}
          onValueChange={(v) => onEndModeChange(v as RecurrenceEndMode)}
          className="space-y-3"
        >
          <div className="grid gap-2 md:grid-cols-2 md:items-center">
            <Label className="text-[15px]">Start:</Label>
            <DatePickerField
              value={rangeStartYmd}
              onChange={onRangeStartChange}
              minDate={startMinDate}
              className="h-9 rounded-sm text-[15px]"
              popoverContentClassName="z-[100]"
            />
            <label className="flex cursor-pointer items-center gap-2">
              <RadioGroupItem value="end_by" id="re-end-by" />
              <Label htmlFor="re-end-by" className="cursor-pointer text-[15px]">End by:</Label>
            </label>
            <DatePickerField
              value={endByYmd}
              onChange={onEndByYmdChange}
              minDate={startMinDate}
              disabled={endMode !== "end_by"}
              className="h-9 rounded-sm text-[15px]"
              popoverContentClassName="z-[100]"
            />
          </div>

          <div className="grid gap-2 md:grid-cols-2 md:items-center">
            <label className="flex cursor-pointer items-center gap-2">
              <RadioGroupItem value="end_after" id="re-end-after" />
              <Label htmlFor="re-end-after" className="cursor-pointer text-[15px]">End after:</Label>
            </label>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                min={1}
                max={MAX_DATES_PER_SUBMIT}
                value={endAfterOccurrences}
                disabled={endMode !== "end_after"}
                onChange={(e) =>
                  onEndAfterOccurrencesChange(
                    Math.max(1, Math.min(MAX_DATES_PER_SUBMIT, Number(e.target.value) || 1)),
                  )
                }
                className="h-9 w-20 rounded-sm text-[15px]"
              />
              <span className="text-[15px] text-slate-700 dark:text-slate-300">occurrences</span>
            </div>
          </div>

          <div className="grid gap-2 md:grid-cols-2 md:items-center">
            <label className="flex cursor-pointer items-center gap-2">
              <RadioGroupItem value="no_end" id="re-no-end" />
              <Label htmlFor="re-no-end" className="cursor-pointer text-[15px]">No end date</Label>
            </label>
            <div />
          </div>
        </RadioGroup>
      </fieldset>
    </div>
  );
}

export function CourtCalendarBookingDialog(props: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  locationTimezone?: string | null;
  coachLocationId?: string | null;
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
    coachLocationId,
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
  const [recurrencePattern, setRecurrencePattern] = useState<RecurrencePattern>("weekly");
  /** Recurrence interval: repeat every N days/weeks (default 1). */
  const [recurrenceInterval, setRecurrenceInterval] = useState(1);
  const [selectedDows, setSelectedDows] = useState<Set<number>>(new Set());
  const [rangeStartYmd, setRangeStartYmd] = useState(bookingDate);
  const [recurrenceEndMode, setRecurrenceEndMode] = useState<RecurrenceEndMode>("end_by");
  const [endByYmd, setEndByYmd] = useState("");
  const [endAfterOccurrences, setEndAfterOccurrences] = useState(12);
  const [recurrenceDialogOpen, setRecurrenceDialogOpen] = useState(false);
  const [recurrenceConfirmed, setRecurrenceConfirmed] = useState(false);
  const [confirmAction, setConfirmAction] = useState<ConfirmAction | null>(null);
  const [selectedCoachId, setSelectedCoachId] = useState<string>("none");
  /** When true, one summary email lists all created dates (batch only). */
  const [sendConfirmationEmail, setSendConfirmationEmail] = useState(false);

  const adminBatch = useAdminCreateCourtCalendarBatch();
  const updateCourt = useAdminUpdateCourtBooking();
  const adminCancel = useAdminCancelCourtBooking();
  const cancelSeries = useAdminCancelCourtBookingSeries();
  const { data: coaches = [] } = useAssignableCoaches(
    coachLocationId ?? undefined,
    open,
  );

  const anchorBookingYmd = useMemo(() => {
    if (!editingBooking?.bookingDate) return bookingDate;
    return typeof editingBooking.bookingDate === "string"
      ? editingBooking.bookingDate.slice(0, 10)
      : format(editingBooking.bookingDate as Date, "yyyy-MM-dd");
  }, [editingBooking, bookingDate]);

  const anchorYearEndYmd = useMemo(
    () =>
      format(
        endOfYear(parse(anchorBookingYmd, "yyyy-MM-dd", new Date())),
        "yyyy-MM-dd",
      ),
    [anchorBookingYmd],
  );

  const untilDateMin = useMemo(
    () => startOfDay(parse(anchorBookingYmd, "yyyy-MM-dd", new Date())),
    [anchorBookingYmd],
  );

  useEffect(() => {
    if (!open || !column) return;
    setEndByYmd(anchorYearEndYmd);
    setRecurrenceEndMode("end_by");
    setEndAfterOccurrences(12);
    setRecurrenceInterval(1);
    setRecurrencePattern("weekly");
    setRangeStartYmd(anchorBookingYmd);
    setRecurrenceDialogOpen(false);
    setRecurrenceConfirmed(false);
    setConfirmAction(null);
    if (editingBooking) {
      const { m } = parseWallParts(editingBooking.startTime);
      setDurationMinutes(nearestDuration(editingBooking.durationMinutes));
      setStartMinute(m);
      setSelectedDows(new Set([getDay(parse(anchorBookingYmd, "yyyy-MM-dd", new Date()))]));
      setSendConfirmationEmail(false);
      if (isSuperAdmin) {
        setRangeStart(normalizeGridTime(editingBooking.startTime));
        setRangeEnd(normalizeGridTime(editingBooking.endTime));
      }
      setSelectedCoachId(editingBooking.coachId ?? "none");
    } else {
      setDurationMinutes(60);
      setStartMinute(startMinuteProp);
      setSelectedDows(new Set([getDay(parse(bookingDate, "yyyy-MM-dd", new Date()))]));
      setSendConfirmationEmail(false);
      const startHhmm = padTime(startHour, startMinuteProp);
      setRangeStart(normalizeGridTime(startHhmm));
      setRangeEnd(defaultEndSlot(normalizeGridTime(startHhmm), 60));
      setSelectedCoachId("none");
    }
  }, [
    open,
    column,
    startHour,
    startMinuteProp,
    anchorBookingYmd,
    bookingDate,
    editingBooking,
    isSuperAdmin,
    anchorYearEndYmd,
  ]);

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
    return computeBookingDates(anchorBookingYmd, {
      pattern: recurrencePattern,
      interval: recurrenceInterval,
      selectedDows,
      rangeStartYmd,
      endMode: recurrenceEndMode,
      endByYmd: endByYmd || anchorYearEndYmd,
      endAfterOccurrences,
    });
  }, [
    anchorBookingYmd,
    recurrencePattern,
    recurrenceInterval,
    selectedDows,
    rangeStartYmd,
    recurrenceEndMode,
    endByYmd,
    anchorYearEndYmd,
    endAfterOccurrences,
  ]);
  const datesToSubmit = useMemo(() => {
    if (!recurrenceConfirmed) return [anchorBookingYmd];
    return datesPreview.length > 0 ? datesPreview : [anchorBookingYmd];
  }, [recurrenceConfirmed, anchorBookingYmd, datesPreview]);

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

    if (recurrenceConfirmed && recurrenceEndMode === "end_by") {
      const start = startOfDay(
        parse(rangeStartYmd || anchorBookingYmd, "yyyy-MM-dd", new Date()),
      );
      const until = startOfDay(parse(endByYmd || anchorYearEndYmd, "yyyy-MM-dd", new Date()));
      if (isAfter(start, until)) {
        toast.error("End date must be on or after the recurrence start date.");
        return;
      }
    }

    try {
      if (isEdit && editingBooking) {
        await updateCourt.mutateAsync({
          id: editingBooking.id,
          body: {
            bookingDate: anchorBookingYmd,
            startTime,
            endTime,
            coachId: selectedCoachId === "none" ? null : selectedCoachId,
            ...(isSuperAdmin ? { allowOverlap: true } : {}),
          },
        });
        if (!recurrenceConfirmed) {
          toast.success("Booking updated.");
          onOpenChange(false);
          return;
        }

        const additionalDates = datesToSubmit.filter((d) => d !== anchorBookingYmd);
        if (additionalDates.length === 0) {
          toast.success("Booking updated.");
          onOpenChange(false);
          return;
        }
        if (additionalDates.length > MAX_DATES_PER_SUBMIT) {
          toast.error(
            `Too many dates (${additionalDates.length}). Max ${MAX_DATES_PER_SUBMIT}.`,
          );
          return;
        }

        const generatedSeriesId =
          typeof crypto !== "undefined" && "randomUUID" in crypto
            ? crypto.randomUUID()
            : undefined;
        const seriesId = editingBooking.adminCalendarSeriesId ?? generatedSeriesId;
        const res = await adminBatch.mutateAsync({
          courtId: column.id,
          bookingDates: additionalDates,
          startTime,
          endTime,
          durationMinutes: effectiveDurationMinutes,
          ...(seriesId ? { adminCalendarSeriesId: seriesId } : {}),
          sendConfirmationEmail,
          ...(isSuperAdmin ? { allowOverlap: true } : {}),
        });

        for (const err of res.errors) {
          toast.error(`${err.bookingDate}: ${err.message}`);
        }
        if (res.created.length > 0) {
          toast.success(
            `Booking updated + ${res.created.length} recurring booking${
              res.created.length === 1 ? "" : "s"
            } created.`,
          );
        }
        if (res.errors.length === 0 && res.created.length === additionalDates.length) {
          onOpenChange(false);
        }
        return;
      }

      if (datesToSubmit.length > MAX_DATES_PER_SUBMIT) {
        toast.error(
          `Too many dates (${datesToSubmit.length}). Max ${MAX_DATES_PER_SUBMIT}. Narrow weekdays, end sooner, or lower the occurrence count.`,
        );
        return;
      }

      const seriesId =
        datesToSubmit.length > 1 && typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : undefined;

      const res = await adminBatch.mutateAsync({
        courtId: column.id,
        bookingDates: datesToSubmit,
        startTime,
        endTime,
        durationMinutes: effectiveDurationMinutes,
        ...(seriesId ? { adminCalendarSeriesId: seriesId } : {}),
        sendConfirmationEmail,
        ...(isSuperAdmin ? { allowOverlap: true } : {}),
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
      if (res.errors.length === 0 && res.created.length === datesToSubmit.length) {
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
      <DialogContent className="flex max-h-[min(92vh,48rem)] w-[min(92vw,760px)] max-w-3xl flex-col overflow-hidden rounded-2xl">
        <DialogHeader className="shrink-0">
          <DialogTitle>{isEdit ? "Edit booking" : "New booking"}</DialogTitle>
          <DialogDescription>
            Times are validated in the venue timezone
            {locationTimezone ? ` (${locationTimezone})` : ""}.{" "}
            {isEdit
              ? "Update the time slot for this reservation."
              : "The booking is created for your signed-in account."}
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto py-2 pr-1 text-[15px] [-webkit-overflow-scrolling:touch]">
          <div className="space-y-4">
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

          {isEdit ? (
            <div className="space-y-1.5">
              <Label>Assigned coach</Label>
              <Select value={selectedCoachId} onValueChange={setSelectedCoachId}>
                <SelectTrigger className="rounded-xl">
                  <SelectValue placeholder="Choose coach" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No coach assigned</SelectItem>
                  {coaches.map((coach) => (
                    <SelectItem key={coach.id} value={coach.id}>
                      {coach.user?.fullName || coach.user?.email || `Coach ${coach.id.slice(0, 8)}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : null}

          <div className="space-y-2">
              <button
                type="button"
                className="text-sm font-medium text-blue-600 underline underline-offset-2 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                onClick={() => setRecurrenceDialogOpen(true)}
              >
                Recurrence
              </button>
              <Dialog
                open={recurrenceDialogOpen}
                onOpenChange={setRecurrenceDialogOpen}
              >
                <DialogContent className="max-h-[90vh] w-[min(94vw,760px)] overflow-y-auto rounded-2xl">
                  <DialogHeader>
                    <DialogTitle>Recurrence</DialogTitle>
                    <DialogDescription>
                      Configure recurring booking pattern and date range.
                    </DialogDescription>
                  </DialogHeader>
                  <RecurrencePatternSection
                    pattern={recurrencePattern}
                    onPatternChange={setRecurrencePattern}
                    interval={recurrenceInterval}
                    onIntervalChange={setRecurrenceInterval}
                    selectedDows={selectedDows}
                    onToggleDow={toggleDow}
                    rangeStartYmd={rangeStartYmd}
                    onRangeStartChange={setRangeStartYmd}
                    endMode={recurrenceEndMode}
                    onEndModeChange={setRecurrenceEndMode}
                    endByYmd={endByYmd || anchorYearEndYmd}
                    onEndByYmdChange={setEndByYmd}
                    endAfterOccurrences={endAfterOccurrences}
                    onEndAfterOccurrencesChange={setEndAfterOccurrences}
                    startMinDate={untilDateMin}
                  />
                  <p className="text-xs tabular-nums text-slate-600 dark:text-slate-400">
                    {datesPreview.length} booking{datesPreview.length === 1 ? "" : "s"} will be created
                    {datesPreview.length > 12
                      ? ` (first: ${datesPreview[0]}, …)`
                      : datesPreview.length
                        ? `: ${datesPreview.join(", ")}`
                        : ""}
                  </p>
                  <DialogFooter className="pt-2">
                    <Button
                      type="button"
                      variant="outline"
                      className="rounded-xl"
                      onClick={() => setRecurrenceDialogOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="button"
                      className="rounded-xl"
                      onClick={() => {
                        setRecurrenceConfirmed(true);
                        setRecurrenceDialogOpen(false);
                      }}
                    >
                      Confirm
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
              {recurrenceConfirmed ? (
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  Recurrence enabled: {datesToSubmit.length} booking
                  {datesToSubmit.length === 1 ? "" : "s"}
                  {isEdit ? " (includes current booking)." : ""}.
                </p>
              ) : null}
              {/* <label className="flex cursor-pointer items-center gap-2 border-t border-slate-100 pt-3 dark:border-slate-800">
                <Checkbox
                  checked={sendConfirmationEmail}
                  onCheckedChange={(c) => setSendConfirmationEmail(c === true)}
                />
                <span className="text-sm font-medium leading-none">Send confirmation email</span>
              </label> */}
            </div>

          {isEdit && editingBooking?.adminCalendarSeriesId ? (
            <div className="border-t border-slate-100 pt-3 dark:border-slate-800">
              <Button
                type="button"
                variant="outline"
                className="w-full rounded-xl border-amber-600/70 text-amber-900 hover:bg-amber-50 dark:border-amber-500/60 dark:text-amber-100 dark:hover:bg-amber-950/40"
                disabled={busy}
                onClick={() => setConfirmAction("cancel_series")}
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
                onClick={() => setConfirmAction("cancel_booking")}
              >
                Cancel this booking only (customer)
              </Button>
            </div>
          ) : null}
          </div>
        </div>

        <DialogFooter className="shrink-0 gap-2 border-t border-slate-100 pt-4 dark:border-slate-800 sm:gap-0">
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

      <Dialog
        open={confirmAction !== null}
        onOpenChange={(open) => {
          if (!open) setConfirmAction(null);
        }}
      >
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle>
              {confirmAction === "cancel_series"
                ? "Cancel entire series?"
                : "Cancel this booking?"}
            </DialogTitle>
            <DialogDescription>
              {confirmAction === "cancel_series"
                ? "This removes all linked bookings in the recurring or multi-date batch. Confirmation emails are not sent for each date."
                : "Cancel this booking for the customer? This action cannot be undone from the calendar."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              className="rounded-xl"
              onClick={() => setConfirmAction(null)}
              disabled={busy}
            >
              Keep booking
            </Button>
            <Button
              type="button"
              variant="destructive"
              className="rounded-xl"
              disabled={busy}
              onClick={() => {
                const action = confirmAction;
                setConfirmAction(null);
                if (action === "cancel_series") {
                  void handleCancelSeries();
                  return;
                }
                if (action === "cancel_booking") {
                  void handleAdminCancel();
                }
              }}
            >
              {confirmAction === "cancel_series"
                ? "Cancel series"
                : "Cancel booking"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
}
