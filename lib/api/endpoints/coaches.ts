import type { ApiClient } from "../client";
import type { ListResponse } from "../list-response";

export interface CoachUserApi {
  id: string;
  email?: string;
  fullName?: string;
  avatarUrl?: string | null;
  branchId?: string | null;
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
    getCoaches: (params?: { branchId?: string; page?: string; pageSize?: string }) => {
      const q: Record<string, string> = {};
      if (params?.branchId) q.branchId = params.branchId;
      if (params?.page !== undefined) q.page = params.page;
      if (params?.pageSize !== undefined) q.pageSize = params.pageSize;
      return client.get<ListResponse<CoachApi>>("/coaches", {
        params: Object.keys(q).length ? q : undefined,
      });
    },
    getCoach: (id: string) => client.get<CoachApi>(`/coaches/${id}`),
  };
}

export type CoachesEndpoints = ReturnType<typeof createCoachesEndpoints>;
