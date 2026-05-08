<template>
  <el-dialog
    :model-value="modelValue"
    :title="isEdit ? '编辑任务' : '新建任务'"
    width="640px"
    @update:model-value="emit('update:modelValue', $event)"
    @close="onClose"
  >
    <el-alert type="info" :closable="false" class="info">
      PR #3 ships the basic fields. The full 9-tab nested config (角色 / 裁判 /
      润色 / 垫词 / 回调 / 时间窗口 / 重试 / 勿打 / 沉默 / 打断保护 / 收尾 /
      转人工) is delivered by a follow-up PR.
    </el-alert>

    <el-form
      ref="formRef"
      :model="form"
      :rules="rules"
      label-width="120px"
      class="form"
    >
      <el-form-item label="任务名称" prop="name">
        <el-input v-model="form.name" placeholder="例如：1 月新客回访" />
      </el-form-item>
      <el-form-item label="并发上限" prop="concurrency">
        <el-input-number v-model="form.concurrency" :min="1" :max="64" />
      </el-form-item>
      <el-form-item label="默认回复" prop="default_replies">
        <el-input
          v-model="defaultRepliesInput"
          type="textarea"
          :rows="3"
          placeholder="每行一句默认兜底回复"
        />
        <div class="hint">
          全部裁判否决 / 全部候选解析失败时随机抽取一条作为兜底（按 ai-pipeline spec）
        </div>
      </el-form-item>
    </el-form>

    <template #footer>
      <el-button @click="onCancel">取消</el-button>
      <el-button type="primary" :loading="saving" @click="onSubmit">保存</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ElMessage, type FormInstance, type FormRules } from "element-plus";
import { computed, reactive, ref, watch } from "vue";

import { useCampaignsStore } from "@/stores/campaigns";
import type { CampaignCreate, CampaignSummary } from "@/types/campaign";

const props = defineProps<{
  modelValue: boolean;
  initial: CampaignSummary | null;
}>();

const emit = defineEmits<{
  (e: "update:modelValue", value: boolean): void;
  (e: "saved"): void;
}>();

const store = useCampaignsStore();
const formRef = ref<FormInstance | null>(null);
const saving = ref(false);

const form = reactive<CampaignCreate>({
  name: "",
  concurrency: 1,
  default_replies: [],
});
const defaultRepliesInput = ref("");

const isEdit = computed(() => Boolean(props.initial));

const rules: FormRules = {
  name: [{ required: true, message: "请输入任务名称", trigger: "blur" }],
  concurrency: [{ required: true, message: "请输入并发上限", trigger: "blur" }],
};

watch(
  () => [props.modelValue, props.initial] as const,
  ([open, initial]) => {
    if (!open) return;
    if (initial) {
      form.name = initial.name;
      form.concurrency = initial.concurrency;
      form.default_replies = [...initial.default_replies];
    } else {
      form.name = "";
      form.concurrency = 1;
      form.default_replies = [];
    }
    defaultRepliesInput.value = (form.default_replies ?? []).join("\n");
  },
  { immediate: true },
);

async function onSubmit() {
  if (!formRef.value) return;
  const valid = await formRef.value.validate().catch(() => false);
  if (!valid) return;

  form.default_replies = defaultRepliesInput.value
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);

  saving.value = true;
  try {
    if (props.initial) {
      await store.update(props.initial.id, form);
      ElMessage.success("已更新");
    } else {
      await store.create(form);
      ElMessage.success("已创建");
    }
    emit("saved");
    emit("update:modelValue", false);
  } catch {
    ElMessage.error(isEdit.value ? "更新失败" : "创建失败");
  } finally {
    saving.value = false;
  }
}

function onCancel() {
  emit("update:modelValue", false);
}

function onClose() {
  // Reset on every close so a stale form doesn't bleed into the next open.
  formRef.value?.resetFields();
}
</script>

<style scoped>
.info {
  margin-bottom: 16px;
}
.form {
  margin-top: 8px;
}
.hint {
  font-size: 12px;
  color: #909399;
  line-height: 1.6;
}
</style>
