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
  recurring: boolean,
): string[] {
  const anchor = startOfDay(parse(anchorYmd, "yyyy-MM-dd", new Date()));
  const yearEnd = endOfYear(anchor);
  const out = new Set<string>();

  if (selectedDows.size === 0) {
    out.add(format(anchor, "yyyy-MM-dd"));
    return Array.from(out).sort();
  }

  for (const dow of Array.from(selectedDows)) {
    if (recurring) {
      let d = firstDateOnOrAfterAnchor(anchorYmd, dow);
      while (!isAfter(d, yearEnd)) {
        out.add(format(d, "yyyy-MM-dd"));
        d = addDays(d, 7);
      }
    } else {
      const d = firstDateOnOrAfterAnchor(anchorYmd, dow);
      out.add(format(d, "yyyy-MM-dd"));
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
  const [selectedDows, setSelectedDows] = useState<Set<number>>(new Set());
  const [recurring, setRecurring] = useState(false);
  /** When true, one summary email lists all created dates (batch only). */
  const [sendConfirmationEmail, setSendConfirmationEmail] = useState(false);

  const adminBatch = useAdminCreateCourtCalendarBatch();
  const updateCourt = useAdminUpdateCourtBooking();
  const adminCancel = useAdminCancelCourtBooking();
  const cancelSeries = useAdminCancelCourtBookingSeries();

  useEffect(() => {
    if (!open || !column) return;
    if (editingBooking) {
      const { h, m } = parseWallParts(editingBooking.startTime);
      setDurationMinutes(nearestDuration(editingBooking.durationMinutes));
      setStartMinute(m);
      setSelectedDows(new Set());
      setRecurring(false);
      setSendConfirmationEmail(false);
    } else {
      setDurationMinutes(60);
      setStartMinute(startMinuteProp);
      setSelectedDows(new Set());
      setRecurring(false);
      setSendConfirmationEmail(false);
    }
  }, [open, column?.id, startHour, startMinuteProp, bookingDate, editingBooking]);

  const startTime = useMemo(
    () => padTime(startHour, startMinute),
    [startHour, startMinute],
  );

  const { end: endTime, crossesMidnight } = useMemo(
    () => addMinutesWallClock(startHour, startMinute, durationMinutes),
    [startHour, startMinute, durationMinutes],
  );

  const datesPreview = useMemo(() => {
    if (isEdit) return [];
    return computeBookingDates(bookingDate, selectedDows, recurring);
  }, [isEdit, bookingDate, selectedDows, recurring]);

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
    if (crossesMidnight) {
      toast.error("End time would pass midnight. Choose a shorter duration or earlier start.");
      return;
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
          `Too many dates (${datesPreview.length}). Max ${MAX_DATES_PER_SUBMIT}. Narrow weekdays or turn off recurring.`,
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
        durationMinutes,
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
              {crossesMidnight ? (
                <span className="text-amber-800 dark:text-amber-200">
                  {startTime} – (past midnight — pick a shorter duration)
                </span>
              ) : (
                <>
                  {startTime} – {endTime} ({durationMinutes} min)
                </>
              )}
            </p>
          </div>

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

          {!isEdit ? (
            <div className="space-y-2">
              <Label>Apply to weekdays</Label>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Leave none selected to book only the date shown in the calendar. Select days for the
                next occurrence of each (on or after the calendar date).{" "}
                <span className="font-medium text-slate-600 dark:text-slate-300">Recurring</span>{" "}
                repeats each chosen weekday until the end of this calendar year.
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
              <label className="flex cursor-pointer items-center gap-2 pt-1">
                <Checkbox
                  checked={recurring}
                  onCheckedChange={(c) => setRecurring(c === true)}
                />
                <span className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                  Recurring until end of{" "}
                  {format(endOfYear(parse(bookingDate, "yyyy-MM-dd", new Date())), "yyyy")}
                </span>
              </label>
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
            disabled={busy || crossesMidnight}
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
