"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { ApiError } from "@/lib/api";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion } from "framer-motion";
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
import { TimeSlotPicker } from "@/components/ui/time-slot-picker";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCreateCoachSession } from "@/lib/queries";
import { useAuth } from "@/lib/auth-store";
import type { Coach } from "@/types";
import { format, differenceInDays, eachDayOfInterval } from "date-fns";
import { Clock, DollarSign, CalendarDays } from "lucide-react";
import { useRouter } from "next/navigation";
import { coachSessionSchema, type CoachSessionFormValues } from "@/features/coaches/schemas/coach-session.schema";

interface CoachBookingModalProps {
  coach: Coach | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CoachBookingModal({
  coach,
  open,
  onOpenChange,
}: CoachBookingModalProps) {
  const [dateRange, setDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({
    from: undefined,
    to: undefined,
  });
  const [selectedStartTime, setSelectedStartTime] = useState<string>();
  const [selectedDuration, setSelectedDuration] = useState<string>("60");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const { user } = useAuth();
  const createSession = useCreateCoachSession();
  const router = useRouter();

  const {
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch,
  } = useForm<CoachSessionFormValues>({
    resolver: zodResolver(coachSessionSchema),
    mode: "onSubmit",
    defaultValues: {
      sessionType: "private",
      duration: "60",
    },
  });

  const sessionType = watch("sessionType");

  const onSubmit = async (data: CoachSessionFormValues) => {
    if (!coach || !user || !data.dateRange.from || !data.dateRange.to) return;
    
    const duration = parseInt(data.duration);
    const days = differenceInDays(data.dateRange.to, data.dateRange.from) + 1;

    setSubmitError(null);
    try {
      const dates = eachDayOfInterval({
        start: data.dateRange.from,
        end: data.dateRange.to,
      });

      for (const date of dates) {
        await createSession.mutateAsync({
          coachId: coach.id,
          sessionDate: format(date, "yyyy-MM-dd"),
          startTime: data.startTime,
          durationMinutes: duration,
          sessionType: data.sessionType,
          studentIds: [user.id],
        });
      }

      reset();
      setDateRange({ from: undefined, to: undefined });
      setSelectedStartTime(undefined);
      setSelectedDuration("60");
      setSubmitError(null);
      onOpenChange(false);
      router.push("/booking-history");
    } catch (error) {
      if (error instanceof ApiError) {
        const msg = error.body?.message;
        setSubmitError(Array.isArray(msg) ? msg[0] : (msg ?? "Session booking failed."));
      } else {
        setSubmitError("Session booking failed. Please try again.");
      }
    }
  };

  const handleRangeSelect = (range: { from: Date | undefined; to: Date | undefined }) => {
    setDateRange(range);
    if (range.from && range.to) {
      setValue("dateRange", { from: range.from, to: range.to });
    }
  };

  const handleStartTimeSelect = (time: string) => {
    setSelectedStartTime(time);
    setValue("startTime", time);
  };

  if (!coach) return null;

  const calculateTotal = () => {
    if (!selectedDuration || !dateRange.from || !dateRange.to) return 0;
    const duration = parseInt(selectedDuration);
    const days = differenceInDays(dateRange.to, dateRange.from) + 1;
    return (duration / 60) * coach.hourlyRate * days;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] max-w-4xl flex-col gap-0 overflow-hidden rounded-3xl border border-border/60 bg-background p-0 shadow-2xl sm:rounded-3xl">
        <div className="relative shrink-0 overflow-hidden bg-gradient-to-br from-primary via-primary to-primary/85 p-6 text-primary-foreground">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-2xl font-bold">
              Book Session with {coach.user?.fullName}
            </DialogTitle>
            <DialogDescription className="mt-2 text-md text-primary-foreground/85">
              Professional coaching • ${coach.hourlyRate}/hour
            </DialogDescription>
          </DialogHeader>
        </div>
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="min-h-0 flex-1 space-y-8 overflow-y-auto p-6 scrollbar-booking"
        >
          <div className="rounded-xl border border-slate-200 bg-slate-50/50 dark:bg-slate-900/30 p-5 space-y-3">
            <Label className="text-base font-semibold flex items-center gap-2">
              <CalendarDays className="w-5 h-5 text-primary" /> Select Date Range
            </Label>
            <DateRangePicker
              selectedRange={dateRange}
              onSelectRange={handleRangeSelect}
              minDate={new Date()}
            />
            {errors.dateRange && (
              <p className="text-sm text-destructive mt-2">
                {errors.dateRange.from?.message || errors.dateRange.to?.message}
              </p>
            )}
          </div>

          {dateRange.from && dateRange.to && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="grid md:grid-cols-2 gap-6"
            >
              <div className="rounded-xl border border-slate-200 bg-slate-50/50 dark:bg-slate-900/30 p-5 space-y-3">
                <Label className="text-base font-semibold flex items-center gap-2">
                  <Clock className="w-5 h-5 text-primary" /> Select Time
                </Label>
                <TimeSlotPicker
                  selectedTime={selectedStartTime}
                  onSelectTime={handleStartTimeSelect}
                  startHour={8}
                  endHour={20}
                  intervalMinutes={60}
                />
                {errors.startTime && (
                  <p className="text-sm text-destructive mt-2">{errors.startTime.message}</p>
                )}
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50/50 dark:bg-slate-900/30 p-5 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="duration" className="text-base font-semibold">Duration</Label>
                  <Select
                    value={selectedDuration}
                    onValueChange={(value) => {
                      setSelectedDuration(value);
                      setValue("duration", value);
                    }}
                  >
                    <SelectTrigger id="duration" className="h-11">
                      <SelectValue placeholder="Select duration" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="60">1 hour</SelectItem>
                      <SelectItem value="90">1.5 hours</SelectItem>
                      <SelectItem value="120">2 hours</SelectItem>
                    </SelectContent>
                  </Select>
                  {errors.duration && (
                    <p className="text-sm text-destructive mt-2">{errors.duration.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sessionType" className="text-base font-semibold">Session Type</Label>
                  <Select
                    value={sessionType ?? "private"}
                    onValueChange={(value) => setValue("sessionType", value as "private" | "group")}
                  >
                    <SelectTrigger id="sessionType" className="h-11">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="private">Private</SelectItem>
                      <SelectItem value="group">Group</SelectItem>
                    </SelectContent>
                  </Select>
                  {errors.sessionType && (
                    <p className="text-sm text-destructive mt-2">{errors.sessionType.message}</p>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {submitError && (
            <p className="text-sm text-destructive font-medium bg-red-50 dark:bg-red-950/30 p-3 rounded-lg">{submitError}</p>
          )}

          {dateRange.from && dateRange.to && selectedStartTime && selectedDuration && (
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              className="p-6 bg-slate-900 text-white rounded-xl shadow-inner"
            >
              <div className="flex justify-between items-start gap-4">
                <div>
                  <h4 className="text-lg font-semibold text-primary-foreground/90">Session Summary</h4>
                  <p className="text-slate-300 mt-1">
                    {format(dateRange.from, "MMM dd")} – {format(dateRange.to, "MMM dd, yyyy")}
                  </p>
                  <p className="text-slate-300 font-medium mt-1">
                    {selectedStartTime} • <Clock className="inline h-4 w-4 mr-1" />
                    {selectedDuration} min • {differenceInDays(dateRange.to, dateRange.from) + 1} day(s)
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-slate-400">Total</p>
                  <p className="text-3xl font-bold text-white">
                    <DollarSign className="inline h-6 w-6 mr-1" />
                    {calculateTotal().toFixed(2)}
                  </p>
                </div>
              </div>
            </motion.div>
          )}

          <DialogFooter className="pt-6 border-t mt-8 gap-3 sm:gap-0">
            <Button
              type="button"
              variant="ghost"
              className="text-slate-500"
              onClick={() => {
                reset();
                setDateRange({ from: undefined, to: undefined });
                setSelectedStartTime(undefined);
                setSelectedDuration("60");
                onOpenChange(false);
              }}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-primary hover:bg-primary-hover text-primary-foreground px-8 py-6 text-lg rounded-full shadow-brand transition-all min-w-[200px]"
              disabled={!dateRange.from || !dateRange.to || !selectedStartTime || !selectedDuration || createSession.isPending}
              aria-busy={createSession.isPending}
            >
              {createSession.isPending ? (
                <LoadingLabel>Booking session</LoadingLabel>
              ) : (
                "Confirm Booking"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
