import apiClient from "@/api/client";
import type { PaginatedResponse } from "@/types/campaign";
import type {
  FillerPhrase,
  FillerPhraseCreate,
  FillerPhraseUpdate,
  FillerSet,
  FillerSetCreate,
  FillerSetUpdate,
} from "@/types/config";

export const fillersApi = {
  listSets: async (params: { campaign_id?: number } = {}): Promise<FillerSet[]> => {
    const r = await apiClient.get<PaginatedResponse<FillerSet>>("/filler-sets", {
      params: { ...params, page_size: 200 },
    });
    return r.data.items;
  },
  createSet: (body: FillerSetCreate) =>
    apiClient.post<FillerSet>("/filler-sets", body).then((r) => r.data),
  updateSet: (id: number, body: FillerSetUpdate) =>
    apiClient.patch<FillerSet>(`/filler-sets/${id}`, body).then((r) => r.data),
  removeSet: (id: number) =>
    apiClient.delete<void>(`/filler-sets/${id}`).then((r) => r.data),

  listPhrases: (setId: number) =>
    apiClient
      .get<FillerPhrase[]>(`/filler-sets/${setId}/phrases`)
      .then((r) => r.data),
  createPhrase: (setId: number, body: FillerPhraseCreate) =>
    apiClient
      .post<FillerPhrase>(`/filler-sets/${setId}/phrases`, body)
      .then((r) => r.data),
  updatePhrase: (phraseId: number, body: FillerPhraseUpdate) =>
    apiClient
      .patch<FillerPhrase>(`/filler-sets/phrases/${phraseId}`, body)
      .then((r) => r.data),
  removePhrase: (phraseId: number) =>
    apiClient
      .delete<void>(`/filler-sets/phrases/${phraseId}`)
      .then((r) => r.data),
};
