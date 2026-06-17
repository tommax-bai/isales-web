<template>
  <p class="tab-intro">
    <Info :size="13" class="tab-intro__icon" />
    <span>达成目标后如何自然收尾：最多再聊几轮、最长多少秒，以及收尾结束语。</span>
  </p>
  <el-form label-width="200px" class="form">
    <el-form-item
      label="收尾最大轮数"
      :error="fieldErrors?.wrap_up_max_rounds"
    >
      <el-input-number v-model="form.wrap_up_max_rounds" :min="0" />
      <div class="hint">达成目标后最多再聊几轮自然收尾。</div>
    </el-form-item>
    <el-form-item
      label="收尾最大秒数"
      :error="fieldErrors?.wrap_up_max_seconds"
    >
      <el-input-number v-model="form.wrap_up_max_seconds" :min="0" />
    </el-form-item>
    <el-form-item
      label="收尾期静音挂断(ms)"
      :error="fieldErrors?.wrap_up_silence_hangup_ms"
    >
      <el-input-number
        v-model="form.wrap_up_silence_hangup_ms"
        :min="0"
        :step="500"
      />
      <div class="hint">
        收尾期客户静默超过此时长即主动挂断，不再播放「你好，还在么？」。建议设得比通话中段的静音阈值长，给客户告别后留思考时间。
      </div>
    </el-form-item>
    <el-form-item
      label="收尾裁判（无实质问题即挂）"
      :error="fieldErrors?.wrap_up_referee_enabled"
    >
      <el-switch v-model="form.wrap_up_referee_enabled" />
      <div class="hint">
        开启后，收尾期客户若再开口但没有实质性新问题（只是附和、客套、同意结束），AI 会直接挂断，不再硬聊。判不准时不挂、由轮数/时长兜底。
      </div>
    </el-form-item>
    <el-form-item label="收尾结束语">
      <ExpandingTextarea v-model="closingText" placeholder="每行一句" />
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

const closingText = ref(form.value.wrap_up_closing_phrases.join("\n"));
watch(
  () => form.value.wrap_up_closing_phrases,
  (next) => {
    const j = next.join("\n");
    if (j !== closingText.value) closingText.value = j;
  },
);
watch(closingText, (text) => {
  form.value.wrap_up_closing_phrases = text
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
