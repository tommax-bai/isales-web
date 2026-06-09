<template>
  <el-form label-width="220px" class="form">
    <el-form-item label="打断白名单">
      <ExpandingTextarea
        v-model="whitelistText"
        placeholder="用分号(；)分隔 — 用户说出这些短语时不计入打断"
        @change="commitWhitelist"
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
      label="最大连续打断"
      :error="fieldErrors?.max_continuous_interruptions"
    >
      <el-input-number v-model="form.max_continuous_interruptions" :min="0" />
      <div class="hint">连续打断超过此次数触发下面的「连续打断策略」。</div>
    </el-form-item>
    <el-form-item label="连续打断策略">
      <el-radio-group v-model="form.continuous_interruption_strategy">
        <el-radio value="short_reply">短回复</el-radio>
        <el-radio value="listen_only">仅倾听</el-radio>
      </el-radio-group>
      <div class="hint">
        连续打断达上限后这一轮的应对：<strong>短回复</strong> = AI 仍回应、但压成一句话；<strong>仅倾听</strong>
        = AI 这轮不回应，只播「您请说」让客户先讲完并重置计数。
      </div>
    </el-form-item>

    <el-divider content-position="left">高级：可组合打断规则</el-divider>
    <el-form-item label="打断规则" :error="fieldErrors?.interruption_rules">
      <template v-if="form.interruption_rules == null">
        <div class="hint">
          当前使用<strong>默认规则</strong>：由上面的「打断白名单」+「最小打断时长」自动合成
          —— 白名单内精确命中不打断 · 其余话字数≥2 且 时长达标才算打断。
          需要更复杂的「且/或/非 + 正则/分隔符」组合时，再展开编辑。
        </div>
        <el-button size="small" @click="seedDefault">基于默认规则开始编辑</el-button>
      </template>
      <template v-else>
        <div class="tree-wrap">
          <InterruptionRuleEditor
            :model-value="form.interruption_rules"
            @update:model-value="onRulesUpdate"
          />
        </div>
        <el-button size="small" text type="danger" @click="restoreDefault">
          恢复为默认（清空规则树，回到白名单+时长合成）
        </el-button>
      </template>
    </el-form-item>
  </el-form>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue";

import {
  type CampaignBase,
  type InterruptionRule,
  defaultTreeFrom,
} from "@/types/campaign";
import ExpandingTextarea from "@/components/Common/ExpandingTextarea.vue";

import InterruptionRuleEditor from "./InterruptionRuleEditor.vue";

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

const whitelistText = ref(form.value.interruption_whitelist.join("；"));
watch(
  () => form.value.interruption_whitelist,
  (next) => {
    const j = next.join("；");
    if (j !== whitelistText.value) whitelistText.value = j;
  },
);
// 失焦时才解析（输入中不动 array，否则刚敲的分号被吃掉）。
function commitWhitelist(): void {
  form.value.interruption_whitelist = whitelistText.value
    .split(/[;；\n]/) // 兼容半角 ; / 全角 ； / 换行旧数据
    .map((s) => s.trim())
    .filter(Boolean);
}

// 可组合规则树（advanced）。NULL = 引擎从白名单+时长合成默认树。
function seedDefault(): void {
  form.value.interruption_rules = defaultTreeFrom(
    form.value.interruption_whitelist,
    form.value.interruption_min_duration_ms,
  );
}
function restoreDefault(): void {
  form.value.interruption_rules = null;
}
function onRulesUpdate(v: InterruptionRule): void {
  form.value.interruption_rules = v;
}

// Exposed for unit tests.
defineExpose({ seedDefault, restoreDefault, onRulesUpdate });
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
.tree-wrap {
  width: 100%;
  margin-bottom: 8px;
}
</style>
