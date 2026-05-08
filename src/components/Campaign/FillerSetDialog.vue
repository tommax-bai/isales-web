<template>
  <el-dialog
    :model-value="modelValue"
    :title="isEdit ? '编辑垫词集合' : '新增垫词集合'"
    width="720px"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <el-form ref="formRef" :model="form" :rules="rules" label-width="120px">
      <el-form-item label="名称" prop="name">
        <el-input v-model="form.name" placeholder="例如：思考垫词" />
      </el-form-item>
      <el-form-item label="排序" prop="sort_order">
        <el-input-number v-model="form.sort_order" :min="0" />
      </el-form-item>
    </el-form>

    <div class="phrases-header">
      <span class="title">垫词列表</span>
      <el-button size="small" type="primary" @click="addPhrase">+ 新增</el-button>
    </div>

    <el-table :data="form.phrases" stripe size="small">
      <el-table-column label="文本">
        <template #default="{ row }">
          <el-input v-model="row.phrase" size="small" />
        </template>
      </el-table-column>
      <el-table-column label="音频 URL" width="220">
        <template #default="{ row }">
          <el-input
            v-model="row.audio_url"
            size="small"
            placeholder="可空 — 由 TTS 异步生成"
          />
        </template>
      </el-table-column>
      <el-table-column label="状态" width="120">
        <template #default="{ row }">
          <el-select v-model="row.generation_status" size="small">
            <el-option label="待生成" value="pending" />
            <el-option label="生成中" value="running" />
            <el-option label="成功" value="succeeded" />
            <el-option label="失败" value="failed" />
          </el-select>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="80">
        <template #default="{ $index }">
          <el-button link type="danger" @click="removePhrase($index)">
            删除
          </el-button>
        </template>
      </el-table-column>
    </el-table>

    <template #footer>
      <el-button @click="onCancel">取消</el-button>
      <el-button type="primary" @click="onSubmit">保存</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import type { FormInstance, FormRules } from "element-plus";
import { computed, reactive, ref, watch } from "vue";

import type {
  FillerPhraseRead,
  FillerSetRead,
  GenerationStatus,
} from "@/types/campaign";

const props = defineProps<{
  modelValue: boolean;
  initial: FillerSetRead | null;
}>();

const emit = defineEmits<{
  (e: "update:modelValue", v: boolean): void;
  (e: "save", v: FillerSetRead): void;
}>();

const formRef = ref<FormInstance | null>(null);

interface PhraseRow {
  id?: number;
  phrase: string;
  audio_url: string | null;
  generation_status: GenerationStatus;
}

interface FormState {
  name: string;
  sort_order: number;
  phrases: PhraseRow[];
}

const form = reactive<FormState>({ name: "", sort_order: 0, phrases: [] });
const isEdit = computed(() => Boolean(props.initial));

const rules: FormRules = {
  name: [{ required: true, message: "请输入名称" }],
};

watch(
  () => [props.modelValue, props.initial] as const,
  ([open, initial]) => {
    if (!open) return;
    if (initial) {
      form.name = initial.name;
      form.sort_order = initial.sort_order;
      form.phrases = initial.phrases.map((p) => ({
        id: p.id,
        phrase: p.phrase,
        audio_url: p.audio_url,
        generation_status: p.generation_status,
      }));
    } else {
      form.name = "";
      form.sort_order = 0;
      form.phrases = [];
    }
  },
  { immediate: true },
);

function addPhrase(): void {
  form.phrases.push({
    phrase: "",
    audio_url: null,
    generation_status: "pending",
  });
}

function removePhrase(idx: number): void {
  form.phrases.splice(idx, 1);
}

async function onSubmit(): Promise<void> {
  if (!formRef.value) return;
  const valid = await formRef.value.validate().catch(() => false);
  if (!valid) return;
  const now = new Date().toISOString();
  const value: FillerSetRead = {
    id: props.initial?.id ?? 0,
    campaign_id: props.initial?.campaign_id ?? 0,
    name: form.name,
    sort_order: form.sort_order,
    phrases: form.phrases.map((p, i) => ({
      id: p.id ?? -1 - i,
      filler_set_id: props.initial?.id ?? 0,
      phrase: p.phrase,
      audio_url: p.audio_url,
      generation_status: p.generation_status,
      created_at: now,
      updated_at: now,
    })) as FillerPhraseRead[],
    created_at: props.initial?.created_at ?? now,
    updated_at: now,
  };
  emit("save", value);
}

function onCancel(): void {
  emit("update:modelValue", false);
}
</script>

<style scoped>
.phrases-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin: 12px 0 8px;
}
.title {
  font-size: 13px;
  font-weight: 600;
}
</style>
