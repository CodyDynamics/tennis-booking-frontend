import { useState } from "react";
import type { CourtBooking, CoachSession } from "@/types";

export function useBooking() {
  const [bookings, setBookings] = useState<CourtBooking[]>([]);
  const [sessions, setSessions] = useState<CoachSession[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createCourtBooking = async (bookingData: Partial<CourtBooking>) => {
    setLoading(true);
    setError(null);
    try {
      // TODO: API call
      const newBooking: CourtBooking = {
        id: Date.now().toString(),
        userId: bookingData.userId || "",
        courtId: bookingData.courtId || "",
        coachId: bookingData.coachId ?? null,
        bookingType: bookingData.bookingType || "COURT_ONLY",
        bookingDate: bookingData.bookingDate || "",
        startTime: bookingData.startTime || "",
        endTime: bookingData.endTime || "",
        durationMinutes: bookingData.durationMinutes || 60,
        totalPrice: bookingData.totalPrice || 0,
        paymentStatus: bookingData.paymentStatus || "unpaid",
        bookingStatus: bookingData.bookingStatus || "pending",
        createdAt: new Date().toISOString(),
      };
      setBookings([...bookings, newBooking]);
      return newBooking;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create booking");
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const createCoachSession = async (sessionData: Partial<CoachSession>) => {
    setLoading(true);
    setError(null);
    try {
      // TODO: API call
      const newSession: CoachSession = {
        id: Date.now().toString(),
        coachId: sessionData.coachId || "",
        courtId: sessionData.courtId ?? null,
        sessionDate: sessionData.sessionDate || "",
        startTime: sessionData.startTime || "",
        durationMinutes: sessionData.durationMinutes || 60,
        sessionType: sessionData.sessionType || "private",
        status: "scheduled",
        studentIds: sessionData.studentIds || [],
      };
      setSessions([...sessions, newSession]);
      return newSession;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create session");
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return {
    bookings,
    sessions,
    loading,
    error,
    createCourtBooking,
    createCoachSession,
  };
}
