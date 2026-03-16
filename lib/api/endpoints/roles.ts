import type { RoleDto } from "@/types/api";
import type { ApiClient } from "../client";

export function createRolesEndpoints(client: ApiClient) {
  return {
    getRoles: () => client.get<RoleDto[]>("/roles"),
  };
}

export type RolesEndpoints = ReturnType<typeof createRolesEndpoints>;
