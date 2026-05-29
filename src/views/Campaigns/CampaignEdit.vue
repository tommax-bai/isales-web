<template>
  <el-card v-loading="loading" class="edit-card">
    <template #header>
      <div class="header">
        <span class="title">编辑任务 {{ form.name ? `· ${form.name}` : "" }}</span>
        <div>
          <el-button @click="onBack">返回列表</el-button>
          <el-button type="primary" :loading="saving" @click="onSave">
            保存
          </el-button>
        </div>
      </div>
    </template>

    <el-alert
      v-if="errorBanner"
      :title="errorBanner"
      type="error"
      show-icon
      class="banner"
    />

    <el-tabs v-model="activeTab" tab-position="left" class="tabs">
      <el-tab-pane label="基础" name="basic">
        <BasicTab v-model="form" :field-errors="fieldErrors" />
      </el-tab-pane>
      <el-tab-pane label="角色配置" name="role">
        <RoleConfigTab v-model="roleConfigs" />
      </el-tab-pane>
      <el-tab-pane label="沉默激活" name="silence">
        <SilenceTab v-model="form" :field-errors="fieldErrors" />
      </el-tab-pane>
      <el-tab-pane label="打断保护" name="interruption">
        <InterruptionTab v-model="form" :field-errors="fieldErrors" />
      </el-tab-pane>
      <el-tab-pane label="转人工" name="transfer">
        <TransferTab v-model="form" :field-errors="fieldErrors" />
      </el-tab-pane>
      <el-tab-pane label="收尾" name="wrap-up">
        <WrapUpTab v-model="form" :field-errors="fieldErrors" />
      </el-tab-pane>
      <el-tab-pane label="时间窗口" name="time-window">
        <TimeWindowTab v-model="form" />
      </el-tab-pane>
      <el-tab-pane label="重试 / 跟进" name="retry">
        <RetryFollowUpTab v-model="form" :field-errors="fieldErrors" />
      </el-tab-pane>
      <el-tab-pane label="勿打" name="do-not-call">
        <DoNotCallTab v-model="form" />
      </el-tab-pane>
      <el-tab-pane label="垫词" name="filler">
        <FillerTab v-model="fillerSets" />
      </el-tab-pane>
      <el-tab-pane label="回调" name="callbacks">
        <CallbacksTab :model-value="callbackConfigs" :campaign-id="id" />
      </el-tab-pane>
    </el-tabs>
  </el-card>
</template>

<script setup lang="ts">
import { ElMessage } from "element-plus";
import { onMounted, reactive, ref } from "vue";
import { useRoute, useRouter } from "vue-router";

import { campaignsApi } from "@/api/campaigns";
import BasicTab from "@/views/Campaigns/Tabs/BasicTab.vue";
import CallbacksTab from "@/views/Campaigns/Tabs/CallbacksTab.vue";
import DoNotCallTab from "@/views/Campaigns/Tabs/DoNotCallTab.vue";
import FillerTab from "@/views/Campaigns/Tabs/FillerTab.vue";
import InterruptionTab from "@/views/Campaigns/Tabs/InterruptionTab.vue";
import RetryFollowUpTab from "@/views/Campaigns/Tabs/RetryFollowUpTab.vue";
import RoleConfigTab from "@/views/Campaigns/Tabs/RoleConfigTab.vue";
import SilenceTab from "@/views/Campaigns/Tabs/SilenceTab.vue";
import TimeWindowTab from "@/views/Campaigns/Tabs/TimeWindowTab.vue";
import TransferTab from "@/views/Campaigns/Tabs/TransferTab.vue";
import WrapUpTab from "@/views/Campaigns/Tabs/WrapUpTab.vue";
import {
  CAMPAIGN_DEFAULTS,
  type CampaignBase,
  type CampaignNestedUpdate,
  type FillerPhraseNestedWrite,
  type FillerSetNestedWrite,
  type FillerSetRead,
  type RoleConfigNestedWrite,
  type RoleConfigRead,
} from "@/types/campaign";

const route = useRoute();
const router = useRouter();

const id = Number(route.params.id);
const loading = ref(false);
const saving = ref(false);
const activeTab = ref("basic");
const errorBanner = ref<string | null>(null);
const fieldErrors = reactive<Record<string, string>>({});

const form = reactive<CampaignBase>({ ...CAMPAIGN_DEFAULTS });
const roleConfigs = ref<RoleConfigRead[]>([]);
const fillerSets = ref<FillerSetRead[]>([]);
const callbackConfigs = ref<unknown[]>([]);

onMounted(async () => {
  if (!Number.isFinite(id)) {
    errorBanner.value = "无效的任务 ID";
    return;
  }
  loading.value = true;
  try {
    const detail = await campaignsApi.get(id);
    Object.assign(form, detail);
    roleConfigs.value = detail.role_configs ?? [];
    fillerSets.value = detail.filler_sets ?? [];
    callbackConfigs.value = detail.callback_configs ?? [];
  } catch {
    errorBanner.value = "加载任务失败";
  } finally {
    loading.value = false;
  }
});

interface ApiValidationError {
  loc: (string | number)[];
  msg: string;
}

function applyFieldErrors(detail: ApiValidationError[]): void {
  Object.keys(fieldErrors).forEach((k) => delete fieldErrors[k]);
  for (const item of detail) {
    // FastAPI 422 detail loc looks like ["body", "field_name"] or
    // ["body", "field_name", index]. Take the second segment.
    const path = item.loc.slice(1).join(".");
    if (path) fieldErrors[path] = item.msg;
  }
}

function buildPayload(): CampaignNestedUpdate {
  const payload: CampaignNestedUpdate = { ...form };
  // Normalize empty / whitespace-only greeting to null so the engine
  // explicitly takes the LLM-greeting path (NULL semantic in
  // campaign-fixed-greeting design § 决策 1).
  if (typeof payload.greeting === "string" && !payload.greeting.trim()) {
    payload.greeting = null;
  }
  payload.role_configs = roleConfigs.value.map(
    (r): RoleConfigNestedWrite => ({
      kind: r.kind,
      model: r.model,
      current_prompt_version_id: r.current_prompt_version_id,
      temperature: r.temperature,
      top_p: r.top_p,
      ext_params: r.ext_params,
      enabled: r.enabled,
    }),
  );
  payload.filler_sets = fillerSets.value.map(
    (fs): FillerSetNestedWrite => ({
      name: fs.name,
      sort_order: fs.sort_order,
      phrases: fs.phrases.map(
        (p): FillerPhraseNestedWrite => ({
          phrase: p.phrase,
          audio_url: p.audio_url,
          generation_status: p.generation_status,
        }),
      ),
    }),
  );
  // callback_configs are managed in the dedicated /callback-configs page;
  // omit from PATCH so we don't accidentally clobber the server-side list
  // (the children-replace semantics would delete every callback).
  return payload;
}

async function onSave() {
  saving.value = true;
  errorBanner.value = null;
  try {
    const updated = await campaignsApi.update(id, buildPayload());
    Object.assign(form, updated);
    roleConfigs.value = updated.role_configs ?? [];
    ElMessage.success("已保存");
  } catch (err: unknown) {
    type AxiosLikeError = { response?: { status?: number; data?: { detail?: ApiValidationError[] } } };
    const error = err as AxiosLikeError;
    if (error?.response?.status === 422 && Array.isArray(error.response.data?.detail)) {
      applyFieldErrors(error.response.data.detail);
      errorBanner.value = "存在字段校验错误，请检查标红字段";
    } else {
      errorBanner.value = "保存失败";
    }
  } finally {
    saving.value = false;
  }
}

function onBack() {
  void router.push({ name: "campaigns" });
}
</script>

<style scoped>
.edit-card {
  min-height: calc(100vh - 110px);
}
.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.title {
  font-size: 16px;
  font-weight: 600;
}
.banner {
  margin-bottom: 12px;
}
.tabs {
  min-height: 480px;
}
</style>
