import apiClient from "@/api/client";
import type { PaginatedResponse, RoleKind } from "@/types/campaign";
import type { RoleConfig, RoleConfigCreate, RoleConfigUpdate } from "@/types/config";

export const roleConfigsApi = {
  list: async (params: { campaign_id?: number; kind?: RoleKind } = {}): Promise<RoleConfig[]> => {
    const r = await apiClient.get<PaginatedResponse<RoleConfig>>("/role-configs", {
      params: { ...params, page_size: 200 },
    });
    return r.data.items;
  },
  get: (id: number) =>
    apiClient.get<RoleConfig>(`/role-configs/${id}`).then((r) => r.data),
  create: (body: RoleConfigCreate) =>
    apiClient.post<RoleConfig>("/role-configs", body).then((r) => r.data),
  update: (id: number, body: RoleConfigUpdate) =>
    apiClient.patch<RoleConfig>(`/role-configs/${id}`, body).then((r) => r.data),
  remove: (id: number) =>
    apiClient.delete<void>(`/role-configs/${id}`).then((r) => r.data),
};
