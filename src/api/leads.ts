import apiClient from "@/api/client";
import type {
  Lead,
  LeadCreate,
  LeadImportSummary,
  LeadListParams,
  LeadUpdate,
} from "@/types/lead";

export const leadsApi = {
  list: (params: LeadListParams = {}) =>
    apiClient.get<Lead[]>("/leads", { params }).then((r) => r.data),
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
