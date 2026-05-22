<template>
  <el-dialog
    :model-value="modelValue"
    :title="isEdit ? '编辑线索' : '新建线索'"
    width="600px"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <el-form
      ref="formRef"
      :model="form"
      :rules="rules"
      label-width="120px"
    >
      <el-form-item label="归属场景" prop="campaign_id">
        <el-select
          v-model="form.campaign_id"
          :disabled="isEdit"
          placeholder="选择外呼场景"
          style="width: 100%"
        >
          <el-option
            v-for="c in campaigns"
            :key="c.id"
            :value="c.id"
            :label="campaignLabel(c)"
          />
        </el-select>
        <p
          v-if="!isEdit && !campaignsLoading && campaigns.length === 0"
          class="dialog-hint"
        >
          系统还没有外呼场景。
          <el-button link type="primary" @click="goCampaigns">
            前往「场景」创建
          </el-button>
        </p>
        <p
          v-else-if="!isEdit && selectedInactive"
          class="dialog-hint dialog-hint--warn"
        >
          该场景当前未启动，线索加入后暂不会被外呼——可在场景详情点「启动场景」。
        </p>
      </el-form-item>
      <el-form-item label="电话" prop="phone">
        <el-input v-model="form.phone" placeholder="例如 13800138000" />
      </el-form-item>
      <el-form-item label="姓名">
        <el-input v-model="form.name" placeholder="可空" />
      </el-form-item>
      <el-form-item label="来源">
        <el-input v-model="form.source" placeholder="例如 import / manual" />
      </el-form-item>
      <el-form-item v-if="isEdit" label="状态">
        <el-select v-model="form.status">
          <el-option
            v-for="s in statuses"
            :key="s"
            :label="s"
            :value="s"
          />
        </el-select>
      </el-form-item>
      <el-form-item label="custom_data">
        <KeyValueEditor v-model="customDataModel" />
      </el-form-item>
    </el-form>

    <template #footer>
      <el-button @click="onCancel">取消</el-button>
      <el-button type="primary" :loading="saving" @click="onSubmit">
        保存
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ElMessage, type FormInstance, type FormRules } from "element-plus";
import { computed, reactive, ref, watch } from "vue";
import { useRouter } from "vue-router";

import { campaignsApi } from "@/api/campaigns";
import KeyValueEditor from "@/components/Common/KeyValueEditor.vue";
import { useLeadsStore } from "@/stores/leads";
import type { CampaignDetail } from "@/types/campaign";
import type { Lead, LeadStatus } from "@/types/lead";

const props = defineProps<{
  modelValue: boolean;
  initial: Lead | null;
}>();

const emit = defineEmits<{
  (e: "update:modelValue", v: boolean): void;
  (e: "saved"): void;
}>();

const store = useLeadsStore();
const router = useRouter();
const formRef = ref<FormInstance | null>(null);
const saving = ref(false);

const campaigns = ref<CampaignDetail[]>([]);
const campaignActive = reactive<Record<number, boolean>>({});
const campaignsLoading = ref(false);

const statuses: LeadStatus[] = [
  "new",
  "queued",
  "calling",
  "retrying",
  "following_up",
  "appointed",
  "visited",
  "transferred",
  "completed",
  "failed",
  "follow_up_exhausted",
  "do_not_call",
  "lost",
];

interface FormState {
  campaign_id: number | null;
  phone: string;
  name: string;
  source: string;
  status: LeadStatus;
}

const form = reactive<FormState>({
  campaign_id: null,
  phone: "",
  name: "",
  source: "",
  status: "new",
});

const customDataModel = ref<Record<string, string>>({});

const isEdit = computed(() => Boolean(props.initial));

const rules: FormRules = {
  campaign_id: [{ required: true, message: "请选择归属场景" }],
  phone: [{ required: true, message: "请填写电话" }],
};

const selectedInactive = computed(() => {
  if (form.campaign_id == null) return false;
  return campaignActive[form.campaign_id] === false;
});

function campaignLabel(c: CampaignDetail): string {
  const active = campaignActive[c.id];
  const tag = active === undefined ? "" : active ? "（运行中）" : "（已停止）";
  return `${c.name}${tag}`;
}

function goCampaigns() {
  emit("update:modelValue", false);
  void router.push({ name: "campaigns" });
}

async function loadCampaigns() {
  campaignsLoading.value = true;
  try {
    campaigns.value = await campaignsApi.list({ page_size: 200 });
    await Promise.all(
      campaigns.value.map(async (c) => {
        try {
          campaignActive[c.id] = (await campaignsApi.progress(c.id)).is_active;
        } catch {
          // 进度拉取失败不影响场景选择
        }
      }),
    );
  } catch {
    campaigns.value = [];
  } finally {
    campaignsLoading.value = false;
  }
}

watch(
  () => [props.modelValue, props.initial] as const,
  ([open, initial]) => {
    if (!open) return;
    void loadCampaigns();
    if (initial) {
      form.campaign_id = initial.campaign_id;
      form.phone = initial.phone;
      form.name = initial.name ?? "";
      form.source = initial.source ?? "";
      form.status = initial.status;
      customDataModel.value = stringifyValues(initial.custom_data ?? {});
    } else {
      form.campaign_id = null;
      form.phone = "";
      form.name = "";
      form.source = "";
      form.status = "new";
      customDataModel.value = {};
    }
  },
  { immediate: true },
);

function stringifyValues(obj: Record<string, unknown>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v === null || v === undefined) {
      out[k] = "";
    } else if (typeof v === "object") {
      out[k] = JSON.stringify(v);
    } else {
      out[k] = String(v);
    }
  }
  return out;
}

async function onSubmit() {
  if (!formRef.value) return;
  const valid = await formRef.value.validate().catch(() => false);
  if (!valid) return;
  saving.value = true;
  try {
    if (props.initial) {
      // LeadUpdate — 不含 campaign_id（后端 schema 无此字段，extra=forbid）
      await store.update(props.initial.id, {
        phone: form.phone,
        name: form.name || null,
        source: form.source || null,
        status: form.status,
        custom_data: customDataModel.value,
      });
      ElMessage.success("已更新");
    } else {
      // LeadCreate — 不含 status（新建固定为模型默认 `new`）
      await store.create({
        campaign_id: form.campaign_id as number,
        phone: form.phone,
        name: form.name || null,
        source: form.source || null,
        custom_data: customDataModel.value,
      });
      ElMessage.success("已创建");
    }
    emit("saved");
    emit("update:modelValue", false);
  } catch (err: unknown) {
    ElMessage.error(`${isEdit.value ? "更新" : "创建"}失败：${extractError(err)}`);
  } finally {
    saving.value = false;
  }
}

function extractError(err: unknown): string {
  if (typeof err === "object" && err !== null && "response" in err) {
    const resp = (
      err as { response?: { status?: number; data?: { detail?: unknown } } }
    ).response;
    const detail = resp?.data?.detail;
    if (typeof detail === "string") return detail;
    // FastAPI 422 把 detail 给成数组 [{loc, msg, type}, …]
    if (Array.isArray(detail) && detail.length > 0) {
      return detail
        .map((d: { loc?: unknown[]; msg?: string }) => {
          const field = Array.isArray(d.loc) ? d.loc[d.loc.length - 1] : "";
          return field ? `${field}: ${d.msg}` : d.msg;
        })
        .join("；");
    }
    if (resp?.status) return `HTTP ${resp.status}`;
  }
  return "网络错误，请稍后重试";
}

function onCancel() {
  emit("update:modelValue", false);
}
</script>

<style scoped>
.dialog-hint {
  margin: 4px 0 0;
  font-size: var(--isales-font-size-xs);
  color: var(--isales-muted-foreground);
  line-height: var(--isales-line-height-snug);
}
.dialog-hint--warn {
  color: var(--isales-status-yellow-800);
}
</style>
