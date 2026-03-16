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
import { Label } from "@/components/ui/label";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { TimeSlotPicker } from "@/components/ui/time-slot-picker";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCreateCoachSession } from "@/lib/queries";
import { useAuth } from "@/lib/auth-store";
import type { Coach } from "@/types";
import { format, differenceInDays, eachDayOfInterval } from "date-fns";
import { Clock, DollarSign } from "lucide-react";
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
  } = useForm<CoachSessionFormValues>({
    resolver: zodResolver(coachSessionSchema),
    defaultValues: {
      sessionType: "private",
    },
  });

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
      router.push("/dashboard");
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
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">Book Session with {coach.user?.fullName}</DialogTitle>
          <DialogDescription>
            Schedule a coaching session. Rate: ${coach.hourlyRate}/hour
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Label className="text-base font-semibold mb-3 block">Select Date Range</Label>
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
          </motion.div>

          {submitError && (
            <p className="text-sm text-destructive">{submitError}</p>
          )}
          {dateRange.from && dateRange.to && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="grid md:grid-cols-2 gap-6"
            >
              <div>
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
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="duration">Duration</Label>
                  <Select
                    value={selectedDuration}
                    onValueChange={(value) => {
                      setSelectedDuration(value);
                      setValue("duration", value);
                    }}
                  >
                    <SelectTrigger id="duration">
                      <SelectValue placeholder="Select duration" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="60">1 hour</SelectItem>
                      <SelectItem value="90">1.5 hours</SelectItem>
                      <SelectItem value="120">2 hours</SelectItem>
                    </SelectContent>
                  </Select>
                  {errors.duration && (
                    <p className="text-sm text-destructive">{errors.duration.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sessionType">Session Type</Label>
                  <Select
                    onValueChange={(value) => setValue("sessionType", value as "private" | "group")}
                  >
                    <SelectTrigger id="sessionType">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="private">Private</SelectItem>
                      <SelectItem value="group">Group</SelectItem>
                    </SelectContent>
                  </Select>
                  {errors.sessionType && (
                    <p className="text-sm text-destructive">{errors.sessionType.message}</p>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {dateRange.from && dateRange.to && selectedStartTime && selectedDuration && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="p-4 bg-blue-50 rounded-lg border border-blue-200"
            >
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-sm text-muted-foreground">Session Summary</p>
                  <p className="font-medium">
                    {format(dateRange.from, "MMM dd")} - {format(dateRange.to, "MMM dd, yyyy")}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {selectedStartTime} • <Clock className="inline h-3 w-3 mr-1" />
                    {selectedDuration} minutes • {differenceInDays(dateRange.to, dateRange.from) + 1} day(s)
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Total</p>
                  <p className="text-2xl font-bold text-primary">
                    <DollarSign className="inline h-5 w-5" />
                    {calculateTotal().toFixed(2)}
                  </p>
                </div>
              </div>
            </motion.div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => {
              reset();
              setDateRange({ from: undefined, to: undefined });
              setSelectedStartTime(undefined);
              setSelectedDuration("60");
              onOpenChange(false);
            }}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={!dateRange.from || !dateRange.to || !selectedStartTime || !selectedDuration || createSession.isPending}
            >
              {createSession.isPending ? "Booking..." : "Confirm Booking"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
