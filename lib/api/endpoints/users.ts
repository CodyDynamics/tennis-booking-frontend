import type { ApiClient } from "../client";

export interface UserApi {
  id: string;
  email: string;
  fullName: string;
  phone?: string | null;
  organizationId?: string | null;
  branchId?: string | null;
  roleId: string;
  status: string;
  createdAt?: string;
  updatedAt?: string;
  role?: { id: string; name: string; description?: string | null } | null;
}

export interface CreateUserBody {
  email: string;
  password: string;
  fullName: string;
  phone?: string;
  organizationId?: string;
  branchId?: string;
  roleId: string;
}

export interface UpdateUserBody {
  email?: string;
  fullName?: string;
  phone?: string;
  organizationId?: string;
  branchId?: string;
  roleId?: string;
  status?: "active" | "inactive";
  password?: string;
}

export function createUsersEndpoints(client: ApiClient) {
  return {
    getUsers: (params?: { roleId?: string; search?: string }) => {
      const q: Record<string, string> = {};
      if (params?.roleId) q.roleId = params.roleId;
      if (params?.search) q.search = params.search;
      return client.get<UserApi[]>("/users", {
        params: Object.keys(q).length ? q : undefined,
      });
    },
    getUser: (id: string) => client.get<UserApi>(`/users/${id}`),
    createUser: (body: CreateUserBody) => client.post<UserApi>("/users", body),
    updateUser: (id: string, body: UpdateUserBody) =>
      client.patch<UserApi>(`/users/${id}`, body),
    deleteUser: (id: string) => client.delete<{ deleted: boolean }>(`/users/${id}`),
  };
}

export type UsersEndpoints = ReturnType<typeof createUsersEndpoints>;
