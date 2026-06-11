<template>
  <p class="tab-intro">
    <Info :size="13" class="tab-intro__icon" />
    <span>判定客户插话是否算「打断」：选择配置模式后设定白名单 / 时长 / 字数 或自由组合规则树，并设定连续打断策略，避免误打断或被反复打断。</span>
  </p>
  <el-form label-width="220px" class="form">
    <el-form-item label="配置模式">
      <div class="mode-toggle">
        <el-tag
          :type="mode === 'advanced' ? 'warning' : 'info'"
          size="small"
          effect="plain"
        >
          当前：{{ mode === "advanced" ? "高级模式" : "普通模式" }}
        </el-tag>
        <el-button size="small" type="primary" plain @click="toggleMode">
          {{ mode === "advanced" ? "切换到普通模式" : "切换到高级模式" }}
        </el-button>
      </div>
      <div class="hint">
        <strong>普通模式</strong> = 由 白名单 + 最小时长 + 最小字数 自动合成默认打断规则；<strong>高级模式</strong>
        = 用「且/或/非 + 关键词/长度/时长/正则/分隔符」自由组合规则树。两种模式互斥，切到高级会用当前普通模式字段播种初始规则树，切回普通模式会清空规则树。
      </div>
    </el-form-item>

    <!-- 普通模式：三个标量字段（interruption_rules 保持 null，引擎合成默认树） -->
    <template v-if="mode === 'basic'">
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
        label="最小打断字数"
        :error="fieldErrors?.interruption_min_chars"
      >
        <el-input-number v-model="form.interruption_min_chars" :min="1" />
        <div class="hint">用户话达到该字数才算打断（过滤单字误识别）。</div>
      </el-form-item>
    </template>

    <!-- 高级模式：可组合规则树编辑器（写入 interruption_rules） -->
    <template v-else>
      <el-form-item label="打断规则" :error="fieldErrors?.interruption_rules">
        <div class="tree-wrap">
          <InterruptionRuleEditor
            v-if="form.interruption_rules != null"
            :model-value="form.interruption_rules"
            @update:model-value="onRulesUpdate"
          />
        </div>
        <div class="hint">
          以「且/或/非」组合「关键词 / 长度 / 时长 / 正则 / 分隔符」搭出判定规则；切回「普通模式」会清空此规则树、回到白名单+时长+字数合成。
        </div>
      </el-form-item>
    </template>

    <el-divider />

    <!-- 与模式无关：连续打断保护 -->
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
  </el-form>
</template>

<script setup lang="ts">
import { ElMessageBox } from "element-plus";
import { Info } from "lucide-vue-next";
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

// 两段互斥模式，由 interruption_rules 是否为 null 派生（null = 普通模式，默认）。
// 单个切换按钮：当前普通 → 切到高级；当前高级 → 切回普通（破坏性，切回时仅在
// 树相对「播种默认」已被编辑过时弹确认，避免误删管理员手搭的树）。
const mode = computed<"basic" | "advanced">(() =>
  form.value.interruption_rules == null ? "basic" : "advanced",
);

// 切换按钮：切到「另一个」模式。
function toggleMode(): void {
  void onModeChange(mode.value === "advanced" ? "basic" : "advanced");
}

// 当前树是否相对「由当前标量字段播种的默认树」有改动（用于决定是否需确认）。
function isEditedTree(): boolean {
  const cur = form.value.interruption_rules;
  if (cur == null) return false;
  const seeded = defaultTreeFrom(
    form.value.interruption_whitelist,
    form.value.interruption_min_duration_ms,
    form.value.interruption_min_chars,
  );
  return JSON.stringify(cur) !== JSON.stringify(seeded);
}

async function onModeChange(next: string | number | boolean): Promise<void> {
  if (next === "advanced") {
    // 非破坏：仅当尚无树时播种，已在高级不重播种（不覆盖已编辑的树）。
    if (form.value.interruption_rules == null) seedDefault();
    return;
  }
  // → 普通模式：清空树。仅在树被编辑过时确认；取消则保持高级（按钮派生自
  // mode，未改 interruption_rules 故仍显示「切换到普通模式」）。
  if (isEditedTree()) {
    try {
      await ElMessageBox.confirm(
        "切回「普通模式」会清空已编辑的打断规则树，且无法恢复。确定继续？",
        "清空规则树",
        {
          type: "warning",
          confirmButtonText: "清空并切换",
          cancelButtonText: "取消",
        },
      );
    } catch {
      return; // 取消 → 留在高级模式
    }
  }
  restoreDefault();
}

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

// 可组合规则树（高级）。NULL = 引擎从白名单+时长+字数合成默认树。
function seedDefault(): void {
  form.value.interruption_rules = defaultTreeFrom(
    form.value.interruption_whitelist,
    form.value.interruption_min_duration_ms,
    form.value.interruption_min_chars,
  );
}
function restoreDefault(): void {
  form.value.interruption_rules = null;
}
function onRulesUpdate(v: InterruptionRule): void {
  form.value.interruption_rules = v;
}

// Exposed for unit tests.
defineExpose({
  mode,
  toggleMode,
  onModeChange,
  isEditedTree,
  seedDefault,
  restoreDefault,
  onRulesUpdate,
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
.tree-wrap {
  width: 100%;
  margin-bottom: 8px;
}
.mode-toggle {
  display: flex;
  align-items: center;
  gap: 10px;
}
</style>
