<template>
  <p class="tab-intro">
    <Info :size="13" class="tab-intro__icon" />
    <span>用户长时间不出声时 AI 主动开口唤醒；多次唤醒无效则按兜底语挂断或转人工。</span>
  </p>
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
      <ExpandingTextarea
        v-model="silencePhrasesText"
        placeholder="用分号(；)分隔多句，如：请问您还在吗？；您好，能听到吗？"
        @change="commitSilencePhrases"
      />
      <div class="hint">沉默达阈值时按顺序播一句尝试唤醒客户；用分号分隔。</div>
    </el-form-item>
    <el-form-item label="挂断兜底语">
      <el-input
        v-model="form.silence_hangup_phrase"
        placeholder="如：看来现在不太方便，那我先挂了，祝您生活愉快。"
      />
      <div class="hint">
        沉默激活已用满「最大激活次数」后，客户再次静音达到「沉默阈值」时，播这句然后直接挂断；留空则直接挂断、不播话术。
      </div>
    </el-form-item>
  </el-form>
</template>

<script setup lang="ts">
import { Info } from "lucide-vue-next";
import { computed, ref, watch } from "vue";

import type { CampaignBase } from "@/types/campaign";
import ExpandingTextarea from "@/components/Common/ExpandingTextarea.vue";

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
// 失焦时才解析（输入中不动 array，否则 split+filter+rejoin 会把刚敲的分号吃掉）。
function commitSilencePhrases(): void {
  form.value.silence_phrases = silencePhrasesText.value
    .split(/[;；\n]/) // 兼容半角 ; / 全角 ； / 换行旧数据
    .map((s) => s.trim())
    .filter(Boolean);
}
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
