"use client";

import { useState, useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { ApiError } from "@/lib/api";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion, AnimatePresence } from "framer-motion";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { LoadingLabel } from "@/components/ui/loading-label";
import { Label } from "@/components/ui/label";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BookingTypeSelector } from "@/features/booking/components/booking-type-selector";
import { useCreateCourtBooking, useCourtAvailabilityForDates } from "@/lib/queries";
import { useCoaches } from "@/lib/queries";
import { useAuth } from "@/lib/auth-store";
import { useBookingCalculations } from "@/features/booking/hooks/use-booking-calculations";
import { bookingSchema } from "@/features/booking/schemas/booking.schema";
import type { BookingFormValues } from "@/features/booking/schemas/booking.schema";
import type { Court } from "@/types";
import { formatCurrency } from "@/lib/format";
import { format, eachDayOfInterval } from "date-fns";
import { useRouter } from "next/navigation";
import { Clock, CalendarDays, MapPin } from "lucide-react";

interface CourtBookingModalProps {
  court: Court | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const DURATIONS = [30, 60, 90] as const;
type Duration = typeof DURATIONS[number];

function timeToMinutes(timeStr: string) {
  const [h, m] = timeStr.split(":").map(Number);
  return h * 60 + m;
}

export function CourtBookingModal({
  court,
  open,
  onOpenChange,
}: CourtBookingModalProps) {
  const [dateRange, setDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({
    from: undefined,
    to: undefined,
  });

  const [bookingType, setBookingType] = useState<"COURT_ONLY" | "COURT_COACH" | "TRAINING">("COURT_ONLY");
  const [selectedCoachId, setSelectedCoachId] = useState<string>("");
  const [submitError, setSubmitError] = useState<string | null>(null);

  // New states for dynamic time slots
  const [selectedMainSlot, setSelectedMainSlot] = useState<{ startTime: string; endTime: string } | null>(null);
  const [duration, setDuration] = useState<Duration>(60);
  const [selectedBlock, setSelectedBlock] = useState<{ start: string; end: string } | null>(null);

  const { user } = useAuth();
  const createBooking = useCreateCourtBooking();
  const { data: coaches } = useCoaches();
  const router = useRouter();

  const defaultSlots = [
    { startTime: "08:00", endTime: "10:30" },
    { startTime: "14:00", endTime: "15:30" },
    { startTime: "19:00", endTime: "20:30" },
  ];
  const timeSlots = court?.timeSlots?.length ? court.timeSlots : defaultSlots;
  const selectedCoach = coaches?.find((c) => c.id === selectedCoachId);

  const {
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
  } = useForm<BookingFormValues>({
    resolver: zodResolver(bookingSchema),
    mode: "onSubmit",
    defaultValues: {
      bookingType: "COURT_ONLY",
      courtId: "",
    },
  });

  useEffect(() => {
    if (open && court) {
      setValue("courtId", court.id);
    }
  }, [open, court, setValue]);

  useEffect(() => {
    if (selectedBlock) {
      setValue("startTime", selectedBlock.start);
      setValue("endTime", selectedBlock.end);
    }
  }, [selectedBlock, setValue]);

  const priceBreakdown = useBookingCalculations(
    court ?? null,
    selectedCoach || null,
    dateRange,
    selectedBlock?.start,
    selectedBlock?.end,
    bookingType,
  );

  const onSubmit = async (data: BookingFormValues) => {
    if (!court || !user || !data.dateRange.from || !data.dateRange.to || !selectedBlock) return;

    const durationMinutes = timeToMinutes(selectedBlock.end) - timeToMinutes(selectedBlock.start);

    setSubmitError(null);
    try {
      const dates = eachDayOfInterval({
        start: data.dateRange.from,
        end: data.dateRange.to,
      });

      for (const date of dates) {
        await createBooking.mutateAsync({
          userId: user.id,
          courtId: court.id,
          coachId: data.coachId || null,
          bookingType: data.bookingType,
          bookingDate: format(date, "yyyy-MM-dd"),
          startTime: selectedBlock.start,
          endTime: selectedBlock.end,
          durationMinutes,
          totalPrice: priceBreakdown?.total || 0,
        });
      }

      reset();
      setDateRange({ from: undefined, to: undefined });
      setSelectedMainSlot(null);
      setSelectedBlock(null);
      setBookingType("COURT_ONLY");
      setSelectedCoachId("");
      setSubmitError(null);
      onOpenChange(false);
      router.push("/booking-history");
    } catch (error) {
      if (error instanceof ApiError) {
        const msg = error.body?.message;
        const text =
          typeof msg === "string"
            ? msg
            : Array.isArray(msg)
              ? msg.join(", ")
              : error.message;
        setSubmitError(text);
      } else {
        setSubmitError("Booking failed. Please try again.");
      }
    }
  };

  const datesInRange = useMemo(() => {
    if (!dateRange.from || !dateRange.to) return [] as string[];
    return eachDayOfInterval({ start: dateRange.from, end: dateRange.to }).map((d) =>
      format(d, "yyyy-MM-dd"),
    );
  }, [dateRange.from, dateRange.to]);

  const {
    isLoading: availabilityLoading,
    isError: availabilityQueryError,
    data: availabilityByDay,
  } = useCourtAvailabilityForDates(
    court?.id,
    datesInRange,
    duration,
    open && !!court && datesInRange.length > 0 && !!selectedMainSlot,
  );

  /** Server truth: slots free on every selected day, inside the chosen time window. */
  const serverSlotsInWindow = useMemo(() => {
    if (!selectedMainSlot || datesInRange.length === 0) return [];
    if (availabilityByDay.length !== datesInRange.length) return [];

    const toHHmm = (t: string) => {
      const [h, m] = t.split(":").map(Number);
      return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
    };
    const slotKey = (s: { start: string; end: string }) =>
      `${toHHmm(s.start)}_${toHHmm(s.end)}`;

    const winStart = timeToMinutes(selectedMainSlot.startTime);
    const winEnd = timeToMinutes(selectedMainSlot.endTime);
    const inWindow = (s: { start: string; end: string }) => {
      const a = timeToMinutes(toHHmm(s.start));
      const b = timeToMinutes(toHHmm(s.end));
      return a >= winStart && b <= winEnd;
    };

    const firstDay = availabilityByDay[0] ?? [];
    const candidates = firstDay.filter(inWindow);

    return candidates
      .filter((slot) => {
        const k = slotKey(slot);
        return availabilityByDay.every((daySlots) => daySlots.some((s) => slotKey(s) === k));
      })
      .map((s) => ({ start: toHHmm(s.start), end: toHHmm(s.end) }));
  }, [selectedMainSlot, datesInRange, availabilityByDay]);

  useEffect(() => {
    if (availabilityLoading || !selectedBlock) return;
    const ok = serverSlotsInWindow.some(
      (s) => s.start === selectedBlock.start && s.end === selectedBlock.end,
    );
    if (!ok) setSelectedBlock(null);
  }, [availabilityLoading, serverSlotsInWindow, selectedBlock]);

  const handleRangeSelect = (range: { from: Date | undefined; to: Date | undefined }) => {
    setDateRange(range);
    if (range.from && range.to) {
      setValue("dateRange", { from: range.from, to: range.to });
    }
    setSelectedBlock(null);
  };

  if (!open || !court) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] max-w-4xl flex-col gap-0 overflow-hidden rounded-3xl border border-border/60 bg-background p-0 shadow-2xl sm:rounded-3xl">
        <div className="relative shrink-0 overflow-hidden bg-gradient-to-br from-primary via-primary to-primary/85 px-6 pb-8 pt-7 text-primary-foreground">
          <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-white/10 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-8 left-1/4 h-32 w-64 rounded-full bg-black/10 blur-2xl" />
          <div className="relative flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-primary-foreground/70">
                Reserve your court
              </p>
              <DialogTitle className="text-2xl font-black tracking-tight sm:text-3xl">
                Book {court.name}
              </DialogTitle>
              <DialogDescription className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-primary-foreground/90">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-black/15 px-3 py-0.5 text-xs font-semibold backdrop-blur-sm">
                  <MapPin className="h-3.5 w-3.5" />
                  {court.type === "indoor" ? "Indoor" : "Outdoor"}
                </span>
                <span className="font-semibold">{formatCurrency(Number(court.pricePerHour))}/hour</span>
              </DialogDescription>
            </div>
          </div>
        </div>

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="min-h-0 flex-1 space-y-8 overflow-y-auto bg-gradient-to-b from-background to-muted/20 px-5 py-7 scrollbar-booking sm:px-8"
        >
          <section className="rounded-2xl border border-border/80 bg-card p-5 shadow-sm">
            <BookingTypeSelector
              value={bookingType}
              onChange={(v) => {
                setBookingType(v);
                setValue("bookingType", v);
              }}
            />
          </section>

          {(bookingType === "COURT_COACH" || bookingType === "TRAINING") && (
            <motion.section
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-2xl border border-primary/15 bg-primary/[0.04] p-5"
            >
              <Label className="mb-3 block text-sm font-bold text-foreground">Coach</Label>
              <Select
                value={selectedCoachId}
                onValueChange={(id) => {
                  setSelectedCoachId(id);
                  setValue("coachId", id);
                }}
              >
                <SelectTrigger className="h-12 rounded-xl border-border bg-background text-left font-medium">
                  <SelectValue placeholder="Choose a coach for your session" />
                </SelectTrigger>
                <SelectContent>
                  {coaches?.map((coach) => (
                    <SelectItem key={coach.id} value={coach.id}>
                      {coach.user?.fullName || `Coach ${coach.id}`} — {formatCurrency(Number(coach.hourlyRate))}/hr
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </motion.section>
          )}

          <div className="grid gap-8 md:grid-cols-2 md:items-start">
            <section className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <CalendarDays className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-foreground">Dates</h3>
                  <p className="text-xs text-muted-foreground">Tap start, then end of your range</p>
                </div>
              </div>
              <DateRangePicker selectedRange={dateRange} onSelectRange={handleRangeSelect} minDate={new Date()} />
            </section>

            <AnimatePresence>
              {dateRange.from && dateRange.to && (
                <motion.section
                  initial={{ opacity: 0, x: 12 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="space-y-6 rounded-2xl border border-border/80 bg-card p-5 shadow-sm"
                >
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <Clock className="h-4 w-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-foreground">Time window</h3>
                      <p className="text-xs text-muted-foreground">Pick a block, then length & slot</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {timeSlots.map((slot, i) => {
                      const isSelected = selectedMainSlot?.startTime === slot.startTime;
                      return (
                        <Button
                          key={i}
                          type="button"
                          variant={isSelected ? "default" : "outline"}
                          className={`h-auto flex-col gap-0.5 rounded-xl py-3 ${isSelected
                              ? "bg-primary text-primary-foreground shadow-md ring-2 ring-primary/25"
                              : "border-dashed hover:border-primary/40 hover:bg-primary/5"
                            }`}
                          onClick={() => {
                            setSelectedMainSlot(slot);
                            setSelectedBlock(null);
                          }}
                        >
                          <span className="text-sm font-bold">{slot.startTime}</span>
                          <span className="text-[11px] opacity-80">→ {slot.endTime}</span>
                        </Button>
                      );
                    })}
                  </div>

                  {selectedMainSlot && (
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="space-y-4 border-t border-border pt-5"
                    >
                      <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Duration</p>
                      <div className="flex flex-wrap gap-2">
                        {DURATIONS.map((d) => (
                          <Button
                            key={d}
                            type="button"
                            variant={duration === d ? "default" : "outline"}
                            onClick={() => {
                              setDuration(d);
                              setSelectedBlock(null);
                            }}
                            className={`min-w-[4.5rem] rounded-full px-4 font-bold ${duration === d ? "bg-primary shadow-sm" : "border-muted-foreground/20"
                              }`}
                          >
                            {d} min
                          </Button>
                        ))}
                      </div>

                      <div>
                        <p className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">
                          Available slots
                        </p>
                        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                          {availabilityLoading && (
                            <p className="col-span-full rounded-lg bg-muted/60 px-3 py-3 text-sm text-muted-foreground">
                              Loading available slots from server…
                            </p>
                          )}
                          {!availabilityLoading && availabilityQueryError && (
                            <p className="col-span-full rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                              Could not load availability. Refresh or try again in a moment.
                            </p>
                          )}
                          {!availabilityLoading &&
                            !availabilityQueryError &&
                            serverSlotsInWindow.map((block, i) => {
                              const isSelected = selectedBlock?.start === block.start;
                              return (
                                <Button
                                  key={`${block.start}-${block.end}-${i}`}
                                  type="button"
                                  variant={isSelected ? "default" : "outline"}
                                  className={
                                    isSelected
                                      ? "rounded-xl border-transparent bg-primary text-primary-foreground shadow-md"
                                      : "rounded-xl border-dashed hover:border-primary/50 hover:bg-primary/5"
                                  }
                                  onClick={() => setSelectedBlock(block)}
                                >
                                  <span className="font-mono text-xs font-semibold">
                                    {block.start} – {block.end}
                                  </span>
                                </Button>
                              );
                            })}
                          {!availabilityLoading &&
                            !availabilityQueryError &&
                            serverSlotsInWindow.length === 0 && (
                              <p className="col-span-full rounded-lg bg-amber-500/10 px-3 py-2 text-sm text-amber-800 dark:text-amber-200">
                                No open slots in this window for every selected day (or they may be taken). Try
                                another date range, time window, or duration.
                              </p>
                            )}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </motion.section>
              )}
            </AnimatePresence>
          </div>

          {submitError && (
            <p className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive">
              {submitError}
            </p>
          )}

          {selectedBlock && priceBreakdown && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-br from-foreground via-foreground to-foreground/95 p-6 text-primary-foreground shadow-xl"
            >
              <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-primary-foreground/60">Summary</p>
                  <p className="mt-1 text-lg font-bold">
                    {dateRange.from && format(dateRange.from, "MMM d")}
                    {dateRange.to &&
                      dateRange.from?.getTime() !== dateRange.to?.getTime() &&
                      ` → ${format(dateRange.to, "MMM d")}`}
                  </p>
                  <p className="mt-0.5 text-sm text-primary-foreground/80">
                    {selectedBlock.start} – {selectedBlock.end} · {duration} min
                  </p>
                </div>
                <div className="text-left sm:text-right">
                  <p className="text-xs font-medium text-primary-foreground/60">Total</p>
                  <p className="text-3xl font-black tracking-tight sm:text-4xl">
                    {formatCurrency(priceBreakdown.total)}
                  </p>
                </div>
              </div>
            </motion.div>
          )}

          <DialogFooter className="flex-col-reverse gap-3 border-t border-border/80 pt-6 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              className="w-full rounded-full border-2 sm:w-auto"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="w-full rounded-full bg-primary px-10 py-6 text-base font-bold shadow-brand transition-all hover:opacity-95 sm:min-w-[220px]"
              disabled={!selectedBlock || createBooking.isPending}
              aria-busy={createBooking.isPending}
            >
              {createBooking.isPending ? (
                <LoadingLabel>Confirming booking</LoadingLabel>
              ) : (
                "Confirm booking"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
