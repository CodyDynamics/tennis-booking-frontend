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
import { TimeRangePicker } from "@/components/ui/time-range-picker";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BookingTypeSelector } from "@/features/booking/components/booking-type-selector";
import { useCreateCourtBooking } from "@/lib/queries";
import { useCoaches } from "@/lib/queries";
import { useAuth } from "@/lib/auth-store";
import { useBookingCalculations } from "@/features/booking/hooks/use-booking-calculations";
import { bookingSchema } from "@/features/booking/schemas/booking.schema";
import type { BookingFormValues } from "@/features/booking/schemas/booking.schema";
import type { Court } from "@/types";
import { format, differenceInDays, eachDayOfInterval } from "date-fns";
import { useRouter } from "next/navigation";

interface CourtBookingModalProps {
  court: Court | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
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
  const [selectedStartTime, setSelectedStartTime] = useState<string>();
  const [selectedEndTime, setSelectedEndTime] = useState<string>();
  const [bookingType, setBookingType] = useState<"COURT_ONLY" | "COURT_COACH" | "TRAINING">("COURT_ONLY");
  const [selectedCoachId, setSelectedCoachId] = useState<string>("");
  const [submitError, setSubmitError] = useState<string | null>(null);

  const { user } = useAuth();
  const createBooking = useCreateCourtBooking();
  const { data: coaches } = useCoaches();
  const router = useRouter();

  // Early return if modal is closed to prevent hydration issues
  if (!open || !court) return null;

  const selectedCoach = coaches?.find(c => c.id === selectedCoachId);

  const {
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch,
  } = useForm<BookingFormValues>({
    resolver: zodResolver(bookingSchema),
    defaultValues: {
      bookingType: "COURT_ONLY",
    },
  });

  const priceBreakdown = useBookingCalculations(
    court,
    selectedCoach || null,
    dateRange,
    selectedStartTime,
    selectedEndTime,
    bookingType
  );

  const onSubmit = async (data: BookingFormValues) => {
    if (!court || !user || !data.dateRange.from || !data.dateRange.to) return;

    const startHour = parseInt(data.startTime.split(":")[0]);
    const endHour = parseInt(data.endTime.split(":")[0]);
    const hours = endHour - startHour;
    const durationMinutes = hours * 60;

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
          startTime: data.startTime,
          endTime: data.endTime,
          durationMinutes,
          totalPrice: priceBreakdown?.total || 0,
        });
      }

      reset();
      setDateRange({ from: undefined, to: undefined });
      setSelectedStartTime(undefined);
      setSelectedEndTime(undefined);
      setBookingType("COURT_ONLY");
      setSelectedCoachId("");
      setSubmitError(null);
      onOpenChange(false);
      router.push("/dashboard");
    } catch (error) {
      if (error instanceof ApiError) {
        const msg = error.body?.message;
        setSubmitError(Array.isArray(msg) ? msg[0] : (msg ?? "Booking failed."));
      } else {
        setSubmitError("Booking failed. Please try again.");
      }
    }
  };

  const handleRangeSelect = (range: { from: Date | undefined; to: Date | undefined }) => {
    setDateRange(range);
    if (range.from && range.to) {
      setValue("dateRange", { from: range.from, to: range.to });
    }
  };

  const handleFromTimeChange = (time: string) => {
    setSelectedStartTime(time);
    setValue("startTime", time);
    // Reset end time if new start time is after current end time
    if (selectedEndTime) {
      const startHour = parseInt(time.split(":")[0]);
      const endHour = parseInt(selectedEndTime.split(":")[0]);
      if (endHour <= startHour) {
        setSelectedEndTime(undefined);
        setValue("endTime", "");
      }
    }
  };

  const handleToTimeChange = (time: string | undefined) => {
    if (time) {
      setSelectedEndTime(time);
      setValue("endTime", time);
    } else {
      setSelectedEndTime(undefined);
      setValue("endTime", "");
    }
  };

  const handleBookingTypeChange = (type: "COURT_ONLY" | "COURT_COACH" | "TRAINING") => {
    setBookingType(type);
    setValue("bookingType", type);
    if (type === "COURT_ONLY") {
      setSelectedCoachId("");
      setValue("coachId", undefined);
    }
  };

  const handleCoachSelect = (coachId: string) => {
    setSelectedCoachId(coachId);
    setValue("coachId", coachId);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">Book {court.name}</DialogTitle>
          <DialogDescription>
            Select your preferred date and time slot. {court.type === "indoor" ? "Indoor" : "Outdoor"} court - ${court.pricePerHour}/hour
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <BookingTypeSelector
              value={bookingType}
              onChange={handleBookingTypeChange}
            />
            {errors.bookingType && (
              <p className="text-sm text-destructive mt-2">{errors.bookingType.message}</p>
            )}
          </motion.div>

          {(bookingType === "COURT_COACH" || bookingType === "TRAINING") && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <Label className="text-base font-semibold mb-3 block">Select Coach</Label>
              <Select value={selectedCoachId} onValueChange={handleCoachSelect}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a coach" />
                </SelectTrigger>
                <SelectContent>
                  {coaches?.map((coach) => (
                    <SelectItem key={coach.id} value={coach.id}>
                      {coach.user?.fullName || `Coach ${coach.id}`} - ${coach.hourlyRate}/hr
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.coachId && (
                <p className="text-sm text-destructive mt-2">{errors.coachId.message}</p>
              )}
            </motion.div>
          )}

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

          {dateRange.from && dateRange.to && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <TimeRangePicker
                fromTime={selectedStartTime}
                toTime={selectedEndTime}
                onFromTimeChange={handleFromTimeChange}
                onToTimeChange={handleToTimeChange}
                startHour={8}
                endHour={22}
                intervalMinutes={60}
              />
              {errors.startTime && (
                <p className="text-sm text-destructive mt-2">{errors.startTime.message}</p>
              )}
              {errors.endTime && (
                <p className="text-sm text-destructive mt-2">{errors.endTime.message}</p>
              )}
            </motion.div>
          )}

          {submitError && (
            <p className="text-sm text-destructive">{submitError}</p>
          )}
          {dateRange.from && dateRange.to && selectedStartTime && selectedEndTime && priceBreakdown && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="p-4 bg-blue-50 rounded-lg border border-blue-200"
            >
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-sm text-muted-foreground">Booking Summary</p>
                    <p className="font-medium">
                      {format(dateRange.from, "MMM dd")} - {format(dateRange.to, "MMM dd, yyyy")}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {selectedStartTime} - {selectedEndTime} • {priceBreakdown.days} day(s) • {priceBreakdown.hoursPerDay} hour(s)/day
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">Total</p>
                    <p className="text-2xl font-bold text-primary">${priceBreakdown.total}</p>
                  </div>
                </div>
                <div className="pt-3 border-t border-blue-200 space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Court ({priceBreakdown.days} days × ${priceBreakdown.courtPrice})</span>
                    <span className="font-medium">${priceBreakdown.courtPrice * priceBreakdown.days}</span>
                  </div>
                  {priceBreakdown.coachPrice && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Coach ({priceBreakdown.days} days × ${priceBreakdown.coachPrice})</span>
                      <span className="font-medium">${priceBreakdown.coachPrice * priceBreakdown.days}</span>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => {
              reset();
              setDateRange({ from: undefined, to: undefined });
              setSelectedStartTime(undefined);
              setSelectedEndTime(undefined);
              onOpenChange(false);
            }}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={!dateRange.from || !dateRange.to || !selectedStartTime || !selectedEndTime || createBooking.isPending}
            >
              {createBooking.isPending ? "Booking..." : "Confirm Booking"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
