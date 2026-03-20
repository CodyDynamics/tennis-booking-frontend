import type { ApiClient } from "../client";
import type { ListResponse } from "../list-response";

export interface LocationApi {
  id: string;
  branchId: string;
  name: string;
  address?: string | null;
  status?: string;
  createdAt?: string;
  updatedAt?: string;
  latitude?: string | null;
  longitude?: string | null;
  /** JSON string: `[{ "lat": number, "lng": number, "label": string }]` */
  mapMarkers?: string | null;
}

export interface CreateLocationBody {
  branchId: string;
  name: string;
  address?: string;
}

export interface UpdateLocationBody {
  name?: string;
  address?: string;
  status?: string;
}

export function createLocationsEndpoints(client: ApiClient) {
  return {
    getLocations: (params?: { branchId?: string; page?: string; pageSize?: string }) => {
      const q: Record<string, string> = {};
      if (params?.branchId) q.branchId = params.branchId;
      if (params?.page !== undefined) q.page = params.page;
      if (params?.pageSize !== undefined) q.pageSize = params.pageSize;
      return client.get<ListResponse<LocationApi>>("/locations", {
        params: Object.keys(q).length ? q : undefined,
      });
    },
    getLocation: (id: string) => client.get<LocationApi>(`/locations/${id}`),
    createLocation: (body: CreateLocationBody) =>
      client.post<LocationApi>("/locations", body),
    updateLocation: (id: string, body: UpdateLocationBody) =>
      client.patch<LocationApi>(`/locations/${id}`, body),
    deleteLocation: (id: string) =>
      client.delete<{ deleted?: boolean }>(`/locations/${id}`),
  };
}

export type LocationsEndpoints = ReturnType<typeof createLocationsEndpoints>;
