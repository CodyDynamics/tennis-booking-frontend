import type { ApiClient } from "../client";

export interface CourtApi {
  id: string;
  branchId: string;
  name: string;
  type: string;
  pricePerHour: string | number;
  description?: string | null;
  status: string;
  sport: "tennis" | "pickleball";
  createdAt?: string;
  updatedAt?: string;
  branch?: { id: string; name: string; address?: string } | null;
}

export interface CreateCourtBody {
  branchId: string;
  name: string;
  type?: string;
  sport?: "tennis" | "pickleball";
  pricePerHour?: number;
  description?: string;
  status?: string;
}

export interface UpdateCourtBody {
  branchId?: string;
  name?: string;
  type?: string;
  sport?: "tennis" | "pickleball";
  pricePerHour?: number;
  description?: string;
  status?: string;
}

export function createCourtsEndpoints(client: ApiClient) {
  return {
    getCourts: (params?: { branchId?: string; status?: string; search?: string; sport?: string }) => {
      const q: Record<string, string> = {};
      if (params?.branchId) q.branchId = params.branchId;
      if (params?.status) q.status = params.status;
      if (params?.search) q.search = params.search;
      if (params?.sport) q.sport = params.sport;
      return client.get<CourtApi[]>("/courts", {
        params: Object.keys(q).length ? q : undefined,
      });
    },
    getCourt: (id: string) => client.get<CourtApi>(`/courts/${id}`),
    createCourt: (body: CreateCourtBody) => client.post<CourtApi>("/courts", body),
    updateCourt: (id: string, body: UpdateCourtBody) =>
      client.patch<CourtApi>(`/courts/${id}`, body),
    deleteCourt: (id: string) => client.delete<{ deleted: boolean }>(`/courts/${id}`),
  };
}

export type CourtsEndpoints = ReturnType<typeof createCourtsEndpoints>;
