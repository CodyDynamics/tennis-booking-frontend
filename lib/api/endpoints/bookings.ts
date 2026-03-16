import type {
  CreateCourtBookingInput,
  CreateCoachSessionInput,
  CreateBookingResult,
  CourtAvailabilitySlot,
  MyBookingsResponse,
} from "@/types/api";
import type { ApiClient } from "../client";

export function createBookingsEndpoints(client: ApiClient) {
  return {
    createCourtBooking: (body: CreateCourtBookingInput) =>
      client.post<CreateBookingResult>("/bookings/court", body),

    createCoachSession: (body: CreateCoachSessionInput) =>
      client.post<CreateBookingResult>("/bookings/coach", body),

    getCourtAvailability: (
      courtId: string,
      date: string,
      slotMinutes?: number,
    ) => {
      const params: Record<string, string> = { courtId, date };
      if (slotMinutes != null) params.slotMinutes = String(slotMinutes);
      return client.get<CourtAvailabilitySlot[]>("/bookings/court/availability", {
        params,
      });
    },

    getMyBookings: (from?: string, to?: string) => {
      const params: Record<string, string> = {};
      if (from) params.from = from;
      if (to) params.to = to;
      return client.get<MyBookingsResponse>("/bookings/my", { params });
    },

    getBooking: (kind: "court" | "coach", id: string) =>
      client.get<{ kind: "court" | "coach"; data: unknown }>(
        `/bookings/${kind}/${id}`,
      ),

    cancelBooking: (kind: "court" | "coach", id: string) =>
      client.delete<{ message?: string }>(`/bookings/${kind}/${id}`),
  };
}

export type BookingsEndpoints = ReturnType<typeof createBookingsEndpoints>;
