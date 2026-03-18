import type { ApiClient } from "../client";

export interface CourtApi {
  id: string;
  locationId: string | null;
  name: string;
  type: string;
  pricePerHour: string | number;
  description?: string | null;
  imageUrl?: string | null;
  status: string;
  sport: "tennis" | "pickleball";
  createdAt?: string;
  updatedAt?: string;
  location?: { id: string; name: string; address?: string | null; branchId: string } | null;
}

export interface CreateCourtBody {
  locationId: string;
  name: string;
  type?: string;
  sport?: "tennis" | "pickleball";
  pricePerHour?: number;
  description?: string;
  status?: string;
}

export interface UpdateCourtBody {
  locationId?: string;
  name?: string;
  type?: string;
  sport?: "tennis" | "pickleball";
  pricePerHour?: number;
  description?: string;
  status?: string;
}

export function createCourtsEndpoints(client: ApiClient) {
  return {
    getCourts: (params?: { locationId?: string; branchId?: string; status?: string; search?: string; sport?: string }) => {
      const q: Record<string, string> = {};
      if (params?.locationId) q.locationId = params.locationId;
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
