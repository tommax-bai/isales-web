import apiClient from "@/api/client";
import type { CallbackConfig, CallbackLog } from "@/types/callback";

export const callbackConfigsApi = {
  list: () =>
    apiClient.get<CallbackConfig[]>("/callback-configs").then((r) => r.data),
};

export const callbackLogsApi = {
  list: (params: { config_id?: number; status?: string; limit?: number } = {}) =>
    apiClient
      .get<CallbackLog[]>("/callback-logs", { params })
      .then((r) => r.data),
};
