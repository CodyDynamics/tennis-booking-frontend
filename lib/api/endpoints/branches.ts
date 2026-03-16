import type { ApiClient } from "../client";

export interface BranchApi {
  id: string;
  organizationId: string | null;
  name: string;
  address?: string | null;
  phone?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export function createBranchesEndpoints(client: ApiClient) {
  return {
    getBranches: (params?: { organizationId?: string }) => {
      const q: Record<string, string> = {};
      if (params?.organizationId) q.organizationId = params.organizationId;
      return client.get<BranchApi[]>("/branches", {
        params: Object.keys(q).length ? q : undefined,
      });
    },
    getBranch: (id: string) => client.get<BranchApi>(`/branches/${id}`),
  };
}

export type BranchesEndpoints = ReturnType<typeof createBranchesEndpoints>;
