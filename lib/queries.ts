"use client";

import { useMemo } from "react";
import { useQuery, useMutation, useQueryClient, useQueries } from "@tanstack/react-query";
import type {
  Court,
  Coach,
  CourtBooking,
  CoachSession,
  ProgressReport,
} from "@/types";
import type { CourtBookingApi, CoachSessionApi } from "@/types/api";
import { api } from "@/lib/api";
import type { CourtApi } from "@/lib/api/endpoints/courts";
import type { CoachApi } from "@/lib/api/endpoints/coaches";
import type { UserApi, VenueMembershipAssignmentRow } from "@/lib/api/endpoints/users";
import type { PermissionSchemaItem } from "@/lib/api/endpoints/roles";
import type { AreaApi } from "@/lib/api/endpoints/areas";
import type { AdminCourtBookingRowApi } from "@/lib/api/endpoints/bookings";

/** Mapped from GET /bookings/my when `court` is joined (`courtName` from `court.name`). */
type CourtBookingRow = CourtBooking & { courtName?: string | null };

function mapCoachApiToCoach(c: CoachApi): Coach {
  return {
    id: c.id,
    userId: c.userId,
    experienceYears: c.experienceYears,
    bio: c.bio ?? undefined,
    hourlyRate: typeof c.hourlyRate === "string" ? parseFloat(c.hourlyRate) : c.hourlyRate,
    user: c.user
      ? {
          id: c.user.id,
          fullName: c.user.fullName ?? "",
          email: c.user.email ?? "",
          avatarUrl: c.user.avatarUrl ?? undefined,
          role: "coach",
        }
      : undefined,
  };
}

function mapCourtApiToCourt(c: CourtApi): Court {
  let imageGallery: string[] | undefined;
  if (c.imageGallery) {
    try {
      imageGallery = typeof c.imageGallery === "string" ? JSON.parse(c.imageGallery) : c.imageGallery;
      if (!Array.isArray(imageGallery)) imageGallery = undefined;
    } catch {
      imageGallery = undefined;
    }
  }
  const sportsArr =
    Array.isArray(c.sports) && c.sports.length > 0
      ? [...c.sports]
      : c.sport
        ? [c.sport]
        : [];
  const primarySport = sportsArr[0] ?? (c.sport || "tennis");
  const envRaw =
    Array.isArray(c.courtTypes) && c.courtTypes.length > 0
      ? c.courtTypes.filter((t) => t === "indoor" || t === "outdoor")
      : c.type === "indoor" || c.type === "outdoor"
        ? [c.type]
        : ["outdoor"];
  const courtTypes = (envRaw.length ? envRaw : ["outdoor"]) as Court["courtTypes"];
  const primaryType: Court["type"] = courtTypes[0] === "indoor" ? "indoor" : "outdoor";
  const base: Court = {
    id: c.id,
    name: c.name,
    courtTypes,
    type: primaryType,
    sports: sportsArr.length ? sportsArr : [primarySport],
    sport: primarySport,
    areaId: c.areaId ?? null,
    pricePerHour: typeof c.pricePerHour === "string" ? parseFloat(c.pricePerHour) : c.pricePerHour,
    description: c.description ?? undefined,
    status: c.status === "active" ? "active" : "maintenance",
    locationId: c.locationId ?? undefined,
    locationName: c.location?.name ?? undefined,
    imageUrl: c.imageUrl ?? undefined,
    imageGallery,
    mapEmbedUrl: c.mapEmbedUrl ?? undefined,
  };
  if (c.coaches?.length) {
    base.coaches = c.coaches.map(mapCoachApiToCoach);
  }
  return base;
}

function mapCourtBookingApiToCourtBooking(b: CourtBookingApi): CourtBookingRow {
  const dateStr = typeof b.bookingDate === "string" ? b.bookingDate : (b.bookingDate as unknown as Date)?.toString?.()?.slice(0, 10) ?? "";
  const totalPrice =
    typeof b.totalPrice === "string"
      ? parseFloat(b.totalPrice)
      : typeof b.totalPrice === "number"
        ? b.totalPrice
        : 0;
  const locationId = b.locationId ?? b.court?.locationId ?? null;
  const sport = b.sport ?? b.court?.sport ?? null;
  const courtTypeRaw = b.courtType ?? b.court?.type ?? null;
  const courtType =
    courtTypeRaw === "indoor" || courtTypeRaw === "outdoor" ? courtTypeRaw : null;
  return {
    id: b.id,
    userId: b.userId,
    courtId: b.courtId,
    coachId: b.coachId ?? null,
    bookingType: (b.bookingType as CourtBooking["bookingType"]) ?? "COURT_ONLY",
    bookingDate: dateStr,
    startTime: b.startTime,
    endTime: b.endTime,
    durationMinutes: b.durationMinutes,
    totalPrice,
    paymentStatus: (b.paymentStatus as CourtBooking["paymentStatus"]) ?? "unpaid",
    bookingStatus: (b.bookingStatus as CourtBooking["bookingStatus"]) ?? "pending",
    createdAt: b.createdAt ?? new Date().toISOString(),
    updatedAt: b.updatedAt,
    locationId,
    sport,
    courtType,
    courtName: b.court?.name ?? null,
  };
}

function mapCoachSessionApiToCoachSession(s: CoachSessionApi): CoachSession {
  const dateStr = typeof s.sessionDate === "string" ? s.sessionDate : (s.sessionDate as unknown as Date)?.toString?.()?.slice(0, 10) ?? "";
  return {
    id: s.id,
    coachId: s.coachId,
    courtId: s.courtId ?? null,
    sessionDate: dateStr,
    startTime: s.startTime,
    durationMinutes: s.durationMinutes,
    sessionType: (s.sessionType as "private" | "group") ?? "private",
    status: (s.status as CoachSession["status"]) ?? "scheduled",
    studentIds: s.bookedById ? [s.bookedById] : [],
    createdAt: s.createdAt,
    updatedAt: s.updatedAt,
  };
}

// Courts queries
export function useCourts(params?: {
  locationId?: string;
  status?: string;
  search?: string;
  sport?: string;
  /** When false, the query does not run (e.g. gate behind auth). */
  enabled?: boolean;
}) {
  const { enabled, ...apiParams } = params ?? {};
  return useQuery<Court[]>({
    queryKey: ["courts", apiParams.locationId, apiParams.status, apiParams.search, apiParams.sport],
    queryFn: async () => {
      const res = await api.courts.getCourts({
        ...apiParams,
        page: "0",
        pageSize: "1000",
      });
      return res.data.map(mapCourtApiToCourt);
    },
    enabled: enabled !== false,
  });
}

export function useCourt(id: string | null | undefined, options?: { enabled?: boolean }) {
  return useQuery<Court>({
    queryKey: ["court", id],
    queryFn: async () => {
      const c = await api.courts.getCourt(id!);
      return mapCourtApiToCourt(c);
    },
    enabled: !!id && options?.enabled !== false,
  });
}

// Coaches queries
export function useCoaches() {
  return useQuery<Coach[]>({
    queryKey: ["coaches"],
    queryFn: async () => {
      const res = await api.coaches.getCoaches({
        page: "0",
        pageSize: "200",
      });
      return res.data.map(mapCoachApiToCoach);
    },
  });
}

// Bookings queries (court bookings for current user)
export function useBookings(userId?: string) {
  return useQuery<CourtBookingRow[]>({
    queryKey: ["bookings", userId],
    queryFn: async () => {
      const res = await api.bookings.getMyBookings();
      return (res.courtBookings ?? []).map(mapCourtBookingApiToCourtBooking);
    },
    enabled: !!userId,
  });
}

// ----- Admin: Bookings -----
export function useAdminCourtBookings(params?: {
  locationId?: string;
  search?: string;
  from?: string;
  to?: string;
  status?: string;
  paymentStatus?: string;
  enabled?: boolean;
}) {
  const { enabled = true, ...rest } = params ?? {};
  return useQuery<AdminCourtBookingRowApi[]>({
    queryKey: ["admin", "bookings", "court", rest.locationId, rest.search, rest.from, rest.to, rest.status, rest.paymentStatus],
    queryFn: () => api.bookings.adminListCourtBookings(rest),
    enabled,
  });
}

export function useAdminUpdateCourtBooking() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: { bookingStatus?: string; paymentStatus?: string } }) =>
      api.bookings.adminUpdateCourtBooking(id, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "bookings"] });
      queryClient.invalidateQueries({ queryKey: ["bookings"] });
    },
  });
}

/** My court bookings with a date window (for location booking sidebar). Invalidates with other `bookings` queries. */
export function useMyCourtBookings(userId?: string) {
  const range = useMemo(() => {
    const from = new Date();
    from.setDate(from.getDate() - 14);
    const to = new Date();
    to.setDate(to.getDate() + 366);
    return { from: from.toISOString().slice(0, 10), to: to.toISOString().slice(0, 10) };
  }, []);

  return useQuery<CourtBookingRow[]>({
    queryKey: ["bookings", "my", userId, range.from, range.to],
    queryFn: async () => {
      const res = await api.bookings.getMyBookings(range.from, range.to);
      return (res.courtBookings ?? []).map(mapCourtBookingApiToCourtBooking);
    },
    enabled: !!userId,
  });
}

export function useAdminDashboardMetrics(enabled: boolean) {
  return useQuery({
    queryKey: ["admin", "dashboard", "metrics"],
    queryFn: () => api.admin.getDashboardMetrics(),
    enabled,
    staleTime: 60_000,
  });
}

export function useAdminSportBookingBreakdown(sportKey: string | null, enabled: boolean) {
  return useQuery({
    queryKey: ["admin", "dashboard", "sport-breakdown", sportKey],
    queryFn: () => api.admin.getSportBookingBreakdown(sportKey!),
    enabled: enabled && !!sportKey,
    staleTime: 60_000,
  });
}

// Sessions queries (coach sessions for current user)
export function useSessions(coachId?: string, studentId?: string) {
  return useQuery<CoachSession[]>({
    queryKey: ["sessions", coachId, studentId],
    queryFn: async () => {
      const res = await api.bookings.getMyBookings();
      let sessions = (res.coachSessions ?? []).map(mapCoachSessionApiToCoachSession);
      if (coachId) {
        sessions = sessions.filter((s) => s.coachId === coachId);
      }
      if (studentId) {
        sessions = sessions.filter((s) => s.studentIds?.includes(studentId));
      }
      return sessions;
    },
    enabled: !!coachId || !!studentId,
  });
}

// Reports queries (no API yet – returns empty list)
export function useReports(_studentId?: string, _coachId?: string) {
  return useQuery<ProgressReport[]>({
    queryKey: ["reports", _studentId, _coachId],
    queryFn: async () => [],
  });
}

/**
 * Fetch server-side court availability for multiple dates (same slot length).
 * Used so the Book Court modal matches POST /bookings/court validation.
 */
export function useCourtAvailabilityForDates(
  courtId: string | null | undefined,
  dates: string[],
  slotMinutes: number,
  enabled: boolean,
) {
  const results = useQueries({
    queries: dates.map((date) => ({
      queryKey: ["courtAvailability", courtId, date, slotMinutes] as const,
      queryFn: () => api.bookings.getCourtAvailability(courtId!, date, slotMinutes),
      enabled: Boolean(enabled && courtId && dates.length > 0),
      staleTime: 15_000,
    })),
  });

  const isLoading = results.some((r) => r.isPending);
  const isError = results.some((r) => r.isError);
  const error = results.find((r) => r.isError)?.error;
  const data = results.map((r) => r.data ?? []);

  return { isLoading, isError, error, data, results };
}

/** Booking wizard: windows from location_booking_windows */
export function useCourtWizardWindows(
  locationId: string | undefined,
  sport: "tennis" | "pickleball" | null,
  courtType: "indoor" | "outdoor" | null,
  enabled: boolean,
) {
  return useQuery({
    queryKey: ["courtWizardWindows", locationId, sport, courtType] as const,
    queryFn: () =>
      api.bookings.getCourtWizardWindows({
        locationId: locationId!,
        sport: sport!,
        courtType: courtType!,
      }),
    enabled: Boolean(enabled && locationId && sport && courtType),
    staleTime: 60_000,
  });
}

/** Booking wizard: slots + courts with free capacity */
export function useCourtWizardAvailability(
  params: {
    locationId: string;
    sport: "tennis" | "pickleball";
    courtType: "indoor" | "outdoor";
    bookingDate: string;
    windowId: string;
    durationMinutes: number;
  } | null,
  enabled: boolean,
) {
  return useQuery({
    queryKey: [
      "courtWizardAvailability",
      params?.locationId,
      params?.sport,
      params?.courtType,
      params?.bookingDate,
      params?.windowId,
      params?.durationMinutes,
    ] as const,
    queryFn: () => api.bookings.getCourtWizardAvailability(params!),
    enabled: Boolean(enabled && params),
    staleTime: 15_000,
  });
}

/** New flow: available slots for date+duration (no court names, no windowId needed). */
export function useCourtSlots(
  params: {
    locationId: string;
    areaId?: string;
    sport: string;
    courtType: "indoor" | "outdoor";
    bookingDate: string;
    durationMinutes: number;
    excludeBookingId?: string;
  } | null,
  enabled: boolean,
) {
  return useQuery({
    queryKey: [
      "courtSlots",
      params?.locationId,
      params?.sport,
      params?.courtType,
      params?.areaId,
      params?.bookingDate,
      params?.durationMinutes,
      params?.excludeBookingId,
    ] as const,
    queryFn: () => api.bookings.getCourtSlots(params!),
    enabled: Boolean(enabled && params),
    staleTime: 15_000,
  });
}

/** New flow: book a slot, system assigns random court. */
export function useCreateSlotBooking() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      locationId: string;
      areaId?: string;
      sport: string;
      courtType: string;
      bookingDate: string;
      startTime: string;
      endTime: string;
      durationMinutes: number;
      coachId?: string | null;
    }) => {
      const payload = {
        locationId: data.locationId,
        ...(data.areaId ? { areaId: data.areaId } : {}),
        sport: data.sport,
        courtType: data.courtType,
        bookingDate: data.bookingDate,
        startTime: data.startTime,
        endTime: data.endTime,
        durationMinutes: data.durationMinutes,
        ...(data.coachId ? { coachId: data.coachId } : {}),
      };
      return api.bookings.createSlotBooking(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bookings"] });
      queryClient.invalidateQueries({ queryKey: ["courtSlots"] });
      queryClient.invalidateQueries({ queryKey: ["courtAvailability"] });
      queryClient.invalidateQueries({ queryKey: ["courtWizardAvailability"] });
    },
  });
}

/** Reschedule: PATCH same booking row with a new slot. */
export function useUpdateSlotBooking() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      bookingId: string;
      locationId: string;
      areaId?: string;
      sport: string;
      courtType: string;
      bookingDate: string;
      startTime: string;
      endTime: string;
      durationMinutes: number;
    }) => {
      const { bookingId, ...body } = data;
      return api.bookings.updateSlotBooking(bookingId, body);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bookings"] });
      queryClient.invalidateQueries({ queryKey: ["courtSlots"] });
      queryClient.invalidateQueries({ queryKey: ["courtAvailability"] });
      queryClient.invalidateQueries({ queryKey: ["courtWizardAvailability"] });
    },
  });
}

// Create court booking mutation
export function useCreateCourtBooking() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      userId?: string;
      courtId: string;
      coachId?: string | null;
      bookingType?: "COURT_ONLY" | "COURT_COACH" | "TRAINING";
      bookingDate: string;
      startTime: string;
      endTime: string;
      durationMinutes?: number;
      totalPrice?: number;
      locationBookingWindowId?: string;
    }) => {
      const payload = {
        courtId: data.courtId,
        bookingDate: data.bookingDate,
        startTime: data.startTime,
        endTime: data.endTime,
        ...(data.coachId && { coachId: data.coachId }),
        ...(data.durationMinutes != null && { durationMinutes: data.durationMinutes }),
        ...(data.locationBookingWindowId && {
          locationBookingWindowId: data.locationBookingWindowId,
        }),
      };
      return api.bookings.createCourtBooking(payload);
    },
    onSuccess: (_result, variables) => {
      queryClient.invalidateQueries({ queryKey: ["bookings"] });
      queryClient.invalidateQueries({ queryKey: ["courtAvailability"] });
      queryClient.invalidateQueries({ queryKey: ["courtWizardAvailability"] });
      if (variables.userId) {
        queryClient.invalidateQueries({ queryKey: ["bookings", variables.userId] });
      }
    },
  });
}

// Cancel booking mutation
export function useCancelBooking() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ kind, id }: { kind: "court" | "coach"; id: string }) =>
      api.bookings.cancelBooking(kind, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bookings"] });
      queryClient.invalidateQueries({ queryKey: ["sessions"] });
      queryClient.invalidateQueries({ queryKey: ["courtSlots"] });
      queryClient.invalidateQueries({ queryKey: ["courtWizardAvailability"] });
      queryClient.invalidateQueries({ queryKey: ["courtAvailability"] });
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
      studentIds?: string[];
      courtId?: string | null;
    }) => {
      const payload = {
        coachId: data.coachId,
        sessionDate: data.sessionDate,
        startTime: data.startTime,
        durationMinutes: data.durationMinutes,
        sessionType: data.sessionType,
        ...(data.courtId && { courtId: data.courtId }),
      };
      return api.bookings.createCoachSession(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sessions"] });
      queryClient.invalidateQueries({ queryKey: ["bookings"] });
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

// ----- Sports (dynamic list for admin selector) -----
export function useSports() {
  return useQuery({
    queryKey: ["sports"],
    queryFn: () => api.sports.getSports(),
  });
}

export function useCreateSport() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: Parameters<typeof api.sports.createSport>[0]) =>
      api.sports.createSport(body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["sports"] }),
  });
}

export function useUpdateSport() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      body,
    }: {
      id: string;
      body: Parameters<typeof api.sports.updateSport>[1];
    }) => api.sports.updateSport(id, body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["sports"] }),
  });
}

export function useDeleteSport() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.sports.deleteSport(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["sports"] }),
  });
}

// ----- Admin: Locations -----
export function useLocations() {
  return useQuery({
    queryKey: ["locations"],
    queryFn: async () => {
      const res = await api.locations.getLocations({
        page: "0",
        pageSize: "500",
      });
      return res.data;
    },
  });
}

export function useAreas(
  locationId?: string | string[],
  options?: { enabled?: boolean },
) {
  const ids =
    locationId === undefined
      ? []
      : Array.isArray(locationId)
        ? locationId
        : [locationId];
  const key = ids.length ? [...ids].sort().join(",") : "all";
  const enabled = options?.enabled !== false;
  return useQuery<AreaApi[]>({
    queryKey: ["areas", key],
    queryFn: async () => {
      if (ids.length === 0) {
        return api.areas.getAreas(undefined);
      }
      if (ids.length === 1) {
        return api.areas.getAreas({ locationId: ids[0] });
      }
      const parts = await Promise.all(
        ids.map((id) => api.areas.getAreas({ locationId: id })),
      );
      return parts.flat();
    },
    enabled,
  });
}

export function useCreateArea() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: Parameters<typeof api.areas.createArea>[0]) =>
      api.areas.createArea(body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["areas"] }),
  });
}

export function useUpdateArea() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      body,
    }: {
      id: string;
      body: Parameters<typeof api.areas.updateArea>[1];
    }) => api.areas.updateArea(id, body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["areas"] }),
  });
}

export function useDeleteArea() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.areas.deleteArea(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["areas"] }),
  });
}

export function useCreateLocation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: Parameters<typeof api.locations.createLocation>[0]) =>
      api.locations.createLocation(body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["locations"] }),
  });
}

export function useUpdateLocation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      body,
    }: {
      id: string;
      body: Parameters<typeof api.locations.updateLocation>[1];
    }) => api.locations.updateLocation(id, body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["locations"] }),
  });
}

export function useDeleteLocation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.locations.deleteLocation(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["locations"] }),
  });
}

/** Home / map for guests: public locations only. */
export function usePublicLocations() {
  return useQuery({
    queryKey: ["locations", "public"],
    queryFn: async () => {
      const res = await api.locations.getPublicLocations({
        page: "0",
        pageSize: "500",
      });
      return res.data;
    },
  });
}

/** Logged-in user: public + private clubs where they have active membership. */
export function useBookableLocations(enabled: boolean) {
  return useQuery({
    queryKey: ["locations", "bookable"],
    queryFn: () => api.locations.getBookableLocations(),
    enabled,
  });
}

export function useBookableAreas(enabled: boolean) {
  return useQuery({
    queryKey: ["areas", "bookable"],
    queryFn: () => api.areas.getBookableAreas(),
    enabled,
  });
}

// ----- Single location (for location courts page) -----
export function useLocation(id: string | null | undefined, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ["location", id],
    queryFn: () => api.locations.getLocation(id!),
    enabled: !!id && options?.enabled !== false,
  });
}

export function useLocationMembership(
  locationId: string | null | undefined,
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: ["locationMembership", locationId],
    queryFn: () => api.locations.getLocationMembership(locationId!),
    enabled: !!locationId && options?.enabled !== false,
    staleTime: 60_000,
  });
}

// ----- Admin: Branches -----
export function useBranches(organizationId?: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ["branches", organizationId],
    queryFn: () => api.branches.getBranches(organizationId ? { organizationId } : undefined),
    enabled: options?.enabled !== false,
  });
}

// ----- Admin: Organizations -----
export function useOrganizations() {
  return useQuery({
    queryKey: ["organizations"],
    queryFn: () => api.organizations.getOrganizations(),
  });
}

/** super_admin Locations page — all memberships at locations */
export function useVenueMembershipAssignments(enabled: boolean) {
  return useQuery<VenueMembershipAssignmentRow[]>({
    queryKey: ["users", "venue-memberships"],
    queryFn: () => api.users.getVenueMembershipAssignments(),
    enabled,
  });
}

// ----- Admin: Users (list with filters) -----
export function useUsers(params?: {
  roleId?: string;
  search?: string;
  onlyMembership?: boolean;
  noMembershipAtLocationId?: string;
  forAreaAssignment?: boolean;
  noMembershipAnywhere?: boolean;
  membershipAtLocationId?: string;
  areaId?: string;
  accountType?: string;
  excludeAccountType?: string;
  includeMemberships?: boolean;
  enabled?: boolean;
}) {
  const { enabled = true, ...rest } = params ?? {};
  return useQuery<UserApi[]>({
    queryKey: [
      "users",
      rest.roleId,
      rest.search,
      rest.onlyMembership,
      rest.noMembershipAtLocationId,
      rest.forAreaAssignment,
      rest.noMembershipAnywhere,
      rest.membershipAtLocationId,
      rest.areaId,
      rest.accountType,
      rest.excludeAccountType,
      rest.includeMemberships,
    ],
    queryFn: () => api.users.getUsers(rest),
    enabled,
  });
}

/** Admin edit modal: user + location memberships (for area dropdown). */
export function useAdminUserDetail(userId: string | undefined, enabled: boolean) {
  return useQuery<UserApi>({
    queryKey: ["users", userId, "detail"],
    queryFn: () => api.users.getUser(userId!, { includeMemberships: true }),
    enabled: Boolean(enabled && userId),
  });
}

// ----- Admin: Court mutations -----
export function useCreateCourt() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: Parameters<typeof api.courts.createCourt>[0]) =>
      api.courts.createCourt(body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["courts"] });
      queryClient.invalidateQueries({ queryKey: ["court-booking-windows"] });
    },
  });
}

export function useUpdateCourt() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: Parameters<typeof api.courts.updateCourt>[1] }) =>
      api.courts.updateCourt(id, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["courts"] });
      queryClient.invalidateQueries({ queryKey: ["court-booking-windows"] });
    },
  });
}

export function useDeleteCourt() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.courts.deleteCourt(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["courts"] });
      queryClient.invalidateQueries({ queryKey: ["court-booking-windows"] });
    },
  });
}

export function useCourtBookingWindows(params?: {
  search?: string;
  enabled?: boolean;
}) {
  const { enabled = true, ...rest } = params ?? {};
  return useQuery({
    queryKey: ["court-booking-windows", rest.search],
    queryFn: () => api.courts.getCourtBookingWindows(rest),
    enabled,
  });
}

export function useDeleteCourtBookingWindow() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (windowId: string) => api.courts.deleteCourtBookingWindow(windowId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["court-booking-windows"] });
      queryClient.invalidateQueries({ queryKey: ["courts"] });
    },
  });
}

// ----- Admin: User mutations -----
export function useCreateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: Parameters<typeof api.users.createUser>[0]) => api.users.createUser(body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["users"] }),
  });
}

export function useCreateMembershipPlaceholder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: Parameters<typeof api.users.createMembershipPlaceholder>[0]) =>
      api.users.createMembershipPlaceholder(body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      queryClient.invalidateQueries({ queryKey: ["users", "venue-memberships"] });
    },
  });
}

export function useUpdateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      body,
    }: {
      id: string;
      body: Parameters<typeof api.users.updateUser>[1];
    }) => api.users.updateUser(id, body),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      queryClient.invalidateQueries({
        queryKey: ["users", "venue-memberships"],
      });
      queryClient.invalidateQueries({
        queryKey: ["users", variables.id, "detail"],
      });
    },
  });
}

export function useDeleteUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.users.deleteUser(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["users"] }),
  });
}

// ----- Admin: Roles list (for filters and permissions page) -----
export function useRolesList() {
  return useQuery({
    queryKey: ["roles-list"],
    queryFn: () => api.roles.getRoles(),
  });
}

// ----- Admin: Permissions schema & role permissions -----
export function usePermissionsSchema() {
  return useQuery<PermissionSchemaItem[]>({
    queryKey: ["permissions-schema"],
    queryFn: () => api.roles.getPermissionsSchema(),
  });
}

export function useUpdateRolePermissions() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ roleId, permissions }: { roleId: string; permissions: string[] }) =>
      api.roles.updateRolePermissions(roleId, permissions),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["roles"] });
      queryClient.invalidateQueries({ queryKey: ["permissions-schema"] });
    },
  });
}
