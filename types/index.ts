export type UserRole = "super_admin" | "admin" | "coach" | "student" | "parent" | "player";

export type BookingType = "COURT_ONLY" | "COURT_COACH" | "TRAINING";

export type { AuthResponse, AuthUser, LoginInput, RegisterInput, RoleDto, ApiErrorBody } from "./api";

export interface User {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  phone?: string;
  avatarUrl?: string;
  organizationId: string;
  branchId?: string;
  status?: "active" | "inactive";
  /** Permission codes from role (e.g. courts:view, users:create). Used for RBAC. */
  permissions?: string[];
}

export interface Court {
  id: string;
  name: string;
  type: "indoor" | "outdoor";
  sport: "tennis" | "pickleball";
  pricePerHour: number;
  description?: string;
  status: "active" | "maintenance";
  locationId?: string | null;
  branchId?: string;
  locationName?: string | null;
  imageUrl?: string | null;
  /** Array of image URLs for gallery */
  imageGallery?: string[];
  /** Google Maps embed URL */
  mapEmbedUrl?: string | null;
  /** Coaches assigned to this court (from GET /courts/:id) */
  coaches?: Coach[];
  users?: string[];
  timeSlots?: { startTime: string; endTime: string }[];
}

export interface CourtBooking {
  id: string;
  organizationId: string;
  branchId: string;
  userId: string;
  courtId: string;
  coachId?: string | null;
  bookingType: BookingType;
  bookingDate: string;
  startTime: string;
  endTime: string;
  durationMinutes: number;
  totalPrice: number;
  paymentStatus: "unpaid" | "paid" | "refunded";
  bookingStatus: "pending" | "confirmed" | "cancelled" | "completed";
  createdAt: string;
  updatedAt?: string;
}

export interface Coach {
  id: string;
  userId: string;
  experienceYears: number;
  bio?: string;
  hourlyRate: number;
  specialties?: string[];
  availabilitySchedule?: string;
  user?: User;
}

export interface CoachSession {
  id: string;
  organizationId: string;
  branchId: string;
  coachId: string;
  courtId?: string | null;
  sessionDate: string;
  startTime: string;
  durationMinutes: number;
  sessionType: "private" | "group";
  status: "scheduled" | "completed" | "cancelled";
  studentIds: string[];
  createdAt?: string;
  updatedAt?: string;
}

export interface ProgressReport {
  id: string;
  organizationId: string;
  branchId: string;
  coachId: string;
  studentId: string;
  sessionId?: string | null;
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
  createdAt: string;
  updatedAt?: string;
}

export interface SkillTrend {
  date: string;
  forehand: number;
  backhand: number;
  serve: number;
  footwork: number;
  stamina: number;
}
