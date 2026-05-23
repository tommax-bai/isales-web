<template>
  <section class="mp">
    <PageHeader
      title="模型厂商"
      subtitle="LLM 厂商 API key 与 endpoint 管理。"
      :icon="Key"
      icon-color="primary"
    />

    <el-alert
      :closable="false"
      type="warning"
      show-icon
      class="mp__banner"
    >
      <template #title>厂商列表（已对接 + 占位）</template>
      <template #default>
        <strong>已对接（isales-engine factory 实装）</strong>：volcengine
        (火山方舟 / 豆包，app_key + app_token 同时供 LLM / ASR / TTS) +
        openai (LLM)。<strong>占位（待 engine 对接）</strong>：dashscope
        (阿里通义千问，DashScope OpenAI-兼容模式)。占位卡 API key 仅存浏览
        器；要真正能跑需在 isales-engine 加 provider 并把 dashscope 进
        KNOWN_LLM_PROVIDERS（走 OpenSpec）。provider_credential 表与 HTTP
        CRUD 端点也未实现，生产 key 仍由 env 文件下发（design.md Open Q §2）。
      </template>
    </el-alert>

    <div class="mp__grid">
      <article v-for="p in PROVIDERS" :key="p.id" class="provider">
        <header class="provider__head">
          <div class="provider__brand">
            <span class="provider__logo" :style="{ background: p.color }">
              {{ p.short }}
            </span>
            <div>
              <h3 class="provider__name">{{ p.name }}</h3>
              <p class="provider__hint">{{ p.hint }}</p>
            </div>
          </div>
          <StatusBadge :color="statusColor(p.id)">
            {{ statusLabel(p.id) }}
          </StatusBadge>
        </header>

        <div class="provider__body">
          <el-form-item label="启用">
            <el-switch v-model="data[p.id].enabled" />
          </el-form-item>
          <!-- volcengine 是 app_key + app_token 双密钥；这里 api_key 字段
               承载 app_token（env 里 ISALES_VOLCENGINE_APP_TOKEN）。 -->
          <el-form-item v-if="p.id === 'volcengine'" label="app key">
            <el-input
              v-model="data[p.id].app_key"
              placeholder="ISALES_VOLCENGINE_APP_KEY（也用于 ASR/TTS 鉴权）"
            />
          </el-form-item>
          <el-form-item :label="p.id === 'volcengine' ? 'app token' : 'API key'">
            <div class="key-row">
              <el-input
                v-model="data[p.id].api_key"
                :type="reveal[p.id] ? 'text' : 'password'"
                :placeholder="p.id === 'volcengine' ? 'ISALES_VOLCENGINE_APP_TOKEN' : 'sk-...'"
                clearable
              />
              <el-button @click="reveal[p.id] = !reveal[p.id]">
                <component :is="reveal[p.id] ? EyeOff : Eye" :size="14" />
              </el-button>
            </div>
            <p v-if="data[p.id].api_key" class="key-mask">
              {{ maskedKey(data[p.id].api_key) }}
            </p>
          </el-form-item>
          <el-form-item label="endpoint">
            <el-input
              v-model="data[p.id].endpoint"
              :placeholder="p.default_endpoint"
            />
          </el-form-item>
          <el-form-item label="默认 model">
            <el-input
              v-model="data[p.id].default_model"
              :placeholder="p.default_model"
            />
          </el-form-item>
          <a class="provider__doc" :href="p.docs" target="_blank" rel="noopener">
            <ExternalLink :size="12" />
            获取 API key
          </a>
        </div>
      </article>
    </div>

    <div class="save-bar">
      <span class="save-bar__hint">
        <Save :size="14" />
        当前 API key 仅存浏览器，刷新后保留；生产 key 仍走 env 文件下发。
      </span>
      <el-button type="primary" @click="onSave">
        <Save :size="14" style="margin-right: 4px" />
        保存
      </el-button>
    </div>
  </section>
</template>

<script setup lang="ts">
import { ElMessage } from "element-plus";
import { ExternalLink, Eye, EyeOff, Key, Save } from "lucide-vue-next";
import { computed, reactive } from "vue";

import PageHeader from "@/components/Common/PageHeader.vue";
import StatusBadge from "@/components/Common/StatusBadge.vue";
import { useLocalConfigStash } from "@/composables/useLocalConfigStash";
import {
  BACKEND_IMPLEMENTED,
  LLM_PROVIDER_DEFAULT_ENDPOINT,
  LLM_PROVIDER_DEFAULT_MODEL,
  LLM_PROVIDER_IDS,
  LLM_PROVIDER_LABEL,
  type LLMProviderId,
} from "@/types/llmProviders";

// 厂商列表对齐 SSOT `@/types/llmProviders` (LLM_PROVIDER_IDS) — 已对接
// (factory.KNOWN_LLM_PROVIDERS = volcengine + openai) + 占位 (dashscope =
// 阿里通义千问，待 engine 加 provider 后晋升为已对接)。`mock` 走代码 stub
// 不需 API key 不在此列。增减 provider 改 SSOT 而不是这里。
type ProviderId = LLMProviderId;

interface ProviderData {
  enabled: boolean;
  api_key: string;
  endpoint: string;
  app_key?: string; // volcengine 专用 (app_key + app_token 双密钥)
  default_model?: string;
}

// 仅本 view 用的「视觉 / 文案」扩展（logo 缩写 / 颜色 / hint / 外链）。
// 共享元数据 (label / default_model / default_endpoint) 走 SSOT。
const PROVIDER_PRESENTATION: Record<
  ProviderId,
  { short: string; color: string; hint: string; docs: string }
> = {
  volcengine: {
    short: "豆包",
    color: "#d33d3d",
    hint: "Doubao 系列 / 同时供 ASR + TTS（共用 app_key + app_token）",
    docs: "https://console.volcengine.com/ark",
  },
  openai: {
    short: "OAI",
    color: "#10a37f",
    hint: "GPT-4o / o-series 等",
    docs: "https://platform.openai.com/api-keys",
  },
  dashscope: {
    short: "通义",
    color: "#615ced",
    hint: "Qwen 系列 / OpenAI 兼容模式 — 占位，engine 未对接",
    docs: "https://bailian.console.aliyun.com/?apiKey=1",
  },
};

const PROVIDERS = LLM_PROVIDER_IDS.map((id) => ({
  id,
  name: LLM_PROVIDER_LABEL[id],
  short: PROVIDER_PRESENTATION[id].short,
  color: PROVIDER_PRESENTATION[id].color,
  hint: PROVIDER_PRESENTATION[id].hint,
  default_endpoint: LLM_PROVIDER_DEFAULT_ENDPOINT[id],
  default_model: LLM_PROVIDER_DEFAULT_MODEL[id],
  docs: PROVIDER_PRESENTATION[id].docs,
  implemented: BACKEND_IMPLEMENTED.has(id),
}));

// `model-providers-v3` — bump from v2 (volcengine + openai) to add
// dashscope (Aliyun 通义) placeholder. v2 stash without dashscope key
// would crash on `data.dashscope.enabled` after this change.
const stash = useLocalConfigStash<Record<ProviderId, ProviderData>>(
  "model-providers-v3",
  () =>
    Object.fromEntries(
      LLM_PROVIDER_IDS.map((id) => [
        id,
        {
          enabled: false,
          api_key: "",
          ...(id === "volcengine" ? { app_key: "" } : {}),
          endpoint: LLM_PROVIDER_DEFAULT_ENDPOINT[id],
          default_model: LLM_PROVIDER_DEFAULT_MODEL[id],
        },
      ]),
    ) as Record<ProviderId, ProviderData>,
);

const data = stash.value;
const reveal = reactive<Record<ProviderId, boolean>>(
  Object.fromEntries(LLM_PROVIDER_IDS.map((id) => [id, false])) as Record<
    ProviderId,
    boolean
  >,
);

function maskedKey(k: string): string {
  if (!k || k.length < 8) return "●●●●●●●●";
  return `${k.slice(0, 4)}●●●●●●●●${k.slice(-4)}`;
}

function statusColor(id: ProviderId): "green" | "gray" | "yellow" {
  if (!data[id].api_key) return "gray";
  if (!data[id].enabled) return "yellow";
  return "green";
}

function statusLabel(id: ProviderId): string {
  if (!data[id].api_key) return "未配置";
  if (!data[id].enabled) return "未启用";
  return "已配置";
}

function onSave() {
  ElMessage.success("已保存到 localStorage");
}
</script>

<style scoped>
.mp {
  display: flex;
  flex-direction: column;
  gap: var(--isales-space-4);
  padding-bottom: 80px;
}
.mp__banner {
  margin-bottom: var(--isales-space-1);
  border-radius: var(--isales-radius-md);
}
.mp__grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
  gap: var(--isales-space-4);
}
.provider {
  background: var(--isales-card);
  border: 1px solid var(--isales-border);
  border-radius: var(--isales-radius);
  padding: var(--isales-space-4);
  display: flex;
  flex-direction: column;
  gap: var(--isales-space-3);
}
.provider__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--isales-space-2);
}
.provider__brand {
  display: flex;
  align-items: center;
  gap: var(--isales-space-3);
  min-width: 0;
}
.provider__logo {
  width: 36px;
  height: 36px;
  border-radius: var(--isales-radius-md);
  color: white;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-weight: var(--isales-font-weight-bold);
  font-size: var(--isales-font-size-sm);
  flex-shrink: 0;
}
.provider__name {
  font-size: var(--isales-font-size-title-3);
  font-weight: var(--isales-font-weight-semibold);
  line-height: var(--isales-line-height-tight);
}
.provider__hint {
  margin-top: 2px;
  font-size: var(--isales-font-size-xs);
  color: var(--isales-muted-foreground);
  line-height: var(--isales-line-height-snug);
}
.provider__body {
  display: flex;
  flex-direction: column;
  gap: var(--isales-space-1);
}
.key-row {
  display: flex;
  gap: var(--isales-space-2);
  width: 100%;
}
.key-row > .el-input {
  flex: 1;
}
.key-mask {
  margin-top: 4px;
  font-size: var(--isales-font-size-xs);
  color: var(--isales-muted-foreground);
  font-family: ui-monospace, monospace;
  letter-spacing: 0.02em;
}
.provider__doc {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: var(--isales-font-size-xs);
  color: var(--isales-primary);
  text-decoration: none;
  margin-top: var(--isales-space-1);
  align-self: flex-start;
}
.provider__doc:hover {
  text-decoration: underline;
}
.save-bar {
  position: sticky;
  bottom: var(--isales-space-4);
  margin-top: var(--isales-space-4);
  background: var(--isales-card);
  border: 1px solid var(--isales-border);
  border-radius: var(--isales-radius);
  padding: var(--isales-space-3) var(--isales-space-4);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--isales-space-3);
  box-shadow: var(--isales-shadow-lg);
}
.save-bar__hint {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: var(--isales-font-size-xs);
  color: var(--isales-muted-foreground);
  line-height: var(--isales-line-height-snug);
}
</style>
