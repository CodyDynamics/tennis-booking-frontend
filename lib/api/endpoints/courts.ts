import type { ApiClient } from "../client";
import type { ListResponse } from "../list-response";
import type { CoachApi } from "./coaches";

export interface CourtApi {
  id: string;
  locationId: string | null;
  name: string;
  type: string;
  pricePerHour: string | number;
  description?: string | null;
  imageUrl?: string | null;
  /** JSON string array of image URLs for gallery */
  imageGallery?: string | null;
  /** Google Maps embed URL */
  mapEmbedUrl?: string | null;
  status: string;
  sport: string;
  createdAt?: string;
  updatedAt?: string;
  location?: { id: string; name: string; address?: string | null; branchId: string } | null;
  /** Present on GET /courts/:id — coaches assigned to this court */
  coaches?: CoachApi[];
}

export interface CreateCourtBody {
  locationId: string;
  name: string;
  type?: string;
  sport?: string;
  windowStartTime?: string;
  windowEndTime?: string;
  pricePerHour?: number;
  description?: string;
  status?: string;
}

export interface UpdateCourtBody {
  locationId?: string;
  name?: string;
  type?: string;
  sport?: string;
  windowStartTime?: string;
  windowEndTime?: string;
  pricePerHour?: number;
  description?: string;
  status?: string;
}

export function createCourtsEndpoints(client: ApiClient) {
  return {
    getCourts: (params?: {
      locationId?: string;
      branchId?: string;
      status?: string;
      search?: string;
      sport?: string;
      page?: string;
      pageSize?: string;
    }) => {
      const q: Record<string, string> = {};
      if (params?.locationId) q.locationId = params.locationId;
      if (params?.branchId) q.branchId = params.branchId;
      if (params?.status) q.status = params.status;
      if (params?.search) q.search = params.search;
      if (params?.sport) q.sport = params.sport;
      if (params?.page !== undefined) q.page = params.page;
      if (params?.pageSize !== undefined) q.pageSize = params.pageSize;
      return client.get<ListResponse<CourtApi>>("/courts", {
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
