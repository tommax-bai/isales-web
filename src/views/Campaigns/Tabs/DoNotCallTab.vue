<template>
  <el-form label-width="200px" class="form">
    <el-form-item label="勿打关键词">
      <ExpandingTextarea
        v-model="keywordsText"
        placeholder="每行一个 — 用户说出即加入勿打名单"
      />
      <div class="hint">命中关键词的线索后续不再外呼（retry-followup spec § 勿打）。</div>
    </el-form-item>
    <el-form-item label="LLM 判勿打">
      <el-switch v-model="form.do_not_call_llm_enabled" />
    </el-form-item>
    <el-form-item label="LLM prompt 版本 ID">
      <el-input-number
        v-model="form.do_not_call_llm_prompt_version_id"
        :min="1"
        :disabled="!form.do_not_call_llm_enabled"
      />
    </el-form-item>
  </el-form>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue";

import type { CampaignBase } from "@/types/campaign";
import ExpandingTextarea from "@/components/Common/ExpandingTextarea.vue";

const props = defineProps<{
  modelValue: CampaignBase;
}>();
const emit = defineEmits<{
  (e: "update:modelValue", v: CampaignBase): void;
}>();

const form = computed({
  get: () => props.modelValue,
  set: (v) => emit("update:modelValue", v),
});

const keywordsText = ref(form.value.do_not_call_keywords.join("\n"));
watch(
  () => form.value.do_not_call_keywords,
  (next) => {
    const j = next.join("\n");
    if (j !== keywordsText.value) keywordsText.value = j;
  },
);
watch(keywordsText, (text) => {
  form.value.do_not_call_keywords = text
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
