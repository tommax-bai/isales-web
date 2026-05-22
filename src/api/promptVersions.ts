import apiClient from "@/api/client";
import type { PaginatedResponse } from "@/types/campaign";
import type {
  PromptScopeType,
  PromptVersion,
  PromptVersionCreate,
  PromptVersionUpdate,
} from "@/types/config";

export const promptVersionsApi = {
  list: async (
    params: { scope_type?: PromptScopeType; scope_id?: number } = {},
  ): Promise<PromptVersion[]> => {
    const r = await apiClient.get<PaginatedResponse<PromptVersion>>(
      "/prompt-versions",
      { params: { ...params, page_size: 200 } },
    );
    return r.data.items;
  },
  get: (id: number) =>
    apiClient.get<PromptVersion>(`/prompt-versions/${id}`).then((r) => r.data),
  create: (body: PromptVersionCreate) =>
    apiClient.post<PromptVersion>("/prompt-versions", body).then((r) => r.data),
  update: (id: number, body: PromptVersionUpdate) =>
    apiClient
      .patch<PromptVersion>(`/prompt-versions/${id}`, body)
      .then((r) => r.data),
  remove: (id: number) =>
    apiClient.delete<void>(`/prompt-versions/${id}`).then((r) => r.data),
};
