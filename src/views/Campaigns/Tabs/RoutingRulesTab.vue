<template>
  <div class="routing-tab">
    <el-alert
      type="info"
      :closable="false"
      show-icon
      class="intro"
      title="门控路由"
      description="旁路监管（在「AI 配置」里增删）并行判定，引擎按下方规则顺序逐条匹配，第一条命中即生效；都不命中则继续对话。规则动作可转移状态或切到重组流（口语化重说上一句 / 补上被打断内容）。"
    />

    <el-form label-width="160px" class="form">
      <el-form-item label="连续重组上限">
        <el-input-number v-model="form.max_continuous_restructure" :min="0" />
        <div class="hint">连续重组达到该次数后停止重组、改播兜底语，避免 AI 复读。</div>
      </el-form-item>

      <el-divider content-position="left">开口前门控 (gating)</el-divider>

      <el-form-item label="人设并发上限">
        <el-input-number v-model="form.persona_fanout_cap" :min="1" :max="3" />
        <div class="hint">
          投机并行的人设总数（含主对话），上限 3。设为 1 即关闭多人设。旁路监管选中其一、其余取消（厂商按取消前已生成的 token 计费）。
        </div>
      </el-form-item>
      <el-form-item label="门控超时 (ms)">
        <el-input-number v-model="form.referee_timeout_ms" :min="1" :step="100" />
        <div class="hint">旁路监管在开口前需在该时限内给出判定；超时则按下方兜底路由放行。默认 600ms。</div>
      </el-form-item>
      <el-form-item label="超时兜底路由">
        <el-select v-model="form.referee_fail_open_route" style="width: 280px" placeholder="选择兜底路由">
          <el-option
            v-for="r in failOpenRoutes"
            :key="r.value"
            :label="r.label"
            :value="r.value"
          />
        </el-select>
        <div class="hint">门控超时 / 判定无效 / 置信度过低时直接放行的路由。默认主对话 (main)。</div>
      </el-form-item>
    </el-form>

    <div class="header">
      <span class="title">路由规则（顺序即优先级）</span>
      <el-button type="primary" size="small" :disabled="refereeLabels.length === 0" @click="addRule">
        + 新增规则
      </el-button>
    </div>

    <el-alert
      v-if="refereeLabels.length === 0"
      type="warning"
      :closable="false"
      show-icon
      title="尚无旁路监管"
      description="请先在「AI 配置」中添加至少一个旁路监管（kind=referee 并填写标识），才能编辑路由规则。"
    />

    <el-table v-else :data="form.routing_rules" border>
      <el-table-column label="#" type="index" width="48" />
      <el-table-column label="旁路监管" width="160">
        <template #default="{ row }">
          <el-select v-model="row.referee" size="small" placeholder="旁路监管 label">
            <el-option v-for="l in refereeLabels" :key="l" :label="l" :value="l" />
          </el-select>
        </template>
      </el-table-column>
      <el-table-column label="匹配 category">
        <template #default="{ row }">
          <el-select
            v-model="row.match"
            size="small"
            multiple
            filterable
            allow-create
            default-first-option
            placeholder="输入旁路监管输出的分类值"
            style="width: 100%"
          />
        </template>
      </el-table-column>
      <el-table-column label="动作" width="420">
        <template #default="{ row }">
          <div class="action-cell">
            <el-select
              :model-value="row.action.type"
              size="small"
              style="width: 110px"
              @change="(t: string) => onActionTypeChange(row, t)"
            >
              <el-option label="路由到角色" value="route" />
              <el-option label="工具" value="tool" />
              <el-option label="转移(旧)" value="transition" />
              <el-option label="重组(旧)" value="restructure" />
            </el-select>
            <template v-if="row.action.type === 'route'">
              <el-select v-model="row.action.to" size="small" style="width: 140px" placeholder="角色/内置">
                <el-option v-for="p in personaLabels" :key="p" :label="p" :value="p" />
                <el-option label="收尾(closing)" value="closing" />
                <el-option label="挽留(recovery)" value="recovery" />
                <el-option label="重组(restructure)" value="restructure" />
              </el-select>
              <el-select v-model="row.action.then_state" size="small" clearable style="width: 130px" placeholder="then_state">
                <el-option v-for="s in thenStates" :key="s" :label="s" :value="s" />
              </el-select>
            </template>
            <template v-else-if="row.action.type === 'tool'">
              <el-select v-model="row.action.tool" size="small" style="width: 140px" placeholder="工具 alias">
                <el-option v-for="a in toolAliases" :key="a" :label="a" :value="a" />
              </el-select>
              <el-input
                v-if="isHangupTool(row.action.tool)"
                v-model="row.action.closing_phrase"
                size="small"
                clearable
                style="width: 190px"
                placeholder="结束语 (留空=直接挂断)"
              />
              <el-select v-model="row.action.then_state" size="small" clearable style="width: 130px" placeholder="then_state">
                <el-option v-for="s in thenStates" :key="s" :label="s" :value="s" />
              </el-select>
            </template>
            <template v-else-if="row.action.type === 'transition'">
              <el-select
                v-model="row.action.to"
                size="small"
                style="width: 130px"
                @change="(t: string) => onTransitionTargetChange(row, t)"
              >
                <el-option label="目标达成" value="goal_achieved" />
                <el-option label="转人工" value="transfer" />
                <el-option label="客户拒绝" value="customer_decline" />
              </el-select>
              <el-input
                v-if="row.action.to === 'goal_achieved'"
                v-model="row.action.goal_type"
                size="small"
                placeholder="goal_type"
                style="width: 110px"
              />
            </template>
            <template v-else>
              <el-select v-model="row.action.source" size="small" style="width: 150px">
                <el-option label="复述上一句" value="last_reply" />
                <el-option label="补打断残留" value="interrupt_remaining" />
              </el-select>
            </template>
          </div>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="140" fixed="right">
        <template #default="{ $index }">
          <el-button link :disabled="$index === 0" @click="move($index, -1)">↑</el-button>
          <el-button link :disabled="$index === form.routing_rules.length - 1" @click="move($index, 1)">↓</el-button>
          <el-button link type="danger" @click="removeRule($index)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";

import type {
  CampaignBase,
  RoleConfigRead,
  RoutingAction,
  RoutingRule,
  ThenState,
} from "@/types/campaign";

const thenStates: ThenState[] = [
  "LISTENING",
  "WRAPPING_UP",
  "ACTIVATING",
  "TRANSFERRING",
  "END",
];

const props = defineProps<{
  modelValue: CampaignBase;
  roleConfigs: RoleConfigRead[];
}>();

const emit = defineEmits<{
  (e: "update:modelValue", v: CampaignBase): void;
}>();

const form = computed({
  get: () => props.modelValue,
  set: (v) => emit("update:modelValue", v),
});

const refereeLabels = computed(() =>
  props.roleConfigs
    .filter((rc) => rc.kind === "referee" && rc.label)
    .map((rc) => rc.label as string),
);

const personaLabels = computed(() =>
  props.roleConfigs
    .filter((rc) => rc.kind === "persona" && rc.label)
    .map((rc) => rc.label as string),
);

const toolAliases = computed(() => Object.keys(props.modelValue.tools ?? {}));

// A per-rule closing_phrase only applies to hangup tools (transfer carries no
// phrase — single-source campaign.transfer_phrases). §11.
function isHangupTool(alias: string): boolean {
  return props.modelValue.tools?.[alias]?.type === "hangup";
}

// fail-open route options: main (the main persona) + configured personas + the
// builtin closing/recovery/restructure routes — the same target space the engine
// can resolve referee_fail_open_route to.
const failOpenRoutes = computed(() => [
  { value: "main", label: "主对话 (main)" },
  ...personaLabels.value.map((p) => ({ value: p, label: p })),
  { value: "closing", label: "收尾 (closing)" },
  { value: "recovery", label: "挽留 (recovery)" },
  { value: "restructure", label: "重组 (restructure)" },
]);

function addRule(): void {
  const rule: RoutingRule = {
    referee: refereeLabels.value[0] ?? "",
    match: [],
    action: { type: "transition", to: "goal_achieved", goal_type: "appointment" },
  };
  form.value.routing_rules.push(rule);
}

function removeRule(idx: number): void {
  form.value.routing_rules.splice(idx, 1);
}

function move(idx: number, delta: number): void {
  const rules = form.value.routing_rules;
  const target = idx + delta;
  if (target < 0 || target >= rules.length) return;
  const [item] = rules.splice(idx, 1);
  rules.splice(target, 0, item);
}

function onActionTypeChange(row: RoutingRule, type: string): void {
  let action: RoutingAction;
  if (type === "route") {
    action = { type: "route", to: personaLabels.value[0] ?? "closing", then_state: null };
  } else if (type === "tool") {
    action = { type: "tool", tool: toolAliases.value[0] ?? "", then_state: null };
  } else if (type === "restructure") {
    action = { type: "restructure", source: "last_reply" };
  } else {
    action = { type: "transition", to: "goal_achieved", goal_type: "appointment" };
  }
  row.action = action;
}

// Clear the stale goal_type when a transition target switches away from
// goal_achieved — otherwise the payload carries goal_type on a non-goal target
// and the backend rejects it (422). Set a default when switching TO goal_achieved.
// (cherry-forward fix from the superseded referee-hangup-action change.)
function onTransitionTargetChange(row: RoutingRule, to: string): void {
  if (row.action.type !== "transition") return;
  if (to === "goal_achieved") {
    row.action.goal_type = row.action.goal_type || "appointment";
  } else {
    row.action.goal_type = null;
  }
}

// Exposed for unit tests (the rule-editing logic is the testable surface; the
// Element Plus selects are awkward to drive in jsdom).
defineExpose({ addRule, removeRule, move, onActionTypeChange, onTransitionTargetChange, isHangupTool });
</script>

<style scoped>
.intro {
  margin-bottom: 16px;
}
.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin: 12px 0;
}
.title {
  font-size: 14px;
  font-weight: 600;
}
.hint {
  font-size: 12px;
  color: var(--isales-muted-foreground);
  line-height: 1.6;
}
.action-cell {
  display: flex;
  gap: 6px;
  align-items: center;
}
</style>
