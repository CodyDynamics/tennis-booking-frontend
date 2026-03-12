import type { BookingType } from "@/types";

export interface BookingFormData {
  bookingType: BookingType;
  courtId: string;
  coachId?: string;
  dateRange: {
    from: Date;
    to: Date;
  };
  startTime: string;
  endTime: string;
  durationMinutes: number;
}

export interface BookingPriceBreakdown {
  courtPrice: number;
  coachPrice?: number;
  days: number;
  hoursPerDay: number;
  total: number;
}
