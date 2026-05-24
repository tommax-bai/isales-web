import apiClient from "@/api/client";
import type {
  ProviderCredentialRead,
  ProviderCredentialUpsert,
} from "@/types/providerCredential";

// Spec: provider-credential capability § Admin CRUD HTTP 端点。
// 后端 isales-api/routers/provider_credentials.py 实装。response 永远只含
// masked_value (前 4 + 8 个 * + 后 4)；明文仅在 POST upsert request body
// 单向上送，response 不回显。
export const providerCredentialsApi = {
  list: () =>
    apiClient
      .get<ProviderCredentialRead[]>("/provider-credentials")
      .then((r) => r.data),

  listByProvider: (providerId: string) =>
    apiClient
      .get<ProviderCredentialRead[]>(`/provider-credentials/${providerId}`)
      .then((r) => r.data),

  upsert: (body: ProviderCredentialUpsert) =>
    apiClient
      .post<ProviderCredentialRead>("/provider-credentials", body)
      .then((r) => r.data),

  remove: (credId: number) =>
    apiClient.delete<void>(`/provider-credentials/${credId}`).then((r) => r.data),

  reloadHint: () =>
    apiClient
      .post<{ message: string; command: string }>(
        "/provider-credentials/reload-hint",
      )
      .then((r) => r.data),
};
