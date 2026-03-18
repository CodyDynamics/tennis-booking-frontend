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

export function createSportsEndpoints(client: ApiClient) {
  return {
    getSports: () => client.get<SportApi[]>("/sports"),
  };
}

export type SportsEndpoints = ReturnType<typeof createSportsEndpoints>;
