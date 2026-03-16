import type { ApiClient } from "../client";

export interface CourtApi {
  id: string;
  branchId: string;
  name: string;
  type: string;
  pricePerHour: string | number;
  description?: string | null;
  status: string;
  createdAt?: string;
  updatedAt?: string;
}

export function createCourtsEndpoints(client: ApiClient) {
  return {
    getCourts: (params?: { branchId?: string; status?: string }) => {
      const q: Record<string, string> = {};
      if (params?.branchId) q.branchId = params.branchId;
      if (params?.status) q.status = params.status;
      return client.get<CourtApi[]>("/courts", {
        params: Object.keys(q).length ? q : undefined,
      });
    },
    getCourt: (id: string) => client.get<CourtApi>(`/courts/${id}`),
  };
}

export type CourtsEndpoints = ReturnType<typeof createCourtsEndpoints>;
