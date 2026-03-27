import type { ApiClient } from "../client";

export interface AreaApi {
  id: string;
  locationId: string;
  name: string;
  description?: string | null;
  status: string;
  visibility?: "public" | "private";
}

export interface CreateAreaBody {
  locationId: string;
  name: string;
  description?: string;
  status?: "active" | "inactive";
  visibility?: "public" | "private";
}

export interface UpdateAreaBody {
  locationId?: string;
  name?: string;
  description?: string;
  status?: "active" | "inactive";
  visibility?: "public" | "private";
}

export function createAreasEndpoints(client: ApiClient) {
  return {
    getAreas: (params?: { locationId?: string }) =>
      client.get<AreaApi[]>("/areas", { params }),
    getBookableAreas: () => client.get<AreaApi[]>("/areas/bookable"),
    createArea: (body: CreateAreaBody) => client.post<AreaApi>("/areas", body),
    updateArea: (id: string, body: UpdateAreaBody) =>
      client.patch<AreaApi>(`/areas/${id}`, body),
    deleteArea: (id: string) => client.delete<{ deleted: boolean }>(`/areas/${id}`),
  };
}

export type AreasEndpoints = ReturnType<typeof createAreasEndpoints>;
