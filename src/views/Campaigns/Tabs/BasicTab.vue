<template>
  <el-form label-width="160px" class="basic-form">
    <el-form-item
      label="任务名称"
      :error="fieldErrors?.name"
      required
    >
      <el-input v-model="form.name" placeholder="例如：1 月新客回访" />
    </el-form-item>

    <el-form-item label="音色" :error="fieldErrors?.voice_id">
      <el-select
        v-model="form.voice_id"
        clearable
        :loading="voiceLoading"
        placeholder="选择音色"
        style="width: 320px"
      >
        <el-option
          v-for="v in voices"
          :key="v.id"
          :label="`${v.name} (${v.id})`"
          :value="v.id"
        />
      </el-select>
    </el-form-item>

    <el-form-item label="并发上限" :error="fieldErrors?.concurrency" required>
      <el-input-number v-model="form.concurrency" :min="1" :max="64" />
    </el-form-item>

    <el-form-item label="默认回复" :error="fieldErrors?.default_replies">
      <el-input
        v-model="defaultRepliesText"
        type="textarea"
        :rows="3"
        placeholder="每行一句兜底回复"
      />
      <div class="hint">
        全部裁判否决 / 全部候选解析失败时随机抽取一条作为兜底（按
        ai-pipeline spec）。
      </div>
    </el-form-item>

    <el-form-item label="提取字段" :error="fieldErrors?.extraction_fields">
      <el-table :data="form.extraction_fields" stripe size="small">
        <el-table-column label="字段名">
          <template #default="{ row }">
            <el-input v-model="row.name" size="small" />
          </template>
        </el-table-column>
        <el-table-column label="类型" width="160">
          <template #default="{ row }">
            <el-select v-model="row.type" size="small">
              <el-option label="字符串" value="string" />
              <el-option label="数字" value="number" />
              <el-option label="布尔" value="boolean" />
              <el-option label="时间" value="datetime" />
            </el-select>
          </template>
        </el-table-column>
        <el-table-column label="必填" width="90">
          <template #default="{ row }">
            <el-checkbox v-model="row.required" />
          </template>
        </el-table-column>
        <el-table-column label="说明">
          <template #default="{ row }">
            <el-input v-model="row.description" size="small" />
          </template>
        </el-table-column>
        <el-table-column label="操作" width="80">
          <template #default="{ $index }">
            <el-button link type="danger" @click="removeField($index)">
              删除
            </el-button>
          </template>
        </el-table-column>
      </el-table>
      <el-button class="add-btn" size="small" @click="addField">
        + 新增字段
      </el-button>
      <div class="hint">
        声明 role LLM 应抽取的字段（goal-achievement spec）。前端不解析，仅做
        schema 声明。
      </div>
    </el-form-item>
  </el-form>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";

import { voiceApi } from "@/api/voice";
import type { CampaignBase, ExtractionField } from "@/types/campaign";
import type { VoiceModel } from "@/types/voice";

const props = defineProps<{
  modelValue: CampaignBase;
  fieldErrors?: Record<string, string>;
}>();

const emit = defineEmits<{
  (e: "update:modelValue", v: CampaignBase): void;
}>();

const form = computed({
  get: () => props.modelValue,
  set: (v) => emit("update:modelValue", v),
});

const voices = ref<VoiceModel[]>([]);
const voiceLoading = ref(false);

onMounted(async () => {
  voiceLoading.value = true;
  try {
    voices.value = await voiceApi.list();
  } catch {
    // Voice list is non-fatal — user can still type a numeric voice_id.
  } finally {
    voiceLoading.value = false;
  }
});

const defaultRepliesText = ref(form.value.default_replies.join("\n"));
watch(
  () => form.value.default_replies,
  (next) => {
    const joined = next.join("\n");
    if (joined !== defaultRepliesText.value) defaultRepliesText.value = joined;
  },
);
watch(defaultRepliesText, (text) => {
  form.value.default_replies = text
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);
});

function addField(): void {
  const f: ExtractionField = { name: "", type: "string", required: false, description: "" };
  form.value.extraction_fields = [...form.value.extraction_fields, f];
}

function removeField(idx: number): void {
  form.value.extraction_fields = form.value.extraction_fields.filter(
    (_, i) => i !== idx,
  );
}
</script>

<style scoped>
.basic-form {
  max-width: 920px;
}
.hint {
  font-size: 12px;
  color: #909399;
  line-height: 1.6;
  margin-top: 4px;
}
.add-btn {
  margin-top: 8px;
}
</style>
