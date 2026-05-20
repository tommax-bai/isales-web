<template>
  <section class="vc">
    <PageHeader
      title="ASR / TTS 通路"
      subtitle="语音识别 / 合成 / 音色库的供应商接入与启停。"
      :icon="Waves"
      icon-color="primary"
    />

    <el-alert
      :closable="false"
      type="info"
      show-icon
      class="vc__banner"
    >
      <template #title>本视图当前持久化在 localStorage</template>
      <template #default>
        provider-abc 的 HTTP CRUD 端点尚未上线（音色仅 voice_models 已 expose）；接入后此 view 会切换到 API。
      </template>
    </el-alert>

    <!-- ASR -->
    <section class="section">
      <header class="section__head">
        <span class="section__icon" :style="iconStyleBlue">
          <Mic :size="18" />
        </span>
        <h2 class="section__title">ASR 配置</h2>
        <StatusBadge color="blue">{{ asr.length }}</StatusBadge>
        <el-button size="small" type="primary" @click="addAsr">
          <Plus :size="14" style="margin-right: 4px" />
          新增 ASR
        </el-button>
      </header>
      <article v-for="(c, i) in asr" :key="c.id" class="cfg">
        <div class="cfg__row">
          <el-input v-model="c.name" placeholder="配置名称" class="cfg__name" />
          <el-switch v-model="c.enabled" />
          <el-button size="small" plain type="danger" @click="asr.splice(i, 1)">
            <Trash2 :size="14" />
          </el-button>
        </div>
        <div class="cfg__row cfg__row--inline">
          <el-select v-model="c.provider" placeholder="provider">
            <el-option v-for="p in PROVIDERS" :key="p" :label="p" :value="p" />
          </el-select>
          <el-input v-model="c.model" placeholder="model（例如 paraformer-realtime-v2）" />
          <el-input v-model="c.endpoint" placeholder="endpoint URL（可选）" />
        </div>
      </article>
    </section>

    <!-- TTS -->
    <section class="section">
      <header class="section__head">
        <span class="section__icon" :style="iconStyleGreen">
          <Volume2 :size="18" />
        </span>
        <h2 class="section__title">TTS 配置</h2>
        <StatusBadge color="green">{{ tts.length }}</StatusBadge>
        <el-button size="small" type="primary" @click="addTts">
          <Plus :size="14" style="margin-right: 4px" />
          新增 TTS
        </el-button>
      </header>
      <article v-for="(c, i) in tts" :key="c.id" class="cfg">
        <div class="cfg__row">
          <el-input v-model="c.name" placeholder="配置名称" class="cfg__name" />
          <el-switch v-model="c.enabled" />
          <el-button size="small" plain type="danger" @click="tts.splice(i, 1)">
            <Trash2 :size="14" />
          </el-button>
        </div>
        <div class="cfg__row cfg__row--inline">
          <el-select v-model="c.provider" placeholder="provider">
            <el-option v-for="p in PROVIDERS" :key="p" :label="p" :value="p" />
          </el-select>
          <el-input v-model="c.model" placeholder="model" />
          <el-input v-model="c.endpoint" placeholder="endpoint URL（可选）" />
        </div>
      </article>
    </section>

    <!-- 音色库 -->
    <section class="section">
      <header class="section__head">
        <span class="section__icon" :style="iconStylePurple">
          <Music :size="18" />
        </span>
        <h2 class="section__title">音色库</h2>
        <StatusBadge color="purple">{{ voices.length }}</StatusBadge>
        <el-button size="small" type="primary" @click="addVoice">
          <Plus :size="14" style="margin-right: 4px" />
          新增音色
        </el-button>
      </header>
      <article v-for="(v, i) in voices" :key="v.id" class="cfg">
        <div class="cfg__row">
          <el-input v-model="v.name" placeholder="音色名称" class="cfg__name" />
          <el-switch v-model="v.enabled" />
          <el-button size="small" plain type="danger" @click="voices.splice(i, 1)">
            <Trash2 :size="14" />
          </el-button>
        </div>
        <div class="cfg__row cfg__row--inline">
          <el-select v-model="v.provider" placeholder="provider">
            <el-option v-for="p in PROVIDERS" :key="p" :label="p" :value="p" />
          </el-select>
          <el-input v-model="v.voice_id" placeholder="voice_id（例如 xiaolu）" />
          <el-select v-model="v.gender" placeholder="性别">
            <el-option label="女" value="female" />
            <el-option label="男" value="male" />
            <el-option label="中性" value="neutral" />
          </el-select>
          <el-select v-model="v.language" placeholder="语言">
            <el-option label="中文（简体）" value="zh-CN" />
            <el-option label="英文" value="en-US" />
          </el-select>
          <el-input-number
            v-model="v.sample_rate"
            :min="8000"
            :step="8000"
            controls-position="right"
            placeholder="采样率"
          />
        </div>
        <el-input
          v-model="v.description"
          placeholder="音色描述"
          type="textarea"
          :rows="1"
        />
      </article>
    </section>

    <div class="save-bar">
      <span class="save-bar__hint">
        <Save :size="14" />
        配置已暂存浏览器；后端持久化将随 provider-abc CRUD 接入。
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
import { Mic, Music, Plus, Save, Trash2, Volume2, Waves } from "lucide-vue-next";

import PageHeader from "@/components/Common/PageHeader.vue";
import StatusBadge from "@/components/Common/StatusBadge.vue";
import { useLocalConfigStash } from "@/composables/useLocalConfigStash";

interface ASRConfig {
  id: string;
  name: string;
  enabled: boolean;
  provider: string;
  model: string;
  endpoint: string;
}

interface TTSConfig extends ASRConfig {}

interface VoiceConfig {
  id: string;
  name: string;
  enabled: boolean;
  provider: string;
  voice_id: string;
  gender: "male" | "female" | "neutral";
  language: string;
  sample_rate: number;
  description: string;
}

const PROVIDERS = ["aliyun", "azure", "openai", "google"];

const asr = useLocalConfigStash<ASRConfig[]>("vc:asr", () => []);
const tts = useLocalConfigStash<TTSConfig[]>("vc:tts", () => []);
const voices = useLocalConfigStash<VoiceConfig[]>("vc:voices", () => []);

const iconStyleBlue = {
  background: "var(--isales-status-blue-100)",
  color: "var(--isales-status-blue-800)",
};
const iconStyleGreen = {
  background: "var(--isales-status-green-100)",
  color: "var(--isales-status-green-800)",
};
const iconStylePurple = {
  background: "var(--isales-status-purple-100)",
  color: "var(--isales-status-purple-800)",
};

function rid(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}

function addAsr() {
  asr.value.push({
    id: rid("asr"),
    name: "",
    enabled: true,
    provider: "aliyun",
    model: "paraformer-realtime-v2",
    endpoint: "",
  });
}

function addTts() {
  tts.value.push({
    id: rid("tts"),
    name: "",
    enabled: true,
    provider: "aliyun",
    model: "cosyvoice-v1",
    endpoint: "",
  });
}

function addVoice() {
  voices.value.push({
    id: rid("voice"),
    name: "",
    enabled: true,
    provider: "aliyun",
    voice_id: "",
    gender: "female",
    language: "zh-CN",
    sample_rate: 24000,
    description: "",
  });
}

function onSave() {
  ElMessage.success("配置已保存（localStorage）");
}
</script>

<style scoped>
.vc {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding-bottom: 80px;
}
.vc__banner {
  margin-bottom: 8px;
}
.section {
  background: var(--isales-card);
  border: 1px solid var(--isales-border);
  border-radius: var(--isales-radius);
  padding: 16px;
}
.section__head {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 12px;
}
.section__icon {
  width: 36px;
  height: 36px;
  border-radius: var(--isales-radius);
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
.section__title {
  margin: 0;
  font-size: 15px;
  font-weight: var(--isales-font-weight-bold);
  flex: 1;
}
.cfg {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 12px;
  background: var(--isales-muted);
  border-radius: var(--isales-radius);
  margin-bottom: 8px;
}
.cfg__row {
  display: flex;
  align-items: center;
  gap: 8px;
}
.cfg__row--inline {
  flex-wrap: wrap;
}
.cfg__row--inline > * {
  flex: 1 1 180px;
  min-width: 0;
}
.cfg__name {
  flex: 1;
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
