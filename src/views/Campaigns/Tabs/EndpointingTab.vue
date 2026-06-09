<template>
  <p class="tab-intro">
    <Info :size="13" class="tab-intro__icon" />
    <span>用户停顿多久判定为「说完一句」、AI开口接话。越小开口越快；太短会把句中停顿误判成说完、打断客户。</span>
  </p>
  <el-form label-width="200px" class="form">
    <el-form-item
      label="静默时长 (ms)"
      :error="fieldErrors?.asr_eos_silence_ms"
    >
      <el-input-number
        v-model="form.asr_eos_silence_ms"
        :min="0"
        :step="50"
        placeholder="留空走默认 400ms"
      />
      <div class="hint">留空使用默认 400ms。</div>
    </el-form-item>
  </el-form>
</template>

<script setup lang="ts">
import { Info } from "lucide-vue-next";
import { computed } from "vue";

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
