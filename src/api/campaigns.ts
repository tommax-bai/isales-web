import apiClient from "@/api/client";
import type {
  CampaignCreate,
  CampaignSummary,
  CampaignUpdate,
} from "@/types/campaign";

export const campaignsApi = {
  list: () =>
    apiClient.get<CampaignSummary[]>("/campaigns").then((r) => r.data),
  get: (id: number) =>
    apiClient.get<CampaignSummary>(`/campaigns/${id}`).then((r) => r.data),
  create: (body: CampaignCreate) =>
    apiClient.post<CampaignSummary>("/campaigns", body).then((r) => r.data),
  update: (id: number, body: CampaignUpdate) =>
    apiClient.patch<CampaignSummary>(`/campaigns/${id}`, body).then((r) => r.data),
  remove: (id: number) =>
    apiClient.delete<void>(`/campaigns/${id}`).then((r) => r.data),
  start: (id: number) =>
    apiClient.post<void>(`/campaigns/${id}/start`).then((r) => r.data),
  pause: (id: number) =>
    apiClient.post<void>(`/campaigns/${id}/pause`).then((r) => r.data),
};
