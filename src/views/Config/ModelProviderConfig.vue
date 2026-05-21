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
      <template #title>厂商列表对齐引擎实装</template>
      <template #default>
        当前 isales-engine 已对接 <strong>volcengine</strong> (火山方舟 / 豆包) 与
        <strong>openai</strong> 两家；anthropic / azure / google 暂未对接，故本视图
        不再列出。Volcengine 的 app_key + app_token 同时供 LLM (ark) / ASR / TTS
        三路使用。provider_credential 表与 HTTP CRUD 端点尚未实现，API key 当前
        暂存浏览器；生产环境仍由 env 文件下发（见 design.md Open Q §2）。
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

// 厂商列表对齐 isales-engine factory.KNOWN_LLM_PROVIDERS — v1.0 实装的
// 只有 `volcengine` (火山方舟 / 豆包) 和 `openai`；`mock` 走代码里的
// stub provider，没有 API key 需要配置，所以本视图不暴露。
// Anthropic / Azure / Google 暂未对接引擎，删掉避免误导。
type ProviderId = "volcengine" | "openai";

interface ProviderData {
  enabled: boolean;
  api_key: string;
  endpoint: string;
  app_key?: string; // volcengine 专用 (app_key + app_token 双密钥)
  default_model?: string;
}

const PROVIDERS: {
  id: ProviderId;
  name: string;
  short: string;
  color: string;
  hint: string;
  default_endpoint: string;
  default_model: string;
  docs: string;
}[] = [
  {
    id: "volcengine",
    name: "火山方舟（豆包）",
    short: "豆包",
    color: "#d33d3d",
    hint: "Doubao 系列 / 同时供 ASR + TTS（共用 app_key + app_token）",
    default_endpoint: "https://ark.cn-beijing.volces.com/api/v3",
    default_model: "doubao-pro-32k",
    docs: "https://console.volcengine.com/ark",
  },
  {
    id: "openai",
    name: "OpenAI",
    short: "OAI",
    color: "#10a37f",
    hint: "GPT-4o / o-series 等",
    default_endpoint: "https://api.openai.com/v1",
    default_model: "gpt-4o-mini",
    docs: "https://platform.openai.com/api-keys",
  },
];

// `model-providers-v2` — v1 stash had openai/anthropic/azure/google; this
// view now only ships providers actually wired into isales-engine
// (volcengine + openai), so we bump the key so old data doesn't leak.
const stash = useLocalConfigStash<Record<ProviderId, ProviderData>>(
  "model-providers-v2",
  () => ({
    volcengine: {
      enabled: false,
      api_key: "",
      app_key: "",
      endpoint: "https://ark.cn-beijing.volces.com/api/v3",
      default_model: "doubao-pro-32k",
    },
    openai: {
      enabled: false,
      api_key: "",
      endpoint: "https://api.openai.com/v1",
      default_model: "gpt-4o-mini",
    },
  }),
);

const data = stash.value;
const reveal = reactive<Record<ProviderId, boolean>>({
  volcengine: false,
  openai: false,
});

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
