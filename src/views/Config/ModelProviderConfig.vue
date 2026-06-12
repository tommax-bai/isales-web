<template>
  <section class="mp">
    <PageHeader
      title="模型与语音服务"
      subtitle="LLM 模型厂商与 ASR/TTS 语音服务的 API key / endpoint 管理。"
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
        填写后通过 <code>/api/provider-credentials</code> 写入服务端
        <code>provider_credential</code> 表（Fernet 对称加密）。火山是
        <strong>两条独立产品线、两套独立密钥</strong>：<strong>火山方舟（豆包大模型）</strong>
        是 LLM，<strong>豆包语音（OpenSpeech）</strong>是 ASR/TTS，密钥各填各的、不可混用。
        改动 key 后需重启 <code>isales-engine</code> 才生效（v1.0 不支持 live reload）。
        已配置字段以 <code>xxxx********yyyy</code> 掩码显示，UI 永不回显明文；要换 key 整段重输。
      </template>
    </el-alert>

    <div v-if="loading" class="mp__loading">
      <el-skeleton :rows="6" animated />
    </div>

    <template v-else>
      <div
        v-for="group in GROUPS"
        :key="group.title"
        class="mp__section"
      >
        <header class="mp__section-head">
          <h2 class="mp__section-title">{{ group.title }}</h2>
          <p class="mp__section-sub">{{ group.subtitle }}</p>
        </header>

        <div class="mp__grid">
          <article v-for="card in group.cards" :key="card.id" class="provider">
            <header class="provider__head">
              <div class="provider__brand">
                <span class="provider__logo" :style="{ background: card.color }">
                  {{ card.short }}
                </span>
                <div>
                  <h3 class="provider__name">{{ card.name }}</h3>
                  <p class="provider__hint">{{ card.hint }}</p>
                </div>
              </div>
              <StatusBadge :color="statusColor(card.id)">
                {{ statusLabel(card.id) }}
              </StatusBadge>
            </header>

            <div class="provider__body">
              <el-form-item
                v-for="field in card.fields"
                :key="field.field_name"
                :label="field.label"
              >
                <div v-if="field.sensitive" class="key-row">
                  <el-input
                    v-model="form[fkey(card.id, field.field_name)]"
                    :type="reveal[fkey(card.id, field.field_name)] ? 'text' : 'password'"
                    :placeholder="
                      serverMasked[fkey(card.id, field.field_name)] ?? field.placeholder
                    "
                    clearable
                  />
                  <el-button
                    @click="
                      reveal[fkey(card.id, field.field_name)] =
                        !reveal[fkey(card.id, field.field_name)]
                    "
                  >
                    <component
                      :is="reveal[fkey(card.id, field.field_name)] ? EyeOff : Eye"
                      :size="14"
                    />
                  </el-button>
                </div>
                <el-input
                  v-else
                  v-model="form[fkey(card.id, field.field_name)]"
                  :placeholder="
                    serverMasked[fkey(card.id, field.field_name)] ?? field.placeholder
                  "
                />
                <p v-if="field.hint" class="provider__field-hint">{{ field.hint }}</p>
              </el-form-item>
              <a
                class="provider__doc"
                :href="card.docs"
                target="_blank"
                rel="noopener"
              >
                <ExternalLink :size="12" />
                获取 {{ card.docLabel }}
              </a>
            </div>
          </article>
        </div>
      </div>
    </template>

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
  LLM_PROVIDER_DEFAULT_ENDPOINT,
  LLM_PROVIDER_DEFAULT_MODEL,
  LLM_PROVIDER_LABEL,
} from "@/types/llmProviders";
import { SPEECH_PROVIDER_LABEL } from "@/types/speechProviders";

// 每个凭据字段的 UI 描述。field_name 直接对齐后端 ALLOWED_FIELD_NAMES;
// 不再有「一个输入框承载另一字段」的复用 —— LLM key 与语音 token 各填各的。
interface CredField {
  field_name: string;
  label: string;
  placeholder: string;
  sensitive?: boolean; // password 输入 + reveal 切换
  hint?: string;
}

interface CredCard {
  id: string; // provider_id (对齐后端 ALLOWED_PROVIDER_IDS)
  name: string;
  short: string;
  color: string;
  hint: string;
  docs: string;
  docLabel: string;
  fields: CredField[];
}

// ── 模型配置 (LLM provider) ─────────────────────────────────────────────
// 火山方舟 Ark = 豆包大模型,持独立 ark API Key (与豆包语音的 X-Api-Key 不同)。
const LLM_CARDS: CredCard[] = [
  {
    id: "volcengine",
    name: LLM_PROVIDER_LABEL.volcengine,
    short: "方舟",
    color: "#d33d3d",
    hint: "Doubao 大模型 / 火山方舟 Ark（仅 LLM，语音另填）",
    docs: "https://console.volcengine.com/ark",
    docLabel: "ark API key",
    fields: [
      {
        field_name: "api_key",
        label: "ark API key",
        placeholder: "ark UUID（如 82989d4d-…）",
        sensitive: true,
      },
      {
        field_name: "endpoint",
        label: "endpoint",
        placeholder: LLM_PROVIDER_DEFAULT_ENDPOINT.volcengine,
      },
      {
        field_name: "default_model",
        label: "默认 model",
        placeholder: LLM_PROVIDER_DEFAULT_MODEL.volcengine,
        hint: "ark 需带版本模型 ID 或接入点 ep-xxx；裸 doubao-pro-32k 会 404。",
      },
    ],
  },
  {
    id: "dashscope",
    name: LLM_PROVIDER_LABEL.dashscope,
    short: "通义",
    color: "#615ced",
    hint: "Qwen 系列 / OpenAI 兼容模式（LLM）",
    docs: "https://bailian.console.aliyun.com/?apiKey=1",
    docLabel: "API key",
    fields: [
      {
        field_name: "api_key",
        label: "API key",
        placeholder: "sk-…（点保存后掩码会出现）",
        sensitive: true,
      },
      {
        field_name: "endpoint",
        label: "endpoint",
        placeholder: LLM_PROVIDER_DEFAULT_ENDPOINT.dashscope,
      },
      {
        field_name: "default_model",
        label: "默认 model",
        placeholder: LLM_PROVIDER_DEFAULT_MODEL.dashscope,
      },
    ],
  },
];

// ── 语音服务配置 (ASR/TTS provider) ─────────────────────────────────────
// 豆包语音 = 火山 OpenSpeech,新版控制台单 X-Api-Key / 旧版 app_key+app_token
// 三件套两种鉴权都支持 (engine build_volcengine_tts / VolcengineASRProvider
// 优先 api_key、降级 app_key+app_token)。
const SPEECH_CARDS: CredCard[] = [
  {
    id: "volcengine_speech",
    name: SPEECH_PROVIDER_LABEL.volcengine_speech,
    short: "语音",
    color: "#d3823d",
    hint: "ASR + TTS（引擎进程级全局，非 per-campaign）",
    docs: "https://console.volcengine.com/speech",
    docLabel: "语音 API 鉴权信息",
    fields: [
      {
        field_name: "api_key",
        label: "API key（新版控制台 X-Api-Key）",
        placeholder: "X-Api-Key UUID（新版控制台优先）",
        sensitive: true,
      },
      {
        field_name: "app_key",
        label: "app key（旧版控制台）",
        placeholder: "App ID（旧版三件套，可留空）",
      },
      {
        field_name: "app_token",
        label: "app token（旧版控制台）",
        placeholder: "Access Token（旧版三件套，可留空）",
        sensitive: true,
      },
      {
        field_name: "tts_resource_id",
        label: "TTS resource id",
        placeholder: "seed-tts-2.0（默认）",
      },
    ],
  },
];

const GROUPS = [
  {
    title: "模型配置",
    subtitle: "对话 / 决策 / 抽取所用的 LLM 厂商。各厂商持自己的 API key。",
    cards: LLM_CARDS,
  },
  {
    title: "语音服务配置",
    subtitle: "通话语音识别 (ASR) 与合成 (TTS) 所用的语音厂商。",
    cards: SPEECH_CARDS,
  },
];

const ALL_CARDS: CredCard[] = [...LLM_CARDS, ...SPEECH_CARDS];

// 已知 (provider_id, field_name) 全集 —— 只 ingest 属于本页卡片的行。
function fkey(providerId: string, fieldName: string): string {
  return `${providerId}.${fieldName}`;
}

function buildKeys(): string[] {
  const keys: string[] = [];
  for (const card of ALL_CARDS) {
    for (const field of card.fields) keys.push(fkey(card.id, field.field_name));
  }
  return keys;
}

const ALL_KEYS = buildKeys();
const SENSITIVE_KEYS = new Set(
  ALL_CARDS.flatMap((c) =>
    c.fields.filter((f) => f.sensitive).map((f) => fkey(c.id, f.field_name)),
  ),
);

// form: 用户输入的明文 (上送后清空);serverMasked: 服务端掩码 (null=无行)。
const form = reactive<Record<string, string>>(
  Object.fromEntries(ALL_KEYS.map((k) => [k, ""])),
);
const serverMasked = reactive<Record<string, string | null>>(
  Object.fromEntries(ALL_KEYS.map((k) => [k, null])),
);
const reveal = reactive<Record<string, boolean>>(
  Object.fromEntries([...SENSITIVE_KEYS].map((k) => [k, false])),
);

const loading = ref(true);
const saving = ref(false);

function ingestRow(row: ProviderCredentialRead): void {
  const k = fkey(row.provider_id, row.field_name);
  if (k in serverMasked) serverMasked[k] = row.masked_value;
}

async function loadCredentials(): Promise<void> {
  loading.value = true;
  try {
    const rows = await providerCredentialsApi.list();
    for (const k of ALL_KEYS) serverMasked[k] = null;
    rows.forEach(ingestRow);
  } catch (err) {
    ElMessage.error(err instanceof Error ? err.message : "加载凭据失败");
  } finally {
    loading.value = false;
  }
}

// 卡片视作「已配置」= 它的任一字段在服务端有掩码值。
function isConfigured(cardId: string): boolean {
  const card = ALL_CARDS.find((c) => c.id === cardId);
  if (!card) return false;
  return card.fields.some((f) => serverMasked[fkey(cardId, f.field_name)]);
}

function statusColor(cardId: string): "green" | "gray" {
  return isConfigured(cardId) ? "green" : "gray";
}

function statusLabel(cardId: string): string {
  return isConfigured(cardId) ? "已配置" : "未配置";
}

async function onSave(): Promise<void> {
  saving.value = true;
  let writeCount = 0;
  try {
    for (const card of ALL_CARDS) {
      for (const field of card.fields) {
        const k = fkey(card.id, field.field_name);
        const value = form[k].trim();
        if (!value) continue;
        await providerCredentialsApi.upsert({
          provider_id: card.id,
          field_name: field.field_name,
          plaintext_value: value,
        });
        writeCount++;
        form[k] = ""; // 清空避免重复提交
      }
    }

    if (writeCount === 0) {
      ElMessage.info("没有可保存的字段（输入框都为空）");
    } else {
      try {
        await providerCredentialsApi.reloadHint();
      } catch {
        // ignore — hint 失败不影响主路径
      }
      ElMessage.success(
        `已保存 ${writeCount} 个字段。重启 isales-engine 让新凭据生效。`,
      );
      await loadCredentials(); // 刷新 masked
    }
  } catch (err) {
    ElMessage.error(err instanceof Error ? err.message : "保存失败");
  } finally {
    saving.value = false;
  }
}

onMounted(() => {
  // 清理旧 localStorage 残留 (v1/v2/v3 全清;本 change 起 UI 不再写)
  for (const key of [
    "model-providers-v1",
    "model-providers-v2",
    "model-providers-v3",
  ]) {
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
.mp__section {
  display: flex;
  flex-direction: column;
  gap: var(--isales-space-3);
}
.mp__section-head {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.mp__section-title {
  font-size: var(--isales-font-size-title-2);
  font-weight: var(--isales-font-weight-semibold);
  line-height: var(--isales-line-height-tight);
}
.mp__section-sub {
  font-size: var(--isales-font-size-xs);
  color: var(--isales-muted-foreground);
  line-height: var(--isales-line-height-snug);
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
.provider__field-hint {
  margin-top: 2px;
  font-size: var(--isales-font-size-xs);
  color: var(--isales-muted-foreground);
  line-height: var(--isales-line-height-snug);
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
