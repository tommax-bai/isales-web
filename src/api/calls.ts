import apiClient from "@/api/client";
import type { PaginatedResponse } from "@/types/campaign";
import type {
  CallRecordDetail,
  CallRecordSummary,
  CallSummary,
  PipelineTrace,
} from "@/types/call";

export interface CallListParams {
  campaign_id?: number;
  lead_id?: number;
  status?: string;
  page?: number;
  page_size?: number;
}

export interface CallListResponse {
  items: CallRecordSummary[];
  total: number | null;
}

export const callsApi = {
  list: async (params: CallListParams = {}): Promise<CallRecordSummary[]> => {
    const r = await apiClient.get<
      PaginatedResponse<CallRecordSummary> | CallRecordSummary[]
    >("/calls", { params });
    return Array.isArray(r.data) ? r.data : r.data.items;
  },
  listPage: async (params: CallListParams = {}): Promise<CallListResponse> => {
    const r = await apiClient.get<
      PaginatedResponse<CallRecordSummary> | CallRecordSummary[]
    >("/calls", { params });
    if (Array.isArray(r.data)) {
      return { items: r.data, total: null };
    }
    return { items: r.data.items, total: r.data.total };
  },
  get: (id: number) =>
    apiClient.get<CallRecordDetail>(`/calls/${id}`).then((r) => r.data),
  /** Optional endpoint — backend may 404 in early deployments; callers
   * should swallow non-2xx and render a friendly empty state. */
  trace: (id: number) =>
    apiClient
      .get<PipelineTrace>(`/calls/${id}/trace`)
      .then((r) => r.data),
  /** Returns null on 404 (summary not yet written by worker). */
  summary: (id: number): Promise<CallSummary | null> =>
    apiClient
      .get<CallSummary>(`/calls/${id}/summary`)
      .then((r) => r.data)
      .catch(() => null),
};
