import { useMemo } from "react";
import type { Court, Coach } from "@/types";
import type { BookingPriceBreakdown } from "../types/booking.types";
import { differenceInDays } from "date-fns";

export function useBookingCalculations(
  court: Court | null,
  coach: Coach | null,
  dateRange: { from: Date | undefined; to: Date | undefined },
  startTime: string | undefined,
  endTime: string | undefined,
  bookingType: "COURT_ONLY" | "COURT_COACH" | "TRAINING"
): BookingPriceBreakdown | null {
  return useMemo(() => {
    if (!court || !dateRange.from || !dateRange.to || !startTime || !endTime) {
      return null;
    }

    const startHour = parseInt(startTime.split(":")[0]);
    const endHour = parseInt(endTime.split(":")[0]);
    const hoursPerDay = endHour - startHour;
    const days = differenceInDays(dateRange.to, dateRange.from) + 1;

    const courtPrice = court.pricePerHour * hoursPerDay;
    const coachPrice = bookingType !== "COURT_ONLY" && coach
      ? coach.hourlyRate * hoursPerDay
      : 0;

    const total = (courtPrice + coachPrice) * days;

    return {
      courtPrice,
      coachPrice: coachPrice > 0 ? coachPrice : undefined,
      days,
      hoursPerDay,
      total,
    };
  }, [court, coach, dateRange, startTime, endTime, bookingType]);
}
