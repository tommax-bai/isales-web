// 语音 (ASR/TTS) provider 单一事实来源 (SSOT)。与 LLM 厂商 SSOT
// (@/types/llmProviders) **分开定义** —— 火山是两条独立产品线两套独立密钥
// (split-model-and-speech-provider-config): 火山方舟 Ark = LLM (provider_id
// `volcengine`),豆包语音 = ASR/TTS (provider_id `volcengine_speech`)。语音
// 密钥 MUST NOT 与 LLM 密钥混入同一 provider_id 或同一输入框。
//
// 对齐目标:isales-engine `providers/factory.py::KNOWN_ASR_PROVIDERS` /
// `KNOWN_TTS_PROVIDERS` 中需要凭据的真实 provider (当前仅 volcengine_speech;
// `mock` 是测试/dev provider,无凭据可填,不出现在 UI)。

export const SPEECH_PROVIDER_IDS = ["volcengine_speech"] as const;
export type SpeechProviderId = (typeof SPEECH_PROVIDER_IDS)[number];

/** engine factory 已实装的真实语音 provider 集合 (用于状态徽标)。 */
export const SPEECH_BACKEND_IMPLEMENTED: ReadonlySet<SpeechProviderId> = new Set(
  ["volcengine_speech"],
);

export const SPEECH_PROVIDER_LABEL: Record<SpeechProviderId, string> = {
  volcengine_speech: "豆包语音（火山 OpenSpeech）",
};
