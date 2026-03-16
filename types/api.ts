/**
 * API request/response types.
 * Keep this file free of imports from lib/api or lib/auth-store to avoid circular deps.
 */

/** User payload returned by auth API (matches backend AuthResponse.user) */
export interface AuthUser {
  id: string;
  email: string;
  fullName: string;
  role?: string;
  organizationId?: string;
  branchId?: string;
}

/** Response from POST /auth/login, /auth/register, /auth/refresh */
export interface AuthResponse {
  accessToken: string;
  refreshToken?: string;
  user: AuthUser;
}

/** Body for POST /auth/login */
export interface LoginInput {
  email: string;
  password: string;
}

/** Body for POST /auth/register */
export interface RegisterInput {
  email: string;
  password: string;
  fullName: string;
  phone?: string;
  organizationId?: string;
  branchId?: string;
  roleId: string;
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
  courtId: string;
  userId: string;
  coachId?: string | null;
  bookingType?: string;
  bookingDate: string;
  startTime: string;
  endTime: string;
  durationMinutes: number;
  totalPrice?: number;
  paymentStatus?: string;
  bookingStatus: string;
  createdAt?: string;
  updatedAt?: string;
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
