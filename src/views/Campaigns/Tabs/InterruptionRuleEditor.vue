<template>
  <div class="rule-node" :class="{ composite: isComposite }">
    <div class="node-head">
      <el-select
        :model-value="model.type"
        size="small"
        class="type-select"
        @update:model-value="onTypeChange"
      >
        <el-option-group label="组合">
          <el-option label="且 (全部满足)" value="and" />
          <el-option label="或 (任一满足)" value="or" />
          <el-option label="非 (取反)" value="not" />
        </el-option-group>
        <el-option-group label="条件">
          <el-option label="关键词" value="keyword" />
          <el-option label="长度 (字数)" value="length" />
          <el-option label="时长 (ms)" value="duration" />
          <el-option label="正则" value="regex" />
          <el-option label="分隔符" value="split_by_delimiter" />
          <el-option label="无 (禁用打断)" value="none" />
        </el-option-group>
      </el-select>
      <span class="node-summary">{{ summary }}</span>
    </div>

    <!-- composite: and / or -->
    <div v-if="model.type === 'and' || model.type === 'or'" class="children">
      <div v-for="(child, i) in model.rules" :key="i" class="child-row">
        <InterruptionRuleEditor
          :model-value="child"
          @update:model-value="(v: InterruptionRule) => replaceChild(i, v)"
        />
        <el-button
          text
          type="danger"
          size="small"
          :disabled="model.rules.length <= 1"
          title="删除此子规则"
          @click="removeChild(i)"
        >
          删除
        </el-button>
      </div>
      <el-button text type="primary" size="small" @click="addChild">+ 加子规则</el-button>
    </div>

    <!-- composite: not -->
    <div v-else-if="model.type === 'not'" class="children">
      <InterruptionRuleEditor
        :model-value="model.rule"
        @update:model-value="replaceNotChild"
      />
    </div>

    <!-- leaf: keyword -->
    <div v-else-if="model.type === 'keyword'" class="leaf">
      <el-select
        :model-value="model.values"
        multiple
        filterable
        allow-create
        default-first-option
        size="small"
        class="tags"
        placeholder="输入词后回车，可多个"
        @update:model-value="(v: string[]) => patch({ values: v })"
      />
      <el-radio-group
        :model-value="model.match"
        size="small"
        @update:model-value="(v: 'contains' | 'exact') => patch({ match: v })"
      >
        <el-radio value="contains">包含 (子串)</el-radio>
        <el-radio value="exact">精确 (整句相等)</el-radio>
      </el-radio-group>
      <div class="hint">命中任一词即满足。「包含」=用户话里含该词；「精确」=整句正好等于该词。</div>
    </div>

    <!-- leaf: length -->
    <div v-else-if="model.type === 'length'" class="leaf">
      <span class="lbl">字数 ≥</span>
      <el-input-number
        :model-value="model.value"
        :min="1"
        size="small"
        @update:model-value="(v: number) => patch({ value: v ?? 1 })"
      />
      <div class="hint">用户话达到该字数才算打断（过滤单字误识别）。</div>
    </div>

    <!-- leaf: duration -->
    <div v-else-if="model.type === 'duration'" class="leaf">
      <span class="lbl">时长 ≥</span>
      <el-input-number
        :model-value="model.value_ms"
        :min="0"
        :step="50"
        size="small"
        @update:model-value="(v: number) => patch({ value_ms: v ?? 0 })"
      />
      <span class="lbl">ms</span>
      <div class="hint">用户说话持续超过该时长才算打断。</div>
    </div>

    <!-- leaf: regex -->
    <div v-else-if="model.type === 'regex'" class="leaf">
      <el-input
        :model-value="model.pattern"
        size="small"
        class="regex-input"
        placeholder="如 等等?|不要|打断"
        :maxlength="128"
        @update:model-value="(v: string) => patch({ pattern: v })"
      />
      <div class="hint">用户话匹配该正则即满足（最多 128 字）。</div>
    </div>

    <!-- leaf: split_by_delimiter -->
    <div v-else-if="model.type === 'split_by_delimiter'" class="leaf">
      <el-select
        :model-value="model.delimiters"
        multiple
        filterable
        allow-create
        default-first-option
        size="small"
        class="tags"
        placeholder="输入分隔符后回车"
        @update:model-value="(v: string[]) => patch({ delimiters: v })"
      />
      <div class="hint">用户话含任一分隔符即满足。</div>
    </div>

    <!-- leaf: none -->
    <div v-else class="leaf">
      <div class="hint">恒不满足 —— 该分支禁用打断。</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";

import {
  type AndRule,
  type InterruptionRule,
  type InterruptionRuleType,
  type NotRule,
  type OrRule,
  makeRule,
} from "@/types/campaign";

const props = defineProps<{ modelValue: InterruptionRule }>();
const emit = defineEmits<{ (e: "update:modelValue", v: InterruptionRule): void }>();

// Narrowed view of the current node (template uses model.type guards; the casts
// inside per-type handlers are safe because they only run for that type).
const model = computed(() => props.modelValue);
const isComposite = computed(() =>
  ["and", "or", "not"].includes(props.modelValue.type),
);

// Switching type rebuilds the node as that type's default shape (design D2) —
// never keep old fields (would produce an illegal discriminated-union shape).
function onTypeChange(t: InterruptionRuleType): void {
  if (t !== props.modelValue.type) emit("update:modelValue", makeRule(t));
}

// Immutable patch of the current leaf's fields (design D3 — emit a fresh object,
// never mutate). Loosely typed: each call site is inside a `model.type` guard so
// the field set is valid for that node type.
function patch(p: Record<string, unknown>): void {
  emit("update:modelValue", {
    ...(props.modelValue as unknown as Record<string, unknown>),
    ...p,
  } as unknown as InterruptionRule);
}

// and/or children — immutable array updates.
function replaceChild(i: number, v: InterruptionRule): void {
  const node = props.modelValue as AndRule | OrRule;
  emit("update:modelValue", {
    ...node,
    rules: node.rules.map((r, idx) => (idx === i ? v : r)),
  });
}
function addChild(): void {
  const node = props.modelValue as AndRule | OrRule;
  emit("update:modelValue", { ...node, rules: [...node.rules, makeRule("length")] });
}
function removeChild(i: number): void {
  const node = props.modelValue as AndRule | OrRule;
  if (node.rules.length <= 1) return;
  emit("update:modelValue", {
    ...node,
    rules: node.rules.filter((_, idx) => idx !== i),
  });
}
function replaceNotChild(v: InterruptionRule): void {
  const node = props.modelValue as NotRule;
  emit("update:modelValue", { ...node, rule: v });
}

// Read-only one-liner summary (design Q3 — aids comprehension of the tree).
const summary = computed(() => describe(props.modelValue));
function describe(r: InterruptionRule): string {
  switch (r.type) {
    case "and":
      return `且(${r.rules.map(describe).join("，")})`;
    case "or":
      return `或(${r.rules.map(describe).join("，")})`;
    case "not":
      return `非(${describe(r.rule)})`;
    case "keyword":
      return `关键词${r.match === "exact" ? "精确" : "含"}[${r.values.join("/") || "…"}]`;
    case "length":
      return `字数≥${r.value}`;
    case "duration":
      return `时长≥${r.value_ms}ms`;
    case "regex":
      return `正则/${r.pattern || "…"}/`;
    case "split_by_delimiter":
      return `分隔符[${r.delimiters.join("/") || "…"}]`;
    case "none":
      return "禁用";
  }
}

// Exposed for unit tests.
defineExpose({ onTypeChange, replaceChild, addChild, removeChild, replaceNotChild });
</script>

<style scoped>
.rule-node {
  padding: 8px 10px;
  border: 1px solid var(--isales-border, #dcdfe6);
  border-radius: 6px;
  background: var(--isales-bg-soft, #fafafa);
}
.rule-node.composite {
  border-left: 3px solid var(--isales-primary, #409eff);
}
.node-head {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}
.type-select {
  width: 160px;
}
.node-summary {
  font-size: 12px;
  color: var(--isales-text-secondary, #909399);
}
.children {
  margin-top: 8px;
  padding-left: 14px;
  border-left: 1px dashed var(--isales-border, #dcdfe6);
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.child-row {
  display: flex;
  align-items: flex-start;
  gap: 6px;
}
.child-row > .rule-node {
  flex: 1;
}
.leaf {
  margin-top: 8px;
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}
.tags {
  min-width: 240px;
}
.regex-input {
  width: 280px;
}
.lbl {
  font-size: 13px;
  color: var(--isales-text-regular, #606266);
}
.hint {
  flex-basis: 100%;
  font-size: 12px;
  color: var(--isales-text-secondary, #909399);
  line-height: 1.5;
}
</style>
