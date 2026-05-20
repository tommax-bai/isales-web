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
      <template #title>Backend storage pending</template>
      <template #default>
        当前 provider_credential 表与 HTTP 端点均未实现；本视图先把 API key 暂存在浏览器
        localStorage，方便先把工作流跑通。实际生产环境下，API key 仍由 env 文件下发；
        见 design.md Open Q §2。
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
          <el-form-item label="API key">
            <div class="key-row">
              <el-input
                v-model="data[p.id].api_key"
                :type="reveal[p.id] ? 'text' : 'password'"
                placeholder="sk-..."
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
          <el-form-item v-if="p.id === 'openai'" label="org id">
            <el-input
              v-model="data[p.id].org_id"
              placeholder="org-..."
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

type ProviderId = "openai" | "anthropic" | "azure" | "google";

interface ProviderData {
  enabled: boolean;
  api_key: string;
  endpoint: string;
  org_id?: string;
}

const PROVIDERS: {
  id: ProviderId;
  name: string;
  short: string;
  color: string;
  hint: string;
  default_endpoint: string;
  docs: string;
}[] = [
  {
    id: "openai",
    name: "OpenAI",
    short: "OAI",
    color: "#10a37f",
    hint: "GPT-4o / o-series / 嵌入",
    default_endpoint: "https://api.openai.com/v1",
    docs: "https://platform.openai.com/api-keys",
  },
  {
    id: "anthropic",
    name: "Anthropic",
    short: "A",
    color: "#d97706",
    hint: "Claude Opus / Sonnet / Haiku",
    default_endpoint: "https://api.anthropic.com/v1",
    docs: "https://console.anthropic.com/settings/keys",
  },
  {
    id: "azure",
    name: "Azure OpenAI",
    short: "Az",
    color: "#0078d4",
    hint: "Azure 托管的 GPT 模型",
    default_endpoint: "https://<resource>.openai.azure.com",
    docs: "https://portal.azure.com/",
  },
  {
    id: "google",
    name: "Google",
    short: "G",
    color: "#4285f4",
    hint: "Gemini 系列",
    default_endpoint: "https://generativelanguage.googleapis.com/v1beta",
    docs: "https://aistudio.google.com/apikey",
  },
];

const stash = useLocalConfigStash<Record<ProviderId, ProviderData>>(
  "model-providers",
  () => ({
    openai: { enabled: false, api_key: "", endpoint: "", org_id: "" },
    anthropic: { enabled: false, api_key: "", endpoint: "" },
    azure: { enabled: false, api_key: "", endpoint: "" },
    google: { enabled: false, api_key: "", endpoint: "" },
  }),
);

const data = stash.value;
const reveal = reactive<Record<ProviderId, boolean>>({
  openai: false,
  anthropic: false,
  azure: false,
  google: false,
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
  gap: 16px;
  padding-bottom: 80px;
}
.mp__banner {
  margin-bottom: 8px;
}
.mp__grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(360px, 1fr));
  gap: 16px;
}
.provider {
  background: var(--isales-card);
  border: 1px solid var(--isales-border);
  border-radius: var(--isales-radius);
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.provider__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}
.provider__brand {
  display: flex;
  align-items: center;
  gap: 10px;
}
.provider__logo {
  width: 36px;
  height: 36px;
  border-radius: var(--isales-radius);
  color: white;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-weight: var(--isales-font-weight-bold);
  font-size: 13px;
}
.provider__name {
  margin: 0;
  font-size: 15px;
  font-weight: var(--isales-font-weight-bold);
}
.provider__hint {
  margin: 2px 0 0;
  font-size: 12px;
  color: var(--isales-muted-foreground);
}
.provider__body {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.key-row {
  display: flex;
  gap: 8px;
  width: 100%;
}
.key-row > .el-input {
  flex: 1;
}
.key-mask {
  margin: 4px 0 0;
  font-size: 12px;
  color: var(--isales-muted-foreground);
  font-family: ui-monospace, monospace;
}
.provider__doc {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: var(--isales-primary);
  text-decoration: none;
  margin-top: 4px;
}
.provider__doc:hover {
  text-decoration: underline;
}
.save-bar {
  position: sticky;
  bottom: 16px;
  margin-top: 16px;
  background: var(--isales-card);
  border: 1px solid var(--isales-border);
  border-radius: var(--isales-radius);
  padding: 12px 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  box-shadow: var(--isales-shadow-md);
}
.save-bar__hint {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--isales-muted-foreground);
}
</style>
