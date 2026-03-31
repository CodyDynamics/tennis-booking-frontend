import type { ApiClient } from "../client";

export interface UserMembershipSummary {
  id: string;
  locationId: string;
  status: string;
}

export interface UserApi {
  id: string;
  email: string;
  fullName: string;
  firstName?: string | null;
  lastName?: string | null;
  phone?: string | null;
  /** system | normal | membership */
  accountType?: string | null;
  homeAddress?: string | null;
  roleId: string;
  status: string;
  mustChangePasswordOnFirstLogin?: boolean;
  createdAt?: string;
  updatedAt?: string;
  role?: { id: string; name: string; description?: string | null } | null;
  memberships?: UserMembershipSummary[];
}

export interface CreateUserBody {
  email: string;
  password: string;
  fullName: string;
  firstName?: string;
  lastName?: string;
  phone: string;
  homeAddress?: string;
  roleId: string;
  mustChangePasswordOnFirstLogin?: boolean;
  membershipLocationId?: string;
}

/** Row from GET /users/venue-memberships */
export interface VenueMembershipAssignmentRow {
  membershipId: string;
  userId: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  roleName: string | null;
  locationId: string;
  locationName: string;
  status: string;
}

export interface UpdateUserBody {
  email?: string;
  fullName?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  homeAddress?: string;
  roleId?: string;
  status?: "active" | "inactive";
  password?: string;
  mustChangePasswordOnFirstLogin?: boolean;
  /** Set location membership (same as Area→location). Omit to leave unchanged; null to clear. */
  membershipLocationId?: string | null;
  /** system | normal | membership */
  accountType?: "system" | "normal" | "membership";
}

export interface CreateMembershipPlaceholderBody {
  email: string;
  phone: string;
  fullName: string;
  firstName?: string;
  lastName?: string;
  homeAddress?: string;
  membershipLocationId?: string;
}

export function createUsersEndpoints(client: ApiClient) {
  return {
    getUsers: (params?: {
      roleId?: string;
      search?: string;
      onlyMembership?: boolean;
      /** Users without active/pending membership at this location (Area form onboarding). */
      noMembershipAtLocationId?: string;
      /** Area form: full list for super_admin; super_user sees venue members + users with no membership. */
      forAreaAssignment?: boolean;
      /** super_admin: user has no membership at any location (any venue). */
      noMembershipAnywhere?: boolean;
      membershipAtLocationId?: string;
      areaId?: string;
      accountType?: string;
      excludeAccountType?: string;
      /** When true, API attaches `memberships` per user (for admin Location column). */
      includeMemberships?: boolean;
    }) => {
      const q: Record<string, string> = {};
      if (params?.roleId) q.roleId = params.roleId;
      if (params?.search) q.search = params.search;
      if (params?.onlyMembership) q.onlyMembership = "true";
      if (params?.noMembershipAtLocationId) q.noMembershipAtLocationId = params.noMembershipAtLocationId;
      if (params?.forAreaAssignment) q.forAreaAssignment = "true";
      if (params?.noMembershipAnywhere) q.noMembershipAnywhere = "true";
      if (params?.membershipAtLocationId) q.membershipAtLocationId = params.membershipAtLocationId;
      if (params?.areaId) q.areaId = params.areaId;
      if (params?.accountType) q.accountType = params.accountType;
      if (params?.excludeAccountType) q.excludeAccountType = params.excludeAccountType;
      if (params?.includeMemberships) q.includeMemberships = "true";
      return client.get<UserApi[]>("/users", {
        params: Object.keys(q).length ? q : undefined,
      });
    },
    getVenueMembershipAssignments: () =>
      client.get<VenueMembershipAssignmentRow[]>("/users/venue-memberships"),
    getUser: (id: string, params?: { includeMemberships?: boolean }) =>
      client.get<UserApi>(`/users/${id}`, {
        params:
          params?.includeMemberships !== undefined
            ? { includeMemberships: params.includeMemberships ? "true" : "false" }
            : undefined,
      }),
    createUser: (body: CreateUserBody) => client.post<UserApi>("/users", body),
    createMembershipPlaceholder: (body: CreateMembershipPlaceholderBody) =>
      client.post<UserApi>("/users/membership-placeholder", body),
    updateUser: (id: string, body: UpdateUserBody) =>
      client.patch<UserApi>(`/users/${id}`, body),
    deleteUser: (id: string) => client.delete<{ deleted: boolean }>(`/users/${id}`),
  };
}

export type UsersEndpoints = ReturnType<typeof createUsersEndpoints>;
