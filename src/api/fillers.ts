import apiClient from "@/api/client";
import type { PaginatedResponse } from "@/types/campaign";
import type {
  FillerPhrase,
  FillerPhraseCreate,
  FillerPhraseUpdate,
} from "@/types/config";

// filler_phrase 直挂 campaign（filler-single-pool）：单池扁平列表，按 campaign_id
// 增删改，无「组」概念。
export const fillersApi = {
  list: async (campaignId: number): Promise<FillerPhrase[]> => {
    const r = await apiClient.get<PaginatedResponse<FillerPhrase>>(
      "/filler-phrases",
      { params: { campaign_id: campaignId, page_size: 200 } },
    );
    return r.data.items;
  },
  create: (body: FillerPhraseCreate) =>
    apiClient.post<FillerPhrase>("/filler-phrases", body).then((r) => r.data),
  update: (phraseId: number, body: FillerPhraseUpdate) =>
    apiClient
      .patch<FillerPhrase>(`/filler-phrases/${phraseId}`, body)
      .then((r) => r.data),
  remove: (phraseId: number) =>
    apiClient.delete<void>(`/filler-phrases/${phraseId}`).then((r) => r.data),
};
