import type { ApiClient } from "../client";

export interface SportApi {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  imageUrl?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateSportBody {
  code: string;
  name: string;
  description?: string;
  imageUrl?: string;
}

export interface UpdateSportBody {
  code?: string;
  name?: string;
  description?: string;
  imageUrl?: string;
}

export function createSportsEndpoints(client: ApiClient) {
  return {
    getSports: () => client.get<SportApi[]>("/sports"),
    createSport: (body: CreateSportBody) => client.post<SportApi>("/sports", body),
    updateSport: (id: string, body: UpdateSportBody) =>
      client.patch<SportApi>(`/sports/${id}`, body),
    deleteSport: (id: string) =>
      client.delete<{ deleted: boolean }>(`/sports/${id}`),
  };
}

export type SportsEndpoints = ReturnType<typeof createSportsEndpoints>;
