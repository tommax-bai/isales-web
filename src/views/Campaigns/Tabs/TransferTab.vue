<template>
  <p class="tab-intro">
    <Info :size="13" class="tab-intro__icon" />
    <span>满足条件时把通话转接人工坐席：关键词 / 意图分 / 对话轮数 / LLM 判定，可多路并存。</span>
  </p>
  <el-form label-width="220px" class="form">
    <h4 class="section">关键词触发</h4>
    <el-form-item label="启用">
      <el-switch v-model="form.transfer_keyword_enabled" />
    </el-form-item>
    <el-form-item label="关键词">
      <ExpandingTextarea
        v-model="keywordsText"
        placeholder="用分号(；)分隔 — 用户说出即触发转人工"
        :disabled="!form.transfer_keyword_enabled"
        @change="commitKeywords"
      />
    </el-form-item>

    <h4 class="section">意图触发</h4>
    <el-form-item label="启用">
      <el-switch v-model="form.transfer_intent_enabled" />
    </el-form-item>
    <el-form-item
      label="意图阈值 (0–1)"
      :error="fieldErrors?.transfer_intent_threshold"
    >
      <el-input-number
        v-model="form.transfer_intent_threshold"
        :min="0"
        :max="1"
        :step="0.05"
        :precision="2"
        :disabled="!form.transfer_intent_enabled"
      />
    </el-form-item>

    <h4 class="section">轮次触发</h4>
    <el-form-item label="启用">
      <el-switch v-model="form.transfer_round_enabled" />
    </el-form-item>
    <el-form-item label="对话轮数阈值">
      <el-input-number
        v-model="form.transfer_round_threshold"
        :min="1"
        :disabled="!form.transfer_round_enabled"
      />
      <div class="hint">
        对话轮数达到此值且目标仍未达成时转人工——兜底防止 AI 原地打转。
      </div>
    </el-form-item>

    <h4 class="section">LLM 触发</h4>
    <el-form-item label="启用">
      <el-switch v-model="form.transfer_llm_enabled" />
    </el-form-item>
    <el-form-item label="prompt 版本 ID">
      <el-input-number
        v-model="form.transfer_llm_prompt_version_id"
        :min="1"
        :disabled="!form.transfer_llm_enabled"
      />
    </el-form-item>

    <h4 class="section">转接话术</h4>
    <el-form-item label="转接兜底语">
      <ExpandingTextarea
        v-model="phrasesText"
        placeholder="每行一句 — 转人工前对用户说"
      />
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

const keywordsText = ref(form.value.transfer_keywords.join("；"));
watch(
  () => form.value.transfer_keywords,
  (next) => {
    const j = next.join("；");
    if (j !== keywordsText.value) keywordsText.value = j;
  },
);
// 失焦时才解析（输入中不动 array，否则刚敲的分号被吃掉）。
function commitKeywords(): void {
  form.value.transfer_keywords = keywordsText.value
    .split(/[;；\n]/) // 兼容半角 ; / 全角 ； / 换行旧数据
    .map((s) => s.trim())
    .filter(Boolean);
}

const phrasesText = ref(form.value.transfer_phrases.join("\n"));
watch(
  () => form.value.transfer_phrases,
  (next) => {
    const j = next.join("\n");
    if (j !== phrasesText.value) phrasesText.value = j;
  },
);
watch(phrasesText, (text) => {
  form.value.transfer_phrases = text
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);
});
</script>

<style scoped>
.form {
  max-width: 720px;
}
.section {
  margin: 16px 0 8px 0;
  font-size: 14px;
  color: #303133;
  border-left: 3px solid #409eff;
  padding-left: 8px;
}
.hint {
  font-size: 12px;
  color: #909399;
  line-height: 1.6;
}
</style>
