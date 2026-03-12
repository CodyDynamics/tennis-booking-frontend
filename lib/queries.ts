"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type {
  Court,
  Coach,
  CourtBooking,
  CoachSession,
  ProgressReport,
} from "@/types";
import {
  mockCourts,
  mockCoaches,
  mockBookings,
  mockSessions,
  mockReports,
} from "./mock-data";

// Courts queries
export function useCourts() {
  return useQuery<Court[]>({
    queryKey: ["courts"],
    queryFn: async () => {
      await new Promise((resolve) => setTimeout(resolve, 500));
      return mockCourts;
    },
  });
}

// Coaches queries
export function useCoaches() {
  return useQuery<Coach[]>({
    queryKey: ["coaches"],
    queryFn: async () => {
      await new Promise((resolve) => setTimeout(resolve, 500));
      return mockCoaches;
    },
  });
}

// Bookings queries
export function useBookings(userId?: string) {
  return useQuery<CourtBooking[]>({
    queryKey: ["bookings", userId],
    queryFn: async () => {
      await new Promise((resolve) => setTimeout(resolve, 500));
      if (userId) {
        return mockBookings.filter((b) => b.userId === userId);
      }
      return mockBookings;
    },
    enabled: !!userId,
  });
}

// Sessions queries
export function useSessions(coachId?: string, studentId?: string) {
  return useQuery<CoachSession[]>({
    queryKey: ["sessions", coachId, studentId],
    queryFn: async () => {
      await new Promise((resolve) => setTimeout(resolve, 500));
      let sessions = mockSessions;
      if (coachId) {
        sessions = sessions.filter((s) => s.coachId === coachId);
      }
      if (studentId) {
        sessions = sessions.filter((s) => s.studentIds.includes(studentId));
      }
      return sessions;
    },
    enabled: !!coachId || !!studentId, // Only query when at least one of the two is provided
  });
}

// Reports queries
export function useReports(studentId?: string, coachId?: string) {
  return useQuery<ProgressReport[]>({
    queryKey: ["reports", studentId, coachId],
    queryFn: async () => {
      await new Promise((resolve) => setTimeout(resolve, 500));
      let reports = mockReports;
      if (studentId) {
        reports = reports.filter((r) => r.studentId === studentId);
      }
      if (coachId) {
        reports = reports.filter((r) => r.coachId === coachId);
      }
      return reports;
    },
  });
}

// Create court booking mutation
export function useCreateCourtBooking() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      userId: string;
      courtId: string;
      coachId?: string | null;
      bookingType: "COURT_ONLY" | "COURT_COACH" | "TRAINING";
      bookingDate: string;
      startTime: string;
      endTime: string;
      durationMinutes: number;
      totalPrice: number;
    }) => {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      const newBooking: CourtBooking = {
        id: Date.now().toString(),
        organizationId: "org1",
        branchId: "branch1",
        userId: data.userId,
        courtId: data.courtId,
        coachId: data.coachId || null,
        bookingType: data.bookingType,
        bookingDate: data.bookingDate,
        startTime: data.startTime,
        endTime: data.endTime,
        durationMinutes: data.durationMinutes,
        totalPrice: data.totalPrice,
        paymentStatus: "unpaid",
        bookingStatus: "confirmed",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      return newBooking;
    },
    onSuccess: (newBooking) => {
      queryClient.invalidateQueries({ queryKey: ["bookings"] });
      queryClient.setQueryData<CourtBooking[]>(["bookings", newBooking.userId], (old) => {
        return old ? [...old, newBooking] : [newBooking];
      });
    },
  });
}

// Create coach session mutation
export function useCreateCoachSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      coachId: string;
      sessionDate: string;
      startTime: string;
      durationMinutes: number;
      sessionType: "private" | "group";
      studentIds: string[];
    }) => {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      const newSession: CoachSession = {
        id: Date.now().toString(),
        organizationId: "org1",
        branchId: "branch1",
        coachId: data.coachId,
        courtId: null,
        sessionDate: data.sessionDate,
        startTime: data.startTime,
        durationMinutes: data.durationMinutes,
        sessionType: data.sessionType,
        status: "scheduled",
        studentIds: data.studentIds,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      return newSession;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sessions"] });
    },
  });
}

// Create report mutation
export function useCreateReport() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      coachId: string;
      studentId: string;
      sessionId?: string;
      sessionDate: string;
      forehandScore: number;
      backhandScore: number;
      serveScore: number;
      footworkScore: number;
      staminaScore: number;
      attendance: "present" | "absent";
      overallComment?: string;
      improvementPlan?: string;
      nextGoal?: string;
    }) => {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      const newReport: ProgressReport = {
        id: Date.now().toString(),
        organizationId: "org1",
        branchId: "branch1",
        coachId: data.coachId,
        studentId: data.studentId,
        sessionId: data.sessionId || null,
        sessionDate: data.sessionDate,
        forehandScore: data.forehandScore,
        backhandScore: data.backhandScore,
        serveScore: data.serveScore,
        footworkScore: data.footworkScore,
        staminaScore: data.staminaScore,
        attendance: data.attendance,
        overallComment: data.overallComment,
        improvementPlan: data.improvementPlan,
        nextGoal: data.nextGoal,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      return newReport;
    },
    onSuccess: (newReport) => {
      queryClient.invalidateQueries({ queryKey: ["reports"] });
      queryClient.setQueryData<ProgressReport[]>(
        ["reports", newReport.studentId],
        (old) => {
          return old ? [...old, newReport] : [newReport];
        }
      );
    },
  });
}
