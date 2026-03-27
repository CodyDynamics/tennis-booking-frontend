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

let accessTokenGetter: GetAccessToken = () => null;

/**
 * Set the function used to get the access token for authenticated requests.
 * Call this from your auth layer (e.g. auth-store) when the app initializes.
 */
export function setAccessTokenGetter(getter: GetAccessToken): void {
  accessTokenGetter = getter;
}

const client = createApiClient({
  baseURL: API_BASE_URL,
  getAccessToken: () => accessTokenGetter?.() ?? null,
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
