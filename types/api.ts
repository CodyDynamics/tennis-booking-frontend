/**
 * API request/response types.
 * Keep this file free of imports from lib/api or lib/auth-store to avoid circular deps.
 */

/** Membership row on GET /users/profile (includeMemberships) */
export interface AuthUserMembership {
  id: string;
  locationId: string;
  status: string;
}

/** User payload returned by auth API (matches backend AuthResponse.user) */
export interface AuthUser {
  id: string;
  email: string;
  fullName: string;
  firstName?: string | null;
  lastName?: string | null;
  phone?: string | null;
  role?: string;
  mustChangePasswordOnFirstLogin?: boolean;
  memberships?: AuthUserMembership[];
}

/** PATCH /users/profile */
export interface UpdateOwnProfileBody {
  email?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
}

/** Response from POST /auth/login, /auth/register/verify-otp, /auth/refresh */
export interface AuthResponse {
  accessToken: string;
  refreshToken?: string;
  user: AuthUser;
}

/** Body for POST /auth/login */
export interface LoginInput {
  email: string;
  password: string;
  /** When true, refresh token cookie is set for 30 days (otherwise 7 days). */
  rememberMe?: boolean;
}

/** Body for POST /auth/register/request-otp */
export interface RegisterInput {
  email: string;
  password: string;
  fullName: string;
  firstName?: string;
  lastName?: string;
  /** E.164 US (+1 + 10 digits) */
  phone: string;
  street: string;
  city: string;
  state: string;
  zipCode: string;
}

/** Body for POST /auth/register/verify-otp */
export interface VerifyRegisterOtpInput {
  email: string;
  otp: string;
}

/** Body for POST /auth/request-login-otp */
export interface RequestLoginOtpInput {
  email: string;
  password: string;
}

/** Body for POST /auth/verify-login-otp */
export interface VerifyLoginOtpInput {
  email: string;
  otp: string;
  /** When true, refresh cookie is set for 30 days */
  rememberMe?: boolean;
}

/** Body for POST /auth/change-password */
export interface ChangePasswordInput {
  currentPassword: string;
  newPassword: string;
}

/** Body for POST /auth/reset-password */
export interface ResetPasswordInput {
  token: string;
  newPassword: string;
}

/** Response from GET /auth/config */
export interface AuthConfig {
  loginOtpEnabled: boolean;
}

/** Body for POST /auth/forgot-password */
export interface ForgotPasswordInput {
  email: string;
}

/** Response from POST /auth/forgot-password */
export interface ForgotPasswordResponse {
  message: string;
}

/** Role from GET /roles */
export interface RoleDto {
  id: string;
  name: string;
  description?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

/** Standard API error body (e.g. from NestJS ValidationPipe or HttpException) */
export interface ApiErrorBody {
  statusCode?: number;
  message?: string | string[];
  error?: string;
}

// ----- Bookings -----

/** Body for POST /bookings/court */
export interface CreateCourtBookingInput {
  courtId: string;
  bookingDate: string;
  startTime: string;
  endTime: string;
  coachId?: string;
  durationMinutes?: number;
  /** When booking via location wizard (location_booking_windows.id). */
  locationBookingWindowId?: string;
}

/** GET /bookings/court/wizard/windows */
export interface CourtWizardWindowApi {
  id: string;
  locationId: string;
  sport: string;
  courtType: string;
  windowStartTime: string;
  windowEndTime: string;
  allowedDurationMinutes: number[];
  slotGridMinutes: number;
  sortOrder: number;
}

/** GET /bookings/court/wizard/availability */
export interface CourtWizardSlotApi {
  startTime: string;
  endTime: string;
  durationMinutes: number;
  availableCourtIds: string[];
}

export interface CourtWizardCourtSummaryApi {
  id: string;
  name: string;
  type: string;
  courtTypes?: string[];
  sport: string;
  status: string;
  pricePerHourPublic: string;
}

export interface CourtWizardAvailabilityResponseApi {
  locationId: string;
  timezone: string;
  bookingDate: string;
  windowId: string;
  durationMinutes: number;
  slotGridMinutes: number;
  courts: CourtWizardCourtSummaryApi[];
  slots: CourtWizardSlotApi[];
}

/** Body for POST /bookings/coach */
export interface CreateCoachSessionInput {
  coachId: string;
  sessionDate: string;
  startTime: string;
  durationMinutes: number;
  courtId?: string;
  sessionType?: "private" | "group";
}

/** Response from POST /bookings/court or POST /bookings/coach */
export interface CreateBookingResult {
  id: string;
  kind: "court" | "coach";
  summary: string;
}

/** Slot from GET /bookings/court/availability */
export interface CourtAvailabilitySlot {
  start: string;
  end: string;
}

/** Response from GET /bookings/my */
export interface MyBookingsResponse {
  courtBookings: CourtBookingApi[];
  coachSessions: CoachSessionApi[];
}

/** Court booking as returned by API (snake_case or same as entity) */
export interface CourtBookingApi {
  id: string;
  organizationId?: string | null;
  branchId?: string | null;
  locationId?: string | null;
  sport?: string | null;
  courtType?: string | null;
  courtId: string;
  userId: string;
  coachId?: string | null;
  bookingType?: string;
  bookingDate: string;
  startTime: string;
  endTime: string;
  durationMinutes: number;
  totalPrice?: number | string;
  paymentStatus?: string;
  bookingStatus: string;
  createdAt?: string;
  updatedAt?: string;
  court?: {
    id: string;
    name?: string;
    locationId?: string | null;
    sport?: string;
    type?: string;
  };
}

/** GET /admin/dashboard/metrics */
export interface DashboardMetricsApi {
  totals: {
    usersActive: number;
    courts: number;
    locations: number;
    courtBookingsOpen: number;
    coachSessionsScheduled: number;
    coaches: number;
    revenue14d: number;
  };
  dailyCourtBookings: { date: string; count: number }[];
  bookingsBySport: { sport: string; count: number }[];
  dailyRevenue: { date: string; revenue: number }[];
}

/** GET /admin/dashboard/metrics/by-sport?sport= */
export interface SportBookingBreakdownApi {
  sport: string;
  windowDays: number;
  totalBookings: number;
  byRole: { role: string; count: number }[];
  byBookingType: { bookingType: string; count: number }[];
  byAccountType: { accountType: string; count: number }[];
}

/** GET /admin/dashboard/metrics/by-sport/drilldown */
export interface AdminSportDrilldownItemApi {
  userId: string;
  email: string;
  fullName: string | null;
  bookingCount: number;
}

export interface AdminSportDrilldownPageApi {
  sport: string;
  dimension: "role" | "bookingType" | "accountType";
  filterValue: string;
  total: number;
  page: number;
  pageSize: number;
  items: AdminSportDrilldownItemApi[];
}

/** GET /admin/dashboard/metrics/kpi-drilldown */
export interface AdminKpiDrilldownRowApi {
  id: string;
  title: string;
  subtitle?: string;
  meta?: string;
}

export interface AdminKpiDrilldownPageApi {
  metric: string;
  total: number;
  page: number;
  pageSize: number;
  rows: AdminKpiDrilldownRowApi[];
}

/** GET /admin/dashboard/metrics/day-bookings */
export interface AdminDayBookingRowApi {
  id: string;
  bookingDate: string;
  startTime: string;
  endTime: string;
  sport: string | null;
  userName: string;
  userEmail: string;
  courtName: string | null;
  totalPrice: string;
}

export interface AdminDayBookingsPageApi {
  date: string;
  total: number;
  page: number;
  pageSize: number;
  rows: AdminDayBookingRowApi[];
}

/** Coach session as returned by API */
export interface CoachSessionApi {
  id: string;
  organizationId?: string | null;
  branchId?: string | null;
  coachId: string;
  bookedById?: string | null;
  courtId?: string | null;
  sessionDate: string;
  startTime: string;
  durationMinutes: number;
  sessionType: string;
  status: string;
  createdAt?: string;
  updatedAt?: string;
}

// ─── New slot flow ────────────────────────────────────────────────────────────

/** One available time slot from GET /bookings/court/wizard/slots */
export interface CourtSlotApi {
  startTime: string;       // "HH:mm"
  endTime: string;         // "HH:mm"
  durationMinutes: number;
  availableCount: number;  // courts free for this slot (from DB)
  totalCount: number;      // total active courts
}

/** Response from GET /bookings/court/wizard/slots */
export interface CourtSlotAvailabilityResponseApi {
  locationId: string;
  sport: string;
  courtType: string;
  timezone: string;
  bookingDate: string;
  durationMinutes: number;
  slots: CourtSlotApi[];
}

/** Body for POST /bookings/court/slot */
export interface CreateCourtSlotBookingInput {
  locationId: string;
  areaId?: string;
  sport: string;
  courtType: string;
  bookingDate: string;
  startTime: string;
  endTime: string;
  durationMinutes: number;
  coachId?: string;
}
