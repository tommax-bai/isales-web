<template>
  <section class="cd" v-loading="loading">
    <PageHeader :title="campaign?.name || '场景详情'" :subtitle="`场景 #${id}`">
      <template #actions>
        <el-button @click="goBack">
          <ArrowLeft :size="14" style="margin-right: 4px" />
          返回场景列表
        </el-button>
        <el-button @click="goMonitor">
          <Activity :size="14" style="margin-right: 4px" />
          实时监控
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
      <el-alert
        v-if="errorBanner"
        :title="errorBanner"
        type="error"
        show-icon
        :closable="false"
        class="cd__banner"
      />

      <!-- 启停 + 进度概览 -->
      <section class="card card--green">
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
      <section class="card card--yellow">
        <header class="card__head">
          <Settings :size="16" />
          <h3 class="card__title">基本信息</h3>
        </header>
        <el-form label-width="96px" class="cd__form">
          <el-form-item label="场景名称">
            <el-input v-model="form.name" style="width: 360px" />
          </el-form-item>
          <el-form-item label="并发上限">
            <el-input-number v-model="form.concurrency" :min="1" :max="100" />
          </el-form-item>
          <el-form-item label="音色 ID">
            <el-input
              v-model="form.voice_id"
              clearable
              placeholder="手填 vendor voice id，如 zh_female_xiaohe_uranus_bigtts"
              style="width: 360px"
            />
            <div class="cd__hint">
              手填 vendor voice id（如 zh_female_xiaohe_uranus_bigtts）；留空走默认。
            </div>
          </el-form-item>
          <el-form-item label="开场白文案">
            <ExpandingTextarea
              v-model="form.greeting"
              placeholder="留空则由 LLM 生成开场白"
              style="width: 520px"
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
      <section class="card card--red">
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

      <!-- 模块顺序按外呼运行链路排布。AI 角色卡（main/referee/extractor）与垫词各自
           按 campaign-id 即时保存；其余 form-driven 小节统一经底部保存条提交。原
           .cd__tiers 分组已拆散，三角色卡随链路嵌在 form-driven 小节之间。 -->

      <!-- 主对话 (main) — 即时保存 -->
      <PromptTierEditor
        :campaign-id="id"
        kind="main"
        title="主对话 (main)"
        description="纯文本流式回复，直喂 TTS。不要输出 JSON / markdown / emoji"
        :icon="MessageSquare"
        badge-color="blue"
      />

      <section class="card card--green">
        <header class="card__head">
          <Settings :size="16" />
          <h3 class="card__title">门控路由</h3>
        </header>
        <RoutingRulesTab v-model="form" :role-configs="roleConfigs" />
      </section>

      <section class="card card--yellow">
        <header class="card__head">
          <Settings :size="16" />
          <h3 class="card__title">工具触发</h3>
        </header>
        <ToolsTab v-model="form" :role-configs="roleConfigs" />
      </section>

      <!-- 旁路监管 (referee) — 即时保存 -->
      <PromptTierEditor
        :campaign-id="id"
        kind="referee"
        title="旁路监管 (referee)"
        description="与主对话并行的旁路小模型，实时给每轮对话打类别标签，由「门控路由」据此决策动作"
        :icon="Settings"
        badge-color="purple"
        plain-icon
      />

      <!-- 话后信息提取 (extractor) — 即时保存；逻辑上只有一条配置 -->
      <PromptTierEditor
        :campaign-id="id"
        kind="extractor"
        title="话后信息提取 (extractor)"
        description="通话结束后异步从对话全文提取结构化字段（customer_name / intent / …）"
        :icon="Settings"
        badge-color="green"
        plain-icon
        singleton
      />

      <!-- 垫词 (filler) — 垫词组即时保存；开关/触发延迟随底部保存条提交。 -->
      <FillerEditor v-model="form" :campaign-id="id" />

      <section class="card card--red">
        <header class="card__head">
          <Settings :size="16" />
          <h3 class="card__title">用户断句判定</h3>
        </header>
        <EndpointingTab v-model="form" :field-errors="fieldErrors" />
      </section>

      <section class="card card--blue">
        <header class="card__head">
          <Settings :size="16" />
          <h3 class="card__title">打断保护</h3>
        </header>
        <InterruptionTab v-model="form" :field-errors="fieldErrors" />
      </section>

      <section class="card card--purple">
        <header class="card__head">
          <Settings :size="16" />
          <h3 class="card__title">沉默激活</h3>
        </header>
        <SilenceTab v-model="form" :field-errors="fieldErrors" />
      </section>

      <section class="card card--green">
        <header class="card__head">
          <Settings :size="16" />
          <h3 class="card__title">转人工</h3>
        </header>
        <TransferTab v-model="form" :field-errors="fieldErrors" />
      </section>

      <section class="card card--yellow">
        <header class="card__head">
          <Settings :size="16" />
          <h3 class="card__title">收尾</h3>
        </header>
        <WrapUpTab v-model="form" :field-errors="fieldErrors" />
      </section>

      <section class="card card--red">
        <header class="card__head">
          <Settings :size="16" />
          <h3 class="card__title">重试 / 跟进</h3>
        </header>
        <RetryFollowUpTab v-model="form" :field-errors="fieldErrors" />
      </section>

      <section class="card card--gray">
        <header class="card__head">
          <Settings :size="16" />
          <h3 class="card__title">勿打</h3>
        </header>
        <DoNotCallTab v-model="form" />
      </section>

      <section class="card card--blue">
        <header class="card__head">
          <Settings :size="16" />
          <h3 class="card__title">回调</h3>
        </header>
        <CallbacksTab :model-value="callbackConfigs" :campaign-id="id" />
      </section>

      <!-- sticky 保存条 -->
      <div class="save-bar">
        <span class="save-bar__hint">
          <Save :size="14" />
          基本信息 / 路由 / 工具 / 沉默 / 转人工 / 收尾 / 调度 等改动需点保存后生效；AI 角色与垫词各自即时保存。
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
  Square,
  Trash2,
} from "lucide-vue-next";
import { computed, onBeforeUnmount, onMounted, reactive, ref } from "vue";
import { useRoute, useRouter } from "vue-router";

import { campaignsApi, ttsPreviewError } from "@/api/campaigns";
import FillerEditor from "@/components/Campaign/FillerEditor.vue";
import PromptTierEditor from "@/components/Campaign/PromptTierEditor.vue";
import PageHeader from "@/components/Common/PageHeader.vue";
import StatusBadge from "@/components/Common/StatusBadge.vue";
import ExpandingTextarea from "@/components/Common/ExpandingTextarea.vue";
// form-driven 高级配置小节（折叠进单页，原 CampaignEdit 的 tab 组件复用为内联小节）
import RoutingRulesTab from "@/views/Campaigns/Tabs/RoutingRulesTab.vue";
import ToolsTab from "@/views/Campaigns/Tabs/ToolsTab.vue";
import SilenceTab from "@/views/Campaigns/Tabs/SilenceTab.vue";
import EndpointingTab from "@/views/Campaigns/Tabs/EndpointingTab.vue";
import InterruptionTab from "@/views/Campaigns/Tabs/InterruptionTab.vue";
import TransferTab from "@/views/Campaigns/Tabs/TransferTab.vue";
import WrapUpTab from "@/views/Campaigns/Tabs/WrapUpTab.vue";
import RetryFollowUpTab from "@/views/Campaigns/Tabs/RetryFollowUpTab.vue";
import DoNotCallTab from "@/views/Campaigns/Tabs/DoNotCallTab.vue";
import CallbacksTab from "@/views/Campaigns/Tabs/CallbacksTab.vue";
import { leadStatusMeta } from "@/composables/useStatusMeta";
import {
  CAMPAIGN_DEFAULTS,
  type CampaignBase,
  type CampaignDetail,
  type CampaignNestedUpdate,
  type CampaignProgress,
  type RoleConfigRead,
  type WeekDay,
} from "@/types/campaign";
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

// 完整 CampaignBase —— 单页承载全部 per-campaign 字段（路由/工具/沉默/打断/
// 转人工/收尾/重试/勿打 等 form-driven 小节直接 v-model 本对象）。
const form = reactive<CampaignBase>({ ...CAMPAIGN_DEFAULTS });
// 只读：供「门控路由 / 工具触发」小节取 referee label。角色本身由 3 个
// PromptTier 卡按 campaign-id 自存，不经本页 form/buildPayload。
const roleConfigs = ref<RoleConfigRead[]>([]);
// 回调列表（只读，CallbacksTab 跳独立页编辑）；不参与 buildPayload。
const callbackConfigs = ref<unknown[]>([]);
const errorBanner = ref<string | null>(null);
const fieldErrors = reactive<Record<string, string>>({});

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
    // 全量灌入完整 CampaignBase；time_windows 深拷贝避免改动 campaign ref。
    Object.assign(form, campaign.value);
    form.time_windows = campaign.value.time_windows.map((w) => ({ ...w, days: [...w.days] }));
    roleConfigs.value = campaign.value.role_configs ?? [];
    callbackConfigs.value = campaign.value.callback_configs ?? [];
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

// 实时监控就近入口（one-role IA §2.3）—— 监控需 campaign_id，从场景详情进入。
function goMonitor() {
  void router.push({ name: "monitor", params: { campaign_id: id } });
}

function addWindow() {
  form.time_windows.push({ start: "09:00", end: "21:00", days: ["mon", "tue", "wed", "thu", "fri"] });
}

function removeWindow(i: number) {
  form.time_windows.splice(i, 1);
}

interface ApiValidationError {
  loc: (string | number)[];
  msg: string;
}

function applyFieldErrors(detail: ApiValidationError[]): void {
  Object.keys(fieldErrors).forEach((k) => delete fieldErrors[k]);
  for (const item of detail) {
    // FastAPI 422 detail loc 形如 ["body", "field"] 或 ["body","field",idx]，取第二段。
    const path = item.loc.slice(1).join(".");
    if (path) fieldErrors[path] = item.msg;
  }
}

function buildPayload(): CampaignNestedUpdate {
  // 白名单：只发 CampaignBase 字段（CAMPAIGN_DEFAULTS 的 key 集）。这同时排除了
  //  ① onRefresh 的 Object.assign 灌进 form 的只读字段（id/created_at/updated_at/
  //     status 等——后端 extra=forbid 会拒）；
  //  ② role_configs/filler_sets/callback_configs（自包含编辑器各自存，不在
  //     CampaignBase 里），避免 children-replace 清空。
  const src = form as unknown as Record<string, unknown>;
  const payload: Record<string, unknown> = {};
  for (const k of Object.keys(CAMPAIGN_DEFAULTS)) payload[k] = src[k];
  // 空/纯空白 greeting 归一为 null（走 LLM 开场白路径，campaign-fixed-greeting § 决策 1）。
  if (typeof payload.greeting === "string" && !(payload.greeting as string).trim()) {
    payload.greeting = null;
  }
  return payload as CampaignNestedUpdate;
}

async function onSave() {
  saving.value = true;
  errorBanner.value = null;
  try {
    await campaignsApi.update(id, buildPayload());
    ElMessage.success("已保存");
    void onRefresh();
  } catch (err: unknown) {
    type AxiosLikeError = {
      response?: { status?: number; data?: { detail?: ApiValidationError[] } };
    };
    const error = err as AxiosLikeError;
    if (error?.response?.status === 422 && Array.isArray(error.response.data?.detail)) {
      applyFieldErrors(error.response.data.detail);
      // 列出具体失败字段 + 原因——nested 字段（如 routing_rules）/ 基本信息无
      // 行内标红，banner 兜底显示，避免"提示了却看不出哪错"。
      const lines = error.response.data.detail.map((d) => {
        const path = d.loc.slice(1).join(".");
        return path ? `${path}：${d.msg}` : d.msg;
      });
      errorBanner.value = `保存失败 — 字段校验错误：${lines.join("；")}`;
      ElMessage.error("字段校验错误，详见顶部红条");
    } else {
      ElMessage.error(err instanceof Error ? err.message : "保存失败");
    }
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

// Exposed for unit tests (buildPayload's omit-children contract is the testable
// surface; the api calls are mocked in tests).
defineExpose({ form, roleConfigs, callbackConfigs, buildPayload, onSave, fieldErrors });
</script>

<style scoped>
.cd {
  display: flex;
  flex-direction: column;
  gap: var(--isales-space-4);
  padding-bottom: 80px;
}
.card {
  background: var(--isales-card);
  border: 1px solid var(--isales-border);
  /* 彩色左色条：与 main/referee/extractor/垫词 卡（.tier/.filler 的 border-left）
     统一的视觉语言，每张卡按 .card--<color> 取不同状态色。 */
  border-left-width: 4px;
  border-radius: var(--isales-radius);
  padding: var(--isales-space-4);
}
.card--blue {
  border-left-color: var(--isales-status-blue-700);
}
.card--green {
  border-left-color: var(--isales-status-green-700);
}
.card--yellow {
  border-left-color: var(--isales-status-yellow-700);
}
.card--purple {
  border-left-color: var(--isales-status-purple-700);
}
.card--red {
  border-left-color: var(--isales-status-red-700);
}
.card--gray {
  border-left-color: var(--isales-status-gray-700);
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
  /* no max-width: hints below each field render on a single line (white-space:
     nowrap), so the content column needs the card's full width to fit them. */
}
.cd__preview-row {
  /* el-form-item__content 是 flex-wrap：占满整行以落到输入框「下面」而非右侧。 */
  flex-basis: 100%;
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
  /* 占满整行：说明落到输入框「下面」而非被 flex 挤到右侧。 */
  flex-basis: 100%;
  margin-top: 4px;
  white-space: nowrap;
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
