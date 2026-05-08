import apiClient from "@/api/client";
import type { PaginatedResponse } from "@/types/campaign";
import type {
  CallRecordDetail,
  CallRecordSummary,
  PipelineTrace,
} from "@/types/call";

export interface CallListParams {
  campaign_id?: number;
  lead_id?: number;
  status?: string;
  page?: number;
  page_size?: number;
}

export const callsApi = {
  list: async (params: CallListParams = {}): Promise<CallRecordSummary[]> => {
    const r = await apiClient.get<
      PaginatedResponse<CallRecordSummary> | CallRecordSummary[]
    >("/calls", { params });
    return Array.isArray(r.data) ? r.data : r.data.items;
  },
  get: (id: number) =>
    apiClient.get<CallRecordDetail>(`/calls/${id}`).then((r) => r.data),
  /** Optional endpoint — backend may 404 in early deployments; callers
   * should swallow non-2xx and render a friendly empty state. */
  trace: (id: number) =>
    apiClient
      .get<PipelineTrace>(`/calls/${id}/trace`)
      .then((r) => r.data),
};
