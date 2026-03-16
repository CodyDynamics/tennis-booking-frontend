import type { RoleDto } from "@/types/api";
import type { ApiClient } from "../client";

export interface RoleWithPermissions extends RoleDto {
  permissions?: string | null;
}

export interface PermissionSchemaItem {
  resource: string;
  label: string;
  actions: readonly string[];
}

export function createRolesEndpoints(client: ApiClient) {
  return {
    getRoles: () => client.get<RoleWithPermissions[]>("/roles"),
    getRole: (id: string) => client.get<RoleWithPermissions>(`/roles/${id}`),
    getPermissionsSchema: () =>
      client.get<PermissionSchemaItem[]>("/roles/permissions/schema"),
    updateRolePermissions: (roleId: string, permissions: string[]) =>
      client.patch<RoleWithPermissions>(`/roles/${roleId}/permissions`, {
        permissions,
      }),
  };
}

export type RolesEndpoints = ReturnType<typeof createRolesEndpoints>;
