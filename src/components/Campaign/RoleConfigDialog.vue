<template>
  <el-dialog
    :model-value="modelValue"
    :title="isEdit ? '编辑角色配置' : '新增角色配置'"
    width="640px"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <el-form
      ref="formRef"
      :model="form"
      :rules="rules"
      label-width="140px"
    >
      <el-form-item label="类型" prop="kind">
        <el-radio-group v-model="form.kind">
          <el-radio value="main">主对话</el-radio>
          <el-radio value="referee">裁判</el-radio>
          <el-radio value="restructure">重组</el-radio>
          <el-radio value="extractor">抽取</el-radio>
        </el-radio-group>
      </el-form-item>
      <el-form-item v-if="needsLabel" label="标识 (label)" prop="label">
        <el-input
          v-model="form.label"
          placeholder="路由规则按此标识引用，如 main_judge / reject"
        />
        <div class="hint">
          裁判 / 重组流必填，同一任务内唯一；路由规则通过 label 绑定裁判。
        </div>
      </el-form-item>
      <el-form-item label="模型" prop="model">
        <el-select v-model="form.model" filterable allow-create>
          <el-option label="doubao-pro" value="doubao-pro" />
          <el-option label="doubao-lite" value="doubao-lite" />
          <el-option label="gpt-4o-mini" value="gpt-4o-mini" />
          <el-option label="gpt-4o" value="gpt-4o" />
        </el-select>
      </el-form-item>
      <el-form-item label="温度 (0–2)" prop="temperature">
        <el-input-number
          v-model="form.temperature"
          :min="0"
          :max="2"
          :step="0.1"
          :precision="2"
        />
      </el-form-item>
      <el-form-item label="top_p (0–1)" prop="top_p">
        <el-input-number
          v-model="form.top_p"
          :min="0"
          :max="1"
          :step="0.05"
          :precision="2"
        />
      </el-form-item>
      <el-form-item label="启用">
        <el-switch v-model="form.enabled" />
      </el-form-item>
      <el-form-item label="prompt 版本 ID">
        <el-input-number
          v-model="form.current_prompt_version_id"
          :min="1"
          placeholder="可空 — 留空表示尚未关联 prompt"
        />
        <div class="hint">
          关联 prompt_version 表的 id；prompt 内容通过 prompt-management 流程管理。
        </div>
      </el-form-item>
    </el-form>

    <template #footer>
      <el-button @click="onCancel">取消</el-button>
      <el-button type="primary" @click="onSubmit">保存</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import type { FormInstance, FormRules } from "element-plus";
import { computed, reactive, ref, watch } from "vue";

import type { RoleConfigRead, RoleKind } from "@/types/campaign";

const props = defineProps<{
  modelValue: boolean;
  initial: RoleConfigRead | null;
}>();

const emit = defineEmits<{
  (e: "update:modelValue", v: boolean): void;
  (e: "save", v: RoleConfigRead): void;
}>();

const formRef = ref<FormInstance | null>(null);

interface FormState {
  kind: RoleKind;
  label: string;
  model: string;
  temperature: number;
  top_p: number;
  enabled: boolean;
  current_prompt_version_id: number | null;
}

const form = reactive<FormState>({
  kind: "main",
  label: "",
  model: "doubao-pro",
  temperature: 0.7,
  top_p: 1.0,
  enabled: true,
  current_prompt_version_id: null,
});

const isEdit = computed(() => Boolean(props.initial));
const needsLabel = computed(
  () => form.kind === "referee" || form.kind === "restructure",
);

const rules: FormRules = {
  kind: [{ required: true, message: "请选择类型" }],
  model: [{ required: true, message: "请输入模型名" }],
  temperature: [{ type: "number", required: true, message: "请输入温度" }],
  top_p: [{ type: "number", required: true, message: "请输入 top_p" }],
  label: [
    {
      validator: (_rule, value: string, cb) => {
        if (needsLabel.value && !String(value ?? "").trim()) {
          cb(new Error("裁判 / 重组流必须填写标识"));
        } else {
          cb();
        }
      },
      trigger: "blur",
    },
  ],
};

watch(
  () => [props.modelValue, props.initial] as const,
  ([open, initial]) => {
    if (!open) return;
    if (initial) {
      form.kind = initial.kind;
      form.label = initial.label ?? "";
      form.model = initial.model;
      form.temperature = initial.temperature;
      form.top_p = initial.top_p;
      form.enabled = initial.enabled;
      form.current_prompt_version_id = initial.current_prompt_version_id;
    } else {
      form.kind = "main";
      form.label = "";
      form.model = "doubao-pro";
      form.temperature = 0.7;
      form.top_p = 1.0;
      form.enabled = true;
      form.current_prompt_version_id = null;
    }
  },
  { immediate: true },
);

async function onSubmit() {
  if (!formRef.value) return;
  const valid = await formRef.value.validate().catch(() => false);
  if (!valid) return;

  const now = new Date().toISOString();
  const value: RoleConfigRead = {
    id: props.initial?.id ?? 0,
    campaign_id: props.initial?.campaign_id ?? 0,
    kind: form.kind,
    label: needsLabel.value ? form.label.trim() : null,
    model: form.model,
    current_prompt_version_id: form.current_prompt_version_id,
    temperature: form.temperature,
    top_p: form.top_p,
    ext_params: props.initial?.ext_params ?? {},
    enabled: form.enabled,
    created_at: props.initial?.created_at ?? now,
    updated_at: now,
  };
  emit("save", value);
}

function onCancel() {
  emit("update:modelValue", false);
}
</script>

<style scoped>
.hint {
  font-size: 12px;
  color: #909399;
  line-height: 1.6;
}
</style>
