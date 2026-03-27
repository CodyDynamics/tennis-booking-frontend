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
  homeAddress?: string | null;
  organizationId?: string | null;
  branchId?: string | null;
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
  organizationId?: string;
  branchId?: string;
  roleId: string;
  mustChangePasswordOnFirstLogin?: boolean;
  membershipLocationId?: string;
}

export interface UpdateUserBody {
  email?: string;
  fullName?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  homeAddress?: string;
  organizationId?: string;
  branchId?: string;
  roleId?: string;
  status?: "active" | "inactive";
  password?: string;
  mustChangePasswordOnFirstLogin?: boolean;
  /** Set location membership (same as Area→location). Omit to leave unchanged; null to clear. */
  membershipLocationId?: string | null;
}

export function createUsersEndpoints(client: ApiClient) {
  return {
    getUsers: (params?: { roleId?: string; search?: string; onlyMembership?: boolean }) => {
      const q: Record<string, string> = {};
      if (params?.roleId) q.roleId = params.roleId;
      if (params?.search) q.search = params.search;
      if (params?.onlyMembership) q.onlyMembership = "true";
      return client.get<UserApi[]>("/users", {
        params: Object.keys(q).length ? q : undefined,
      });
    },
    getUser: (id: string, params?: { includeMemberships?: boolean }) =>
      client.get<UserApi>(`/users/${id}`, {
        params:
          params?.includeMemberships !== undefined
            ? { includeMemberships: params.includeMemberships ? "true" : "false" }
            : undefined,
      }),
    createUser: (body: CreateUserBody) => client.post<UserApi>("/users", body),
    updateUser: (id: string, body: UpdateUserBody) =>
      client.patch<UserApi>(`/users/${id}`, body),
    deleteUser: (id: string) => client.delete<{ deleted: boolean }>(`/users/${id}`),
  };
}

export type UsersEndpoints = ReturnType<typeof createUsersEndpoints>;
