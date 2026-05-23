// LLM provider 单一事实来源 (SSOT)。增删 / 重命名时改这里一处，所有
// 模型/厂商选择 UI 同步：ModelProviderConfig (顶部「模型厂商」配置 view)
// + PromptTierEditor (campaign 详情的 4-tier prompt 编辑器，调 role_config
// + prompt_version)。
//
// 对齐目标：isales-engine `providers/factory.py::KNOWN_LLM_PROVIDERS`。
// 当 engine 加新 provider (e.g. dashscope) 时，**先**走 OpenSpec change
// 在 engine 加 build_llm() 分支并把名字进 KNOWN_LLM_PROVIDERS，**然后**
// 才在这里 promote 出 BACKEND_IMPLEMENTED；UI 提前列出 placeholder 也行
// 但 ModelProviderConfig banner 要明确标注 "占位待 engine 对接"。

export const LLM_PROVIDER_IDS = ["volcengine", "openai", "dashscope"] as const;
export type LLMProviderId = (typeof LLM_PROVIDER_IDS)[number];

/** engine factory.KNOWN_LLM_PROVIDERS 实装的集合 (用于 banner / 警示)。 */
export const BACKEND_IMPLEMENTED: ReadonlySet<LLMProviderId> = new Set([
  "volcengine",
  "openai",
]);

/** PromptTierEditor 用 — 含 mock，因 mock 是合法 engine provider 名。 */
export const PROVIDER_OPTIONS_WITH_MOCK = [...LLM_PROVIDER_IDS, "mock"] as const;
export type PromptTierProviderId = (typeof PROVIDER_OPTIONS_WITH_MOCK)[number];

export const LLM_PROVIDER_LABEL: Record<PromptTierProviderId, string> = {
  volcengine: "火山方舟（豆包）",
  openai: "OpenAI",
  dashscope: "阿里通义（DashScope）",
  mock: "mock（仅测试）",
};

export const LLM_PROVIDER_DEFAULT_MODEL: Record<PromptTierProviderId, string> = {
  volcengine: "doubao-pro-32k",
  openai: "gpt-4o-mini",
  dashscope: "qwen-plus",
  mock: "mock-llm",
};

export const LLM_PROVIDER_DEFAULT_ENDPOINT: Record<LLMProviderId, string> = {
  volcengine: "https://ark.cn-beijing.volces.com/api/v3",
  openai: "https://api.openai.com/v1",
  dashscope: "https://dashscope.aliyuncs.com/compatible-mode/v1",
};
