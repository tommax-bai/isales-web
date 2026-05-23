import apiClient from "@/api/client";
import type { VoiceModel } from "@/types/voice";

// v1.0 后端只有 GET /voice-models/{id}/sample (返回 RedirectResponse →
// OSS sample_url)，没有动态 TTS 合成端点。VoicePreview 因此只能播放
// 预录样本，文本输入框已移除。axios 默认 follow 302，所以 ArrayBuffer
// 是 sample 文件的真实 bytes (mp3 / wav，由音色入库时决定 codec)。
// 浏览器用 <Audio> + Blob URL 解码，不再 hand-decode PCM。
export const voiceApi = {
  list: () => apiClient.get<VoiceModel[]>("/voice-models").then((r) => r.data),
  sample: (id: number) =>
    apiClient
      .get<ArrayBuffer>(`/voice-models/${id}/sample`, {
        responseType: "arraybuffer",
      })
      .then((r) => r.data),
};
