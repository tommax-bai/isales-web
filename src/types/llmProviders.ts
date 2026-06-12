// LLM provider 单一事实来源 (SSOT)。增删 / 重命名时改这里一处，所有
// 模型/厂商选择 UI 同步：ModelProviderConfig (顶部「模型厂商」配置 view)
// + PromptTierEditor (campaign 详情的 prompt 编辑器，调 role_config
// + prompt_version)。
//
// 对齐目标：isales-engine `providers/factory.py::KNOWN_LLM_PROVIDERS` 中
// **需要凭据的真实 provider**。engine 的 `mock` 是测试 / dev provider
// (经 ISALES_ENGINE_LLM_PROVIDER env 配置)，无凭据可填、选中即把真活动
// 配成假 LLM，故**不**出现在任何 UI 选择器里。
// 当 engine 加新真 provider (e.g. 又一家 OpenAI 兼容厂商) 时，**先**走
// OpenSpec change 在 engine 加 build_llm() 分支并把名字进
// KNOWN_LLM_PROVIDERS，**然后**才在这里 promote。

export const LLM_PROVIDER_IDS = ["volcengine", "dashscope"] as const;
export type LLMProviderId = (typeof LLM_PROVIDER_IDS)[number];

/** engine factory.KNOWN_LLM_PROVIDERS 已实装的真实 provider 集合 (用于 banner / 状态徽标)。 */
export const BACKEND_IMPLEMENTED: ReadonlySet<LLMProviderId> = new Set([
  "volcengine",
  "dashscope",
]);

// volcengine 这里专指火山方舟 Ark 大模型 (LLM);豆包语音 ASR/TTS 是另一条
// 产品线 provider_id `volcengine_speech`,见 @/types/speechProviders。
export const LLM_PROVIDER_LABEL: Record<LLMProviderId, string> = {
  volcengine: "火山方舟（豆包大模型）",
  dashscope: "阿里通义（DashScope）",
};

export const LLM_PROVIDER_DEFAULT_MODEL: Record<LLMProviderId, string> = {
  volcengine: "doubao-pro-32k",
  dashscope: "qwen-plus",
};

export const LLM_PROVIDER_DEFAULT_ENDPOINT: Record<LLMProviderId, string> = {
  volcengine: "https://ark.cn-beijing.volces.com/api/v3",
  dashscope: "https://dashscope.aliyuncs.com/compatible-mode/v1",
};
