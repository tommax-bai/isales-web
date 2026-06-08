<template>
  <el-form label-width="200px" class="form">
    <el-form-item
      label="沉默阈值 (ms)"
      :error="fieldErrors?.silence_threshold_ms"
    >
      <el-input-number
        v-model="form.silence_threshold_ms"
        :min="0"
        :step="100"
      />
      <div class="hint">用户连续静音超过此时长触发"沉默激活"流程。</div>
    </el-form-item>
    <el-form-item
      label="最大激活次数"
      :error="fieldErrors?.max_silence_activations"
    >
      <el-input-number v-model="form.max_silence_activations" :min="0" />
      <div class="hint">同一通电话内沉默激活的上限；超出后挂断或转人工。</div>
    </el-form-item>
    <el-form-item label="沉默激活兜底语">
      <el-input
        v-model="silencePhrasesText"
        type="textarea"
        :rows="3"
        placeholder="用分号(；)分隔多句，如：请问您还在吗？；您好，能听到吗？"
      />
      <div class="hint">沉默达阈值时按顺序播一句尝试唤醒客户；用分号分隔。</div>
    </el-form-item>
    <el-form-item label="挂断兜底语">
      <el-input
        v-model="form.silence_hangup_phrase"
        placeholder="达到 max_silence_activations 后说出"
      />
    </el-form-item>
    <el-form-item
      label="无进展超时 (s)"
      :error="fieldErrors?.max_no_progress_seconds"
    >
      <el-input-number v-model="form.max_no_progress_seconds" :min="0" />
      <div class="hint">通话超过此时长无新进展则视为僵局，可挂断。空 = 不启用。</div>
    </el-form-item>
  </el-form>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue";

import type { CampaignBase } from "@/types/campaign";

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

const silencePhrasesText = ref(form.value.silence_phrases.join("；"));
watch(
  () => form.value.silence_phrases,
  (next) => {
    const j = next.join("；");
    if (j !== silencePhrasesText.value) silencePhrasesText.value = j;
  },
);
watch(silencePhrasesText, (text) => {
  // 分号分隔（兼容半角 ; / 全角 ； / 换行旧数据）。
  form.value.silence_phrases = text
    .split(/[;；\n]/)
    .map((s) => s.trim())
    .filter(Boolean);
});
</script>

<style scoped>
.form {
  max-width: 720px;
}
.hint {
  font-size: 12px;
  color: #909399;
  line-height: 1.6;
}
</style>
