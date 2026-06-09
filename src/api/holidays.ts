import apiClient from "@/api/client";
import type { PaginatedResponse } from "@/types/campaign";

export interface Holiday {
  id: number;
  date: string;
  name: string;
  region: string;
  created_at: string;
  updated_at: string;
}
export interface HolidayCreate {
  date: string;
  name: string;
  region: string;
}
export interface HolidayListResponse {
  items: Holiday[];
  total: number | null;
}

export const holidaysApi = {
  /** Tolerant list: backend returns Page<Holiday>, but if a deployment
   * regresses to a bare array we still produce the same shape. */
  list: async (
    params: { region?: string; page?: number; page_size?: number } = {},
  ): Promise<HolidayListResponse> => {
    const r = await apiClient.get<PaginatedResponse<Holiday> | Holiday[]>(
      "/holidays",
      { params },
    );
    if (Array.isArray(r.data)) return { items: r.data, total: null };
    return { items: r.data.items, total: r.data.total };
  },
  create: (body: HolidayCreate) =>
    apiClient.post<Holiday>("/holidays", body).then((r) => r.data),
  remove: (id: number) =>
    apiClient.delete<void>(`/holidays/${id}`).then((r) => r.data),
};
