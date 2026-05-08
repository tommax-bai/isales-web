import apiClient from "@/api/client";
import type { CallRecordDetail, CallRecordSummary } from "@/types/call";

export interface CallListParams {
  campaign_id?: number;
  lead_id?: number;
  hangup_cause?: string;
  start?: string;
  end?: string;
  limit?: number;
  offset?: number;
}

export const callsApi = {
  list: (params: CallListParams = {}) =>
    apiClient.get<CallRecordSummary[]>("/calls", { params }).then((r) => r.data),
  get: (id: number) =>
    apiClient.get<CallRecordDetail>(`/calls/${id}`).then((r) => r.data),
};
