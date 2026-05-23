// @reachability-ignore-file: v1.0 后端 callback_configs / callback_logs admin
//   CRUD 未实装 (webhook-callback spec 完整 / isales-api 无 router)；3 个
//   view 已 banner-only 不发请求。本模块保留作为未来 impl-callback-admin-api
//   change 的 API 契约预案；该 change 落地后请删除本注释。
import apiClient from "@/api/client";
import type { CallbackConfig, CallbackLog } from "@/types/callback";

export interface CallbackConfigCreate {
  campaign_id: number;
  name: string;
  url: string;
  method: string;
  trigger: Record<string, unknown>;
  payload_template: string;
  retry_policy: Record<string, unknown>;
  timeout_seconds: number | null;
  enabled: boolean;
}

export type CallbackConfigUpdate = Partial<CallbackConfigCreate>;

export interface CallbackValidatePayload {
  trigger: Record<string, unknown>;
  payload_template: string;
  sample_context?: Record<string, unknown>;
}

export interface CallbackValidateResult {
  trigger_parses: boolean;
  payload_renders: boolean;
  render_output: string | null;
  errors: { field: string; message: string }[];
}

export interface RotateSecretResult {
  secret: string;
}

export const callbackConfigsApi = {
  list: () =>
    apiClient.get<CallbackConfig[]>("/callback-configs").then((r) => r.data),
  get: (id: number) =>
    apiClient.get<CallbackConfig>(`/callback-configs/${id}`).then((r) => r.data),
  create: (body: CallbackConfigCreate) =>
    apiClient.post<CallbackConfig>("/callback-configs", body).then((r) => r.data),
  update: (id: number, body: CallbackConfigUpdate) =>
    apiClient
      .patch<CallbackConfig>(`/callback-configs/${id}`, body)
      .then((r) => r.data),
  remove: (id: number) =>
    apiClient.delete<void>(`/callback-configs/${id}`).then((r) => r.data),
  validate: (body: CallbackValidatePayload) =>
    apiClient
      .post<CallbackValidateResult>("/callback-configs/validate", body)
      .then((r) => r.data),
  rotateSecret: (id: number) =>
    apiClient
      .post<RotateSecretResult>(`/callback-configs/${id}/rotate-secret`)
      .then((r) => r.data),
};

export const callbackLogsApi = {
  list: (params: { config_id?: number; status?: string; limit?: number } = {}) =>
    apiClient
      .get<CallbackLog[]>("/callback-logs", { params })
      .then((r) => r.data),
};
