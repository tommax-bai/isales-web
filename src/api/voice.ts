import apiClient from "@/api/client";
import type { VoiceModel } from "@/types/voice";

export const voiceApi = {
  list: () => apiClient.get<VoiceModel[]>("/voice-models").then((r) => r.data),
  preview: (id: number, text: string) =>
    apiClient
      .get<ArrayBuffer>(`/voice-models/${id}/preview`, {
        params: { text },
        responseType: "arraybuffer",
      })
      .then((r) => r.data),
};
