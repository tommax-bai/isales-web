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
      type="info"
      show-icon
      class="mp__banner"
    >
      <template #title>凭据已 DB 落库（Fernet 加密）</template>
      <template #default>
        填写后 SHALL 通过 `/api/provider-credentials` 写入服务端
        `provider_credential` 表 (Fernet 对称加密)。<strong>已对接</strong>
        (engine factory 实装): volcengine (火山方舟 / 豆包，app_key +
        app_token 同时供 LLM / ASR / TTS) + dashscope (阿里通义千问，
        OpenAI 兼容模式，LLM)。改动 key 后需重启 `isales-engine` 才生效
        (v1.0 不支持 live reload；点保存后服务端会 log 提示)。已配置字段
        以 `xxxx********yyyy` 掩码显示，UI 永不回显明文；要换 key 整段重输。
      </template>
    </el-alert>

    <div v-if="loading" class="mp__loading">
      <el-skeleton :rows="6" animated />
    </div>

    <div v-else class="mp__grid">
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
          <el-form-item v-if="p.id === 'volcengine'" label="app key">
            <el-input
              v-model="form[p.id].app_key_input"
              :placeholder="
                serverMasked[p.id].app_key ?? 'ISALES_VOLCENGINE_APP_KEY'
              "
            />
          </el-form-item>
          <el-form-item
            :label="p.id === 'volcengine' ? 'app token' : 'API key'"
          >
            <div class="key-row">
              <el-input
                v-model="form[p.id].api_key_input"
                :type="reveal[p.id] ? 'text' : 'password'"
                :placeholder="
                  serverMasked[p.id].api_key ?? 'sk-…（点保存后掩码会出现）'
                "
                clearable
              />
              <el-button @click="reveal[p.id] = !reveal[p.id]">
                <component :is="reveal[p.id] ? EyeOff : Eye" :size="14" />
              </el-button>
            </div>
          </el-form-item>
          <el-form-item label="endpoint">
            <el-input
              v-model="form[p.id].endpoint_input"
              :placeholder="serverMasked[p.id].endpoint ?? p.default_endpoint"
            />
          </el-form-item>
          <el-form-item label="默认 model">
            <el-input
              v-model="form[p.id].default_model_input"
              :placeholder="
                serverMasked[p.id].default_model ?? p.default_model
              "
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
        仅填写过的字段会写入 DB；空值 = 保持服务端原值不变。保存后请
        <code>systemctl restart isales-engine</code> 让新凭据生效。
      </span>
      <el-button type="primary" :loading="saving" @click="onSave">
        <Save :size="14" style="margin-right: 4px" />
        保存
      </el-button>
    </div>
  </section>
</template>

<script setup lang="ts">
import { ElMessage } from "element-plus";
import { ExternalLink, Eye, EyeOff, Key, Save } from "lucide-vue-next";
import { onMounted, reactive, ref } from "vue";

import { providerCredentialsApi } from "@/api/providerCredentials";
import PageHeader from "@/components/Common/PageHeader.vue";
import StatusBadge from "@/components/Common/StatusBadge.vue";
import type { ProviderCredentialRead } from "@/types/providerCredential";
import {
  BACKEND_IMPLEMENTED,
  LLM_PROVIDER_DEFAULT_ENDPOINT,
  LLM_PROVIDER_DEFAULT_MODEL,
  LLM_PROVIDER_IDS,
  LLM_PROVIDER_LABEL,
  type LLMProviderId,
} from "@/types/llmProviders";

// 厂商列表对齐 SSOT @/types/llmProviders。后端 ALLOWED_PROVIDER_IDS 同步。
type ProviderId = LLMProviderId;

// UI 用 4 个 user input 字段 (api_key / app_key / endpoint / default_model)。
// volcengine 双密钥: api_key 输入框承载 app_token, app_key 单独一行。
interface ProviderForm {
  api_key_input: string;       // dashscope=api_key；volcengine=app_token
  app_key_input: string;       // volcengine 专用
  endpoint_input: string;
  default_model_input: string;
}

// 服务端 masked 值；null = 该字段后端没行。
interface ServerMasked {
  api_key: string | null;
  app_key: string | null;
  endpoint: string | null;
  default_model: string | null;
}

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
  dashscope: {
    short: "通义",
    color: "#615ced",
    hint: "Qwen 系列 / OpenAI 兼容模式",
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

// volcengine 字段映射: api_key_input → app_token, app_key_input → app_key。
// 其他 provider: api_key_input → api_key。
function fieldNameFor(
  provider: ProviderId,
  uiField: "api_key" | "app_key" | "endpoint" | "default_model",
): string {
  if (provider === "volcengine") {
    if (uiField === "api_key") return "app_token";
    if (uiField === "app_key") return "app_key";
  }
  return uiField;
}

const form = reactive<Record<ProviderId, ProviderForm>>(
  Object.fromEntries(
    LLM_PROVIDER_IDS.map((id) => [
      id,
      { api_key_input: "", app_key_input: "", endpoint_input: "", default_model_input: "" },
    ]),
  ) as Record<ProviderId, ProviderForm>,
);

const serverMasked = reactive<Record<ProviderId, ServerMasked>>(
  Object.fromEntries(
    LLM_PROVIDER_IDS.map((id) => [
      id,
      { api_key: null, app_key: null, endpoint: null, default_model: null },
    ]),
  ) as Record<ProviderId, ServerMasked>,
);

const reveal = reactive<Record<ProviderId, boolean>>(
  Object.fromEntries(LLM_PROVIDER_IDS.map((id) => [id, false])) as Record<
    ProviderId,
    boolean
  >,
);

const loading = ref(true);
const saving = ref(false);

function ingestRow(row: ProviderCredentialRead): void {
  const pid = row.provider_id as ProviderId;
  if (!LLM_PROVIDER_IDS.includes(pid)) return;
  const m = serverMasked[pid];
  if (row.field_name === "api_key" || row.field_name === "app_token") {
    m.api_key = row.masked_value;
  } else if (row.field_name === "app_key") {
    m.app_key = row.masked_value;
  } else if (row.field_name === "endpoint") {
    m.endpoint = row.masked_value;
  } else if (row.field_name === "default_model") {
    m.default_model = row.masked_value;
  }
}

async function loadCredentials(): Promise<void> {
  loading.value = true;
  try {
    const rows = await providerCredentialsApi.list();
    // reset server-masked
    for (const pid of LLM_PROVIDER_IDS) {
      serverMasked[pid].api_key = null;
      serverMasked[pid].app_key = null;
      serverMasked[pid].endpoint = null;
      serverMasked[pid].default_model = null;
    }
    rows.forEach(ingestRow);
  } catch (err) {
    ElMessage.error(err instanceof Error ? err.message : "加载凭据失败");
  } finally {
    loading.value = false;
  }
}

function statusColor(id: ProviderId): "green" | "gray" | "yellow" {
  const m = serverMasked[id];
  if (!m.api_key) return "gray";
  return "green";
}

function statusLabel(id: ProviderId): string {
  const m = serverMasked[id];
  if (!m.api_key) return "未配置";
  if (!BACKEND_IMPLEMENTED.has(id)) return "已存（engine 未对接）";
  return "已配置";
}

async function onSave(): Promise<void> {
  saving.value = true;
  let writeCount = 0;
  try {
    for (const id of LLM_PROVIDER_IDS) {
      const f = form[id];
      const writes: { ui: "api_key" | "app_key" | "endpoint" | "default_model"; value: string }[] = [];
      if (f.api_key_input.trim()) writes.push({ ui: "api_key", value: f.api_key_input.trim() });
      if (f.app_key_input.trim() && id === "volcengine")
        writes.push({ ui: "app_key", value: f.app_key_input.trim() });
      if (f.endpoint_input.trim()) writes.push({ ui: "endpoint", value: f.endpoint_input.trim() });
      if (f.default_model_input.trim())
        writes.push({ ui: "default_model", value: f.default_model_input.trim() });

      for (const w of writes) {
        await providerCredentialsApi.upsert({
          provider_id: id,
          field_name: fieldNameFor(id, w.ui),
          plaintext_value: w.value,
        });
        writeCount++;
      }

      // 清空 input (避免再次提交)
      f.api_key_input = "";
      f.app_key_input = "";
      f.endpoint_input = "";
      f.default_model_input = "";
    }

    if (writeCount === 0) {
      ElMessage.info("没有可保存的字段（输入框都为空）");
    } else {
      // 提示运维 / log reload-required；不阻塞
      try {
        await providerCredentialsApi.reloadHint();
      } catch {
        // ignore — hint 失败不影响主路径
      }
      ElMessage.success(
        `已保存 ${writeCount} 个字段。重启 isales-engine 让新凭据生效。`,
      );
      await loadCredentials();  // 刷新 masked
    }
  } catch (err) {
    ElMessage.error(err instanceof Error ? err.message : "保存失败");
  } finally {
    saving.value = false;
  }
}

onMounted(() => {
  // 清理旧 localStorage 残留 (v1/v2/v3 全清；本 change 起 UI 不再写)
  for (const key of ["model-providers-v1", "model-providers-v2", "model-providers-v3"]) {
    try {
      localStorage.removeItem(key);
    } catch {
      /* ignore */
    }
  }
  void loadCredentials();
});
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
.mp__loading {
  padding: var(--isales-space-6);
  background: var(--isales-card);
  border: 1px solid var(--isales-border);
  border-radius: var(--isales-radius);
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
