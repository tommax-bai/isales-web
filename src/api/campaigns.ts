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

/** Map a /campaigns/tts-preview failure to a user-readable 试听 error message. */
export function ttsPreviewError(e: unknown): string {
  const status = (e as { response?: { status?: number } } | null)?.response?.status;
  if (status === 400) {
    // 400 = invalid voice id / over-long text (tts_invalid_voice_or_text /
    // tts_credential_not_configured) — the input is the likely culprit.
    return "音色 ID 无效或文案过长，请确认音色 ID（如 zh_female_xiaohe_uranus_bigtts）";
  }
  return "试听失败，请稍后重试";
}
