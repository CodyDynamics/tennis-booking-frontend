import type { ApiClient } from "../client";

export interface OrganizationApi {
  id: string;
  name: string;
  description?: string | null;
  status?: string;
  createdAt?: string;
  updatedAt?: string;
}

export function createOrganizationsEndpoints(client: ApiClient) {
  return {
    getOrganizations: () => client.get<OrganizationApi[]>("/organizations"),
    getOrganization: (id: string) => client.get<OrganizationApi>(`/organizations/${id}`),
  };
}

export type OrganizationsEndpoints = ReturnType<typeof createOrganizationsEndpoints>;
