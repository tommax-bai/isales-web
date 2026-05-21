<template>
  <section class="ai-config">
    <PageHeader
      title="AI 外呼配置"
      subtitle="并行 prompt 策略、通路绑定、可拨时段。"
      :icon="Settings"
      icon-color="primary"
    />

    <el-alert
      :closable="false"
      type="info"
      show-icon
      class="ai-config__banner"
    >
      <template #title>并行执行</template>
      <template #default>
        每个 tier 内可配置 N 条策略；调用时 engine 会并行向所有 enabled 配置发起请求，质量判别选出最佳。
        当前 UI 持久化在浏览器 localStorage —— role_config / prompt_version 的 HTTP CRUD 端点尚未上线，
        见 design.md Open Q §2。
      </template>
    </el-alert>

    <!-- 通路配置（绑定当前激活的 ASR/TTS/音色） -->
    <section class="card">
      <header class="card__head">
        <Waves :size="16" />
        <h3 class="card__title">通路配置</h3>
      </header>
      <div class="card__grid">
        <el-form-item label="ASR">
          <el-select v-model="channels.asr" placeholder="选择 ASR 配置">
            <el-option v-for="id in channelOptions.asr" :key="id" :label="id" :value="id" />
          </el-select>
        </el-form-item>
        <el-form-item label="TTS">
          <el-select v-model="channels.tts" placeholder="选择 TTS 配置">
            <el-option v-for="id in channelOptions.tts" :key="id" :label="id" :value="id" />
          </el-select>
        </el-form-item>
        <el-form-item label="音色">
          <el-select v-model="channels.voice" placeholder="选择音色">
            <el-option v-for="id in channelOptions.voice" :key="id" :label="id" :value="id" />
          </el-select>
        </el-form-item>
      </div>
    </section>

    <!-- 4 个 prompt tier -->
    <PromptConfigList
      title="对话策略"
      description="N 条对话策略 prompt，并行执行后由质量判别选择"
      :icon="MessageSquare"
      badge-color="blue"
      :configs="dialog"
    />
    <PromptConfigList
      title="质量判别"
      description="对每个候选回复打分，得分最高者出列"
      :icon="Target"
      badge-color="purple"
      :configs="judge"
    />
    <PromptConfigList
      title="润色"
      description="对入选回复做风格化打磨"
      :icon="Sparkles"
      badge-color="green"
      :configs="polish"
    />
    <PromptConfigList
      title="垫词"
      description="客户语音空档期播放的过渡语料"
      :icon="Music"
      badge-color="yellow"
      :configs="filler"
    />

    <!-- 时段配置 -->
    <section class="card">
      <header class="card__head">
        <Clock :size="16" />
        <h3 class="card__title">可拨时段</h3>
        <el-button size="small" type="primary" @click="addWindow">
          <Plus :size="14" style="margin-right: 4px" />
          新增时段
        </el-button>
      </header>
      <p v-if="windows.length === 0" class="card__empty">暂未设置时段</p>
      <article v-for="(w, i) in windows" :key="i" class="window">
        <div class="window__time">
          <el-time-select
            v-model="w.start"
            placeholder="开始"
            start="00:00"
            end="23:30"
            step="00:30"
          />
          <span class="window__dash">—</span>
          <el-time-select
            v-model="w.end"
            placeholder="结束"
            start="00:00"
            end="23:30"
            step="00:30"
          />
          <el-button size="small" plain type="danger" @click="removeWindow(i)">
            <Trash2 :size="14" />
          </el-button>
        </div>
        <div class="window__days">
          <el-checkbox-group v-model="w.days">
            <el-checkbox
              v-for="d in WEEKDAYS"
              :key="d.value"
              :value="d.value"
            >
              {{ d.label }}
            </el-checkbox>
          </el-checkbox-group>
        </div>
      </article>
    </section>

    <!-- sticky 保存条 -->
    <div class="save-bar">
      <span class="save-bar__hint">
        <Save :size="14" />
        配置已自动暂存到浏览器；后端持久化将随 role_config CRUD 接入。
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
import {
  Clock,
  MessageSquare,
  Music,
  Plus,
  Save,
  Settings,
  Sparkles,
  Target,
  Trash2,
  Waves,
} from "lucide-vue-next";

import PageHeader from "@/components/Common/PageHeader.vue";
import PromptConfigList, {
  type PromptConfig,
} from "@/components/Config/PromptConfigList.vue";
import { useLocalConfigStash } from "@/composables/useLocalConfigStash";

interface TimeWindow {
  start: string;
  end: string;
  days: number[]; // 1..7 (Mon..Sun)
}

const WEEKDAYS = [
  { value: 1, label: "一" },
  { value: 2, label: "二" },
  { value: 3, label: "三" },
  { value: 4, label: "四" },
  { value: 5, label: "五" },
  { value: 6, label: "六" },
  { value: 7, label: "日" },
];

// 通路 placeholder ID 对齐 isales-engine factory.KNOWN_ASR_PROVIDERS /
// KNOWN_TTS_PROVIDERS — 只有 mock + volcengine 已实装。实际可选的
// 配置 ID 由 VoiceChannelConfig 里的 ASR/TTS/voices 列表决定。
const channelOptions = useLocalConfigStash<{
  asr: string[];
  tts: string[];
  voice: string[];
}>("ai-call:channel-options", () => ({
  asr: ["volcengine-asr-default", "mock-asr-scripted"],
  tts: ["volcengine-tts-default", "mock-tts-fixed-length"],
  voice: ["volcengine-BV001_streaming", "volcengine-zh_female_qingxin"],
}));

const channels = useLocalConfigStash<{
  asr: string;
  tts: string;
  voice: string;
}>("ai-call:channels", () => ({
  asr: channelOptions.value.asr[0] ?? "",
  tts: channelOptions.value.tts[0] ?? "",
  voice: channelOptions.value.voice[0] ?? "",
}));

const dialog = useLocalConfigStash<PromptConfig[]>("ai-call:prompts:dialog", () => []);
const judge = useLocalConfigStash<PromptConfig[]>("ai-call:prompts:judge", () => []);
const polish = useLocalConfigStash<PromptConfig[]>("ai-call:prompts:polish", () => []);
const filler = useLocalConfigStash<PromptConfig[]>("ai-call:prompts:filler", () => []);
const windows = useLocalConfigStash<TimeWindow[]>("ai-call:time-windows", () => []);

function addWindow() {
  windows.value.push({ start: "09:00", end: "21:00", days: [1, 2, 3, 4, 5] });
}

function removeWindow(i: number) {
  windows.value.splice(i, 1);
}

function onSave() {
  // localStorage write is already wired via useLocalConfigStash's deep watcher;
  // this just acknowledges + leaves room for swapping in a real API call later.
  ElMessage.success("配置已保存（localStorage）");
}
</script>

<style scoped>
.ai-config {
  display: flex;
  flex-direction: column;
  gap: var(--isales-space-4);
  padding-bottom: 80px;
}
.ai-config__banner {
  margin-bottom: var(--isales-space-1);
  border-radius: var(--isales-radius-md);
}
.card {
  background: var(--isales-card);
  border: 1px solid var(--isales-border);
  border-radius: var(--isales-radius);
  padding: var(--isales-space-4);
}
.card__head {
  display: flex;
  align-items: center;
  gap: var(--isales-space-2);
  margin-bottom: var(--isales-space-3);
}
.card__title {
  font-size: var(--isales-font-size-title-3);
  font-weight: var(--isales-font-weight-semibold);
  line-height: var(--isales-line-height-tight);
  flex: 1;
}
.card__grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: var(--isales-space-3);
}
.card__empty {
  margin: var(--isales-space-2) 0;
  text-align: center;
  color: var(--isales-muted-foreground);
  font-size: var(--isales-font-size-sm);
}
.window {
  display: flex;
  flex-direction: column;
  gap: var(--isales-space-2);
  padding: var(--isales-space-3);
  background: var(--isales-muted);
  border-radius: var(--isales-radius-md);
  margin-bottom: var(--isales-space-2);
}
.window__time {
  display: flex;
  align-items: center;
  gap: var(--isales-space-2);
}
.window__dash {
  color: var(--isales-muted-foreground);
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
