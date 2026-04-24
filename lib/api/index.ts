import { getStoredAccessToken } from "@/lib/auth-tokens";
import { API_BASE_URL } from "./config";
import { createApiClient, type GetAccessToken } from "./client";
import { createAuthEndpoints } from "./endpoints/auth";
import { createRolesEndpoints } from "./endpoints/roles";
import { createBookingsEndpoints } from "./endpoints/bookings";
import { createCourtsEndpoints } from "./endpoints/courts";
import { createCoachesEndpoints } from "./endpoints/coaches";
import { createUsersEndpoints } from "./endpoints/users";
import { createBranchesEndpoints } from "./endpoints/branches";
import { createSportsEndpoints } from "./endpoints/sports";
import { createLocationsEndpoints } from "./endpoints/locations";
import { createOrganizationsEndpoints } from "./endpoints/organizations";
import { createAdminEndpoints } from "./endpoints/admin";
import { createAreasEndpoints } from "./endpoints/areas";

let accessTokenGetter: GetAccessToken | null = null;

/**
 * Optional override (e.g. tests). When unset, the access token is read from
 * sessionStorage after login/refresh (see `lib/auth-tokens.ts`).
 */
export function setAccessTokenGetter(getter: GetAccessToken | null): void {
  accessTokenGetter = getter;
}

const client = createApiClient({
  baseURL: API_BASE_URL,
  getAccessToken: () => accessTokenGetter?.() ?? getStoredAccessToken(),
});

export const api = {
  auth: createAuthEndpoints(client),
  roles: createRolesEndpoints(client),
  bookings: createBookingsEndpoints(client),
  courts: createCourtsEndpoints(client),
  coaches: createCoachesEndpoints(client),
  users: createUsersEndpoints(client),
  branches: createBranchesEndpoints(client),
  sports: createSportsEndpoints(client),
  locations: createLocationsEndpoints(client),
  areas: createAreasEndpoints(client),
  organizations: createOrganizationsEndpoints(client),
  admin: createAdminEndpoints(client),
};

export { ApiError } from "./client";
export type {
  AuthResponse,
  LoginInput,
  RegisterInput,
  AuthUser,
  RoleDto,
  CreateCourtBookingInput,
  CreateCoachSessionInput,
  MyBookingsResponse,
  CourtBookingApi,
  CoachSessionApi,
} from "@/types/api";
