import type { ApiClient } from "../client";

export interface CoachUserApi {
  id: string;
  email?: string;
  fullName?: string;
}

export interface CoachApi {
  id: string;
  userId: string;
  experienceYears: number;
  bio?: string | null;
  hourlyRate: string | number;
  createdAt?: string;
  updatedAt?: string;
  user?: CoachUserApi;
}

export function createCoachesEndpoints(client: ApiClient) {
  return {
    getCoaches: () => client.get<CoachApi[]>("/coaches"),
    getCoach: (id: string) => client.get<CoachApi>(`/coaches/${id}`),
  };
}

export type CoachesEndpoints = ReturnType<typeof createCoachesEndpoints>;
