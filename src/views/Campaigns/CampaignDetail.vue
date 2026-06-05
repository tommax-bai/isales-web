<template>
  <section class="cd" v-loading="loading">
    <PageHeader :title="campaign?.name || '场景详情'" :subtitle="`场景 #${id}`">
      <template #actions>
        <el-button @click="goBack">
          <ArrowLeft :size="14" style="margin-right: 4px" />
          返回场景列表
        </el-button>
        <el-button
          v-if="!progress.is_active"
          type="primary"
          :loading="toggling"
          @click="onStart"
        >
          <Play :size="15" style="margin-right: 4px" />
          启动场景
        </el-button>
        <el-button v-else :loading="toggling" @click="onStop">
          <Square :size="14" style="margin-right: 4px" />
          停止场景
        </el-button>
      </template>
    </PageHeader>

    <template v-if="campaign">
      <!-- 启停 + 进度概览 -->
      <section class="card">
        <header class="card__head">
          <Activity :size="16" />
          <h3 class="card__title">外呼进度</h3>
          <StatusBadge :color="progress.is_active ? 'green' : 'gray'">
            {{ progress.is_active ? "运行中" : "已停止" }}
          </StatusBadge>
        </header>
        <p v-if="progress.total === 0" class="card__empty">
          该场景暂无线索。前往「线索管理」添加归属本场景的线索后启动。
        </p>
        <div v-else class="cd__progress">
          <div v-for="s in progressEntries" :key="s.key" class="cd__progress-item">
            <span class="cd__progress-count">{{ s.count }}</span>
            <span class="cd__progress-label">{{ s.label }}</span>
          </div>
        </div>
      </section>

      <!-- 基本信息 -->
      <section class="card">
        <header class="card__head">
          <Settings :size="16" />
          <h3 class="card__title">基本信息</h3>
        </header>
        <el-form label-width="96px" class="cd__form">
          <el-form-item label="场景名称">
            <el-input v-model="form.name" />
          </el-form-item>
          <el-form-item label="并发上限">
            <el-input-number v-model="form.concurrency" :min="1" :max="100" />
          </el-form-item>
          <el-form-item label="音色 ID">
            <el-input
              v-model="form.voice_id"
              clearable
              placeholder="例如：zh_female_xiaohe_uranus_bigtts（暂不指定则留空）"
            />
          </el-form-item>
          <el-form-item label="开场白文案">
            <el-input
              v-model="form.greeting"
              type="textarea"
              :rows="3"
              placeholder="留空则由 LLM 生成开场白"
            />
            <div class="cd__preview-row">
              <el-button
                size="small"
                :loading="previewing"
                :disabled="!greetingFilled || !form.voice_id"
                @click="previewGreeting"
              >
                试听
              </el-button>
              <span v-if="!form.voice_id" class="cd__preview-hint">
                填「音色 ID」后可试听
              </span>
            </div>
            <div class="cd__hint">
              通话接通后引擎播放的第一句话。留空 = 走 LLM 路径。试听用上面填的音色现合成。
            </div>
          </el-form-item>
        </el-form>
      </section>

      <!-- 可拨时段 -->
      <section class="card">
        <header class="card__head">
          <Clock :size="16" />
          <h3 class="card__title">可拨时段</h3>
          <el-button size="small" type="primary" @click="addWindow">
            <Plus :size="14" style="margin-right: 4px" />
            新增时段
          </el-button>
        </header>
        <p v-if="form.time_windows.length === 0" class="card__empty">
          未设置时段——scheduler 不会在窗外派发。
        </p>
        <article
          v-for="(w, i) in form.time_windows"
          :key="i"
          class="window"
        >
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
          <el-checkbox-group v-model="w.days">
            <el-checkbox v-for="d in WEEKDAYS" :key="d.value" :value="d.value">
              {{ d.label }}
            </el-checkbox>
          </el-checkbox-group>
        </article>
      </section>

      <!-- AI 外呼策略：4-tier 并行配置（per-campaign） -->
      <div class="cd__tiers">
        <PromptTierEditor
          :campaign-id="id"
          kind="main"
          title="主对话 (main)"
          description="纯文本流式回复，直喂 TTS。不要输出 JSON / markdown / emoji"
          :icon="MessageSquare"
          badge-color="blue"
        />
        <PromptTierEditor
          :campaign-id="id"
          kind="referee"
          title="决策 (referee)"
          description="旁路小模型，判定 goal_achieved / transfer / customer_decline"
          :icon="Target"
          badge-color="purple"
        />
        <PromptTierEditor
          :campaign-id="id"
          kind="extractor"
          title="信息抽取 (extractor)"
          description="通话结束后异步抽取客户字段（customer_name / intent / …）"
          :icon="Sparkles"
          badge-color="green"
        />
        <FillerEditor :campaign-id="id" />
      </div>

      <!-- sticky 保存条 -->
      <div class="save-bar">
        <span class="save-bar__hint">
          <Save :size="14" />
          基本信息与可拨时段的改动需保存后生效。
        </span>
        <el-button type="primary" :loading="saving" @click="onSave">
          <Save :size="14" style="margin-right: 4px" />
          保存
        </el-button>
      </div>
    </template>
  </section>
</template>

<script setup lang="ts">
import { ElMessage } from "element-plus";
import {
  Activity,
  ArrowLeft,
  Clock,
  MessageSquare,
  Play,
  Plus,
  Save,
  Settings,
  Sparkles,
  Square,
  Target,
  Trash2,
} from "lucide-vue-next";
import { computed, onBeforeUnmount, onMounted, reactive, ref } from "vue";
import { useRoute, useRouter } from "vue-router";

import { campaignsApi, ttsPreviewError } from "@/api/campaigns";
import FillerEditor from "@/components/Campaign/FillerEditor.vue";
import PromptTierEditor from "@/components/Campaign/PromptTierEditor.vue";
import PageHeader from "@/components/Common/PageHeader.vue";
import StatusBadge from "@/components/Common/StatusBadge.vue";
import { leadStatusMeta } from "@/composables/useStatusMeta";
import type { CampaignDetail, CampaignProgress, TimeWindow, WeekDay } from "@/types/campaign";
import type { LeadStatus } from "@/types/lead";

const route = useRoute();
const router = useRouter();
const id = Number(route.params.id);

const campaign = ref<CampaignDetail | null>(null);
const loading = ref(false);
const saving = ref(false);
const toggling = ref(false);

const EMPTY_PROGRESS: CampaignProgress = {
  campaign_id: id,
  total: 0,
  status_counts: {},
  is_active: false,
};
const progress = ref<CampaignProgress>(EMPTY_PROGRESS);

const form = reactive<{
  name: string;
  concurrency: number;
  voice_id: string | null;
  greeting: string | null;
  time_windows: TimeWindow[];
}>({ name: "", concurrency: 1, voice_id: null, greeting: null, time_windows: [] });

// ── greeting 试听 (campaign-greeting-tts-preview § 4C) ────────────────────
const greetingFilled = computed(() => Boolean(form.greeting?.trim()));
const previewing = ref(false);
let currentAudio: HTMLAudioElement | null = null;

function stopPreview(): void {
  if (currentAudio) {
    currentAudio.pause();
    currentAudio = null;
  }
}

async function previewGreeting(): Promise<void> {
  const text = form.greeting?.trim();
  const speaker = form.voice_id?.trim();
  if (!text || !speaker) return;
  stopPreview();
  previewing.value = true;
  try {
    const blob = await campaignsApi.ttsPreview(text, speaker);
    const url = URL.createObjectURL(blob);
    const audio = new Audio(url);
    currentAudio = audio;
    audio.onended = () => {
      URL.revokeObjectURL(url);
      if (currentAudio === audio) currentAudio = null;
    };
    await audio.play();
  } catch (e) {
    ElMessage.error(ttsPreviewError(e));
  } finally {
    previewing.value = false;
  }
}

onBeforeUnmount(stopPreview);

const WEEKDAYS: { value: WeekDay; label: string }[] = [
  { value: "mon", label: "一" },
  { value: "tue", label: "二" },
  { value: "wed", label: "三" },
  { value: "thu", label: "四" },
  { value: "fri", label: "五" },
  { value: "sat", label: "六" },
  { value: "sun", label: "日" },
];

const progressEntries = computed(() =>
  Object.entries(progress.value.status_counts)
    .filter(([, c]) => c > 0)
    .map(([key, count]) => ({
      key,
      count,
      label: leadStatusMeta(key as LeadStatus).label,
    })),
);

async function loadProgress() {
  try {
    progress.value = await campaignsApi.progress(id);
  } catch {
    progress.value = { ...EMPTY_PROGRESS };
  }
}

async function onRefresh() {
  loading.value = true;
  try {
    campaign.value = await campaignsApi.get(id);
    form.name = campaign.value.name;
    form.concurrency = campaign.value.concurrency;
    form.voice_id = campaign.value.voice_id;
    form.greeting = campaign.value.greeting;
    form.time_windows = campaign.value.time_windows.map((w) => ({ ...w, days: [...w.days] }));
    await loadProgress();
  } catch (err: unknown) {
    ElMessage.error(err instanceof Error ? err.message : "加载场景失败");
  } finally {
    loading.value = false;
  }
}

function goBack() {
  void router.push({ name: "campaigns" });
}

function addWindow() {
  form.time_windows.push({ start: "09:00", end: "21:00", days: ["mon", "tue", "wed", "thu", "fri"] });
}

function removeWindow(i: number) {
  form.time_windows.splice(i, 1);
}

async function onSave() {
  saving.value = true;
  try {
    await campaignsApi.update(id, {
      name: form.name,
      concurrency: form.concurrency,
      voice_id: form.voice_id?.trim() || null,
      greeting: form.greeting?.trim() || null,
      time_windows: form.time_windows,
    });
    ElMessage.success("已保存");
    void onRefresh();
  } catch (err: unknown) {
    ElMessage.error(err instanceof Error ? err.message : "保存失败");
  } finally {
    saving.value = false;
  }
}

async function onStart() {
  toggling.value = true;
  try {
    await campaignsApi.start(id);
    ElMessage.success("启动指令已下发，scheduler 将开始派发本场景线索");
    await loadProgress();
  } catch (err: unknown) {
    ElMessage.error(err instanceof Error ? err.message : "启动失败");
  } finally {
    toggling.value = false;
  }
}

async function onStop() {
  toggling.value = true;
  try {
    await campaignsApi.pause(id);
    ElMessage.success("停止指令已下发");
    await loadProgress();
  } catch (err: unknown) {
    ElMessage.error(err instanceof Error ? err.message : "停止失败");
  } finally {
    toggling.value = false;
  }
}

onMounted(onRefresh);
</script>

<style scoped>
.cd {
  display: flex;
  flex-direction: column;
  gap: var(--isales-space-4);
  padding-bottom: 80px;
}
.cd__tiers {
  display: flex;
  flex-direction: column;
  gap: var(--isales-space-4);
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
.card__empty {
  margin: var(--isales-space-2) 0;
  font-size: var(--isales-font-size-sm);
  color: var(--isales-muted-foreground);
  line-height: var(--isales-line-height-snug);
}
.cd__progress {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(96px, 1fr));
  gap: var(--isales-space-3);
}
.cd__progress-item {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: var(--isales-space-3);
  background: var(--isales-muted);
  border-radius: var(--isales-radius-md);
}
.cd__progress-count {
  font-size: var(--isales-font-size-title-1);
  font-weight: var(--isales-font-weight-semibold);
  font-variant-numeric: tabular-nums;
  line-height: 1.1;
}
.cd__progress-label {
  font-size: var(--isales-font-size-xs);
  color: var(--isales-muted-foreground);
}
.cd__form {
  max-width: 520px;
}
.cd__preview-row {
  display: flex;
  align-items: center;
  gap: var(--isales-space-2);
  margin-top: var(--isales-space-2);
}
.cd__preview-hint,
.cd__hint {
  font-size: 12px;
  color: var(--isales-text-secondary, #909399);
  line-height: 1.6;
}
.cd__hint {
  margin-top: 4px;
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
  margin-top: var(--isales-space-2);
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
}
</style>
