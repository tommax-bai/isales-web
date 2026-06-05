import apiClient from "@/api/client";
import type {
  CampaignCreate,
  CampaignDetail,
  CampaignProgress,
  CampaignSummary,
  CampaignUpdate,
  PaginatedResponse,
} from "@/types/campaign";

export const campaignsApi = {
  list: async (params: { page?: number; page_size?: number } = {}) => {
    const r = await apiClient.get<PaginatedResponse<CampaignDetail>>(
      "/campaigns",
      { params },
    );
    // Backend wraps the list in Page<CampaignDetailRead>; return items so
    // callers stay shape-stable.
    return r.data.items;
  },
  listPage: async (params: { page?: number; page_size?: number } = {}) => {
    const r = await apiClient.get<PaginatedResponse<CampaignDetail>>(
      "/campaigns",
      { params },
    );
    return r.data;
  },
  get: (id: number) =>
    apiClient.get<CampaignDetail>(`/campaigns/${id}`).then((r) => r.data),
  create: (body: CampaignCreate) =>
    apiClient
      .post<CampaignDetail>("/campaigns", body)
      .then((r) => r.data) as Promise<CampaignSummary>,
  update: (id: number, body: CampaignUpdate) =>
    apiClient
      .patch<CampaignDetail>(`/campaigns/${id}`, body)
      .then((r) => r.data) as Promise<CampaignSummary>,
  remove: (id: number) =>
    apiClient.delete<void>(`/campaigns/${id}`).then((r) => r.data),
  start: (id: number) =>
    apiClient.post<void>(`/campaigns/${id}/start`).then((r) => r.data),
  pause: (id: number) =>
    apiClient.post<void>(`/campaigns/${id}/pause`).then((r) => r.data),
  progress: (id: number) =>
    apiClient
      .get<CampaignProgress>(`/campaigns/${id}/progress`)
      .then((r) => r.data),
  // Greeting 试听: synthesize the current (possibly unsaved) greeting text +
  // voice on demand and return a browser-playable WAV blob
  // (campaign-greeting-tts-preview). Stateless — no campaign_id.
  ttsPreview: (text: string, voiceId: string) =>
    apiClient
      .post<Blob>(
        "/campaigns/tts-preview",
        { text, voice_id: voiceId },
        { responseType: "blob" },
      )
      .then((r) => r.data),
};
