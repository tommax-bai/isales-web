<template>
  <el-form label-width="200px" class="form">
    <el-form-item label="重试间隔 (秒)">
      <el-input
        v-model="intervalsText"
        placeholder="逗号分隔，例如 60,300,1800"
      />
      <div class="hint">每次未接通后下次重试的等待秒数序列。</div>
    </el-form-item>
    <el-form-item label="重试最大次数" :error="fieldErrors?.retry_max_count">
      <el-input-number v-model="form.retry_max_count" :min="0" />
    </el-form-item>
    <el-form-item label="跟进间隔 (天)" :error="fieldErrors?.follow_up_interval_days">
      <el-input-number v-model="form.follow_up_interval_days" :min="1" />
      <div class="hint">达成阶段性目标后多久回访一次。空 = 不跟进。</div>
    </el-form-item>
    <el-form-item label="跟进最大次数" :error="fieldErrors?.follow_up_max_count">
      <el-input-number v-model="form.follow_up_max_count" :min="0" />
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

const intervalsText = ref(form.value.retry_intervals.join(", "));
watch(
  () => form.value.retry_intervals,
  (next) => {
    const j = next.join(", ");
    if (j !== intervalsText.value) intervalsText.value = j;
  },
);
watch(intervalsText, (text) => {
  form.value.retry_intervals = text
    .split(/[,\s]+/)
    .map((s) => Number(s.trim()))
    .filter((n) => Number.isFinite(n) && n > 0);
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
