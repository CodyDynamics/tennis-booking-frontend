import type { ApiClient } from "../client";
import type { ListResponse } from "../list-response";

export interface LocationMembershipApi {
  locationId: string;
  visibility: string;
  hasActiveMembership: boolean;
  membershipStatus: string | null;
}

export interface LocationApi {
  id: string;
  branchId: string;
  parentLocationId?: string | null;
  kind?: "root" | "child";
  name: string;
  address?: string | null;
  status?: string;
  /** `public` | `private` — from backend location visibility */
  visibility?: string;
  timezone?: string;
  createdAt?: string;
  updatedAt?: string;
  latitude?: string | null;
  longitude?: string | null;
  /** JSON string: `[{ "lat": number, "lng": number, "label": string }]` */
  mapMarkers?: string | null;
}

export interface CreateLocationBody {
  branchId: string;
  parentLocationId?: string;
  kind?: "root" | "child";
  name: string;
  address?: string;
  timezone?: string;
  visibility?: "public" | "private";
  status?: "active" | "inactive";
}

export interface UpdateLocationBody {
  branchId?: string;
  parentLocationId?: string;
  kind?: "root" | "child";
  name?: string;
  address?: string;
  timezone?: string;
  visibility?: "public" | "private";
  status?: "active" | "inactive";
}

export function createLocationsEndpoints(client: ApiClient) {
  return {
    getLocations: (params?: {
      branchId?: string;
      parentLocationId?: string;
      kind?: "root" | "child";
      page?: string;
      pageSize?: string;
    }) => {
      const q: Record<string, string> = {};
      if (params?.branchId) q.branchId = params.branchId;
      if (params?.parentLocationId) q.parentLocationId = params.parentLocationId;
      if (params?.kind) q.kind = params.kind;
      if (params?.page !== undefined) q.page = params.page;
      if (params?.pageSize !== undefined) q.pageSize = params.pageSize;
      return client.get<ListResponse<LocationApi>>("/locations", {
        params: Object.keys(q).length ? q : undefined,
      });
    },
    /** Guest-safe: active public locations only (no private clubs). */
    getPublicLocations: (params?: { page?: string; pageSize?: string }) => {
      const q: Record<string, string> = {};
      if (params?.page !== undefined) q.page = params.page;
      if (params?.pageSize !== undefined) q.pageSize = params.pageSize;
      return client.get<ListResponse<LocationApi>>("/locations/public", {
        params: Object.keys(q).length ? q : undefined,
      });
    },
    /** Authenticated: public + private locations where user has active membership. */
    getBookableLocations: () => client.get<LocationApi[]>("/locations/bookable"),
    /** JWT: active membership at this location + visibility (for private club UI). */
    getLocationMembership: (id: string) =>
      client.get<LocationMembershipApi>(`/locations/${id}/membership`),
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
