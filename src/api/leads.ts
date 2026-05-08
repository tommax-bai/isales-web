import apiClient from "@/api/client";
import type { PaginatedResponse } from "@/types/campaign";
import type {
  Lead,
  LeadCreate,
  LeadImportSummary,
  LeadListParams,
  LeadUpdate,
} from "@/types/lead";

export interface LeadListResponse {
  items: Lead[];
  total: number | null;
}

export const leadsApi = {
  /** Tolerant list: backend returns Page<Lead> today, but if a future
   * deployment regresses to a bare array, we still produce the same shape. */
  list: async (params: LeadListParams = {}): Promise<LeadListResponse> => {
    const r = await apiClient.get<
      PaginatedResponse<Lead> | Lead[]
    >("/leads", { params });
    if (Array.isArray(r.data)) {
      return { items: r.data, total: null };
    }
    return { items: r.data.items, total: r.data.total };
  },
  get: (id: number) =>
    apiClient.get<Lead>(`/leads/${id}`).then((r) => r.data),
  create: (body: LeadCreate) =>
    apiClient.post<Lead>("/leads", body).then((r) => r.data),
  update: (id: number, body: LeadUpdate) =>
    apiClient.patch<Lead>(`/leads/${id}`, body).then((r) => r.data),
  remove: (id: number) =>
    apiClient.delete<void>(`/leads/${id}`).then((r) => r.data),
  importCsv: (campaignId: number, file: File) => {
    const form = new FormData();
    form.set("campaign_id", String(campaignId));
    form.set("file", file);
    return apiClient
      .post<LeadImportSummary>("/leads/import", form, {
        headers: { "Content-Type": "multipart/form-data" },
        timeout: 5 * 60 * 1000,
      })
      .then((r) => r.data);
  },
};
