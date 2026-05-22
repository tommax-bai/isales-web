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
      <el-form-item label="任务 ID" prop="campaign_id">
        <el-input-number
          v-model="form.campaign_id"
          :min="1"
          :disabled="isEdit"
        />
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

import KeyValueEditor from "@/components/Common/KeyValueEditor.vue";
import { useLeadsStore } from "@/stores/leads";
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
const formRef = ref<FormInstance | null>(null);
const saving = ref(false);

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
  campaign_id: number;
  phone: string;
  name: string;
  source: string;
  status: LeadStatus;
}

const form = reactive<FormState>({
  campaign_id: 1,
  phone: "",
  name: "",
  source: "",
  status: "new",
});

const customDataModel = ref<Record<string, string>>({});

const isEdit = computed(() => Boolean(props.initial));

const rules: FormRules = {
  campaign_id: [{ required: true, message: "请填写任务 ID" }],
  phone: [{ required: true, message: "请填写电话" }],
};

watch(
  () => [props.modelValue, props.initial] as const,
  ([open, initial]) => {
    if (!open) return;
    if (initial) {
      form.campaign_id = initial.campaign_id;
      form.phone = initial.phone;
      form.name = initial.name ?? "";
      form.source = initial.source ?? "";
      form.status = initial.status;
      customDataModel.value = stringifyValues(initial.custom_data ?? {});
    } else {
      form.campaign_id = 1;
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
        campaign_id: form.campaign_id,
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
