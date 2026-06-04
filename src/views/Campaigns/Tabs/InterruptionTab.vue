<template>
  <el-form label-width="220px" class="form">
    <el-form-item label="打断白名单">
      <el-input
        v-model="whitelistText"
        type="textarea"
        :rows="3"
        placeholder="每行一个短语 — 用户说出这些时不计入打断"
      />
    </el-form-item>
    <el-form-item
      label="最小打断时长 (ms)"
      :error="fieldErrors?.interruption_min_duration_ms"
    >
      <el-input-number
        v-model="form.interruption_min_duration_ms"
        :min="0"
        :step="50"
      />
      <div class="hint">低于此时长的用户语音不视为打断。</div>
    </el-form-item>
    <el-form-item
      label="ASR 端点静默 (ms)"
      :error="fieldErrors?.asr_eos_silence_ms"
    >
      <el-input-number
        v-model="form.asr_eos_silence_ms"
        :min="0"
        :step="50"
        placeholder="留空走默认 400ms"
      />
      <div class="hint">
        用户停顿多久判定为「说完」、AI 开口。越小开口越快；<strong
          >太短会把停顿误判成说完打断客户</strong
        >。留空使用默认 400ms。
      </div>
    </el-form-item>
    <el-form-item
      label="最大连续打断"
      :error="fieldErrors?.max_continuous_interruptions"
    >
      <el-input-number v-model="form.max_continuous_interruptions" :min="0" />
      <div class="hint">连续打断超过此次数触发策略切换。</div>
    </el-form-item>
    <el-form-item label="连续打断策略">
      <el-radio-group v-model="form.continuous_interruption_strategy">
        <el-radio value="short_reply">短回复</el-radio>
        <el-radio value="listen_only">仅倾听</el-radio>
      </el-radio-group>
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

const whitelistText = ref(form.value.interruption_whitelist.join("\n"));
watch(
  () => form.value.interruption_whitelist,
  (next) => {
    const j = next.join("\n");
    if (j !== whitelistText.value) whitelistText.value = j;
  },
);
watch(whitelistText, (text) => {
  form.value.interruption_whitelist = text
    .split("\n")
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
