<template>
  <div class="routing-tab">
    <el-alert
      type="info"
      :closable="false"
      show-icon
      class="intro"
      title="多流路由"
      description="裁判（在「AI 配置」里增删）并行判定，引擎按下方规则顺序逐条匹配，第一条命中即生效；都不命中则继续对话。规则动作可转移状态或切到重组流（口语化重说上一句 / 补上被打断内容）。"
    />

    <el-form label-width="160px" class="form">
      <el-form-item label="主裁判 (低置信兜底)">
        <el-select
          v-model="form.primary_referee_label"
          clearable
          placeholder="选择一个裁判作为主裁判"
          style="width: 280px"
        >
          <el-option
            v-for="label in refereeLabels"
            :key="label"
            :label="label"
            :value="label"
          />
        </el-select>
        <div class="hint">
          主裁判置信度低于阈值且无规则命中时，切重组流复述上一句拖一轮（需配置重组流）。
        </div>
      </el-form-item>
      <el-form-item label="连续重组上限">
        <el-input-number v-model="form.max_continuous_restructure" :min="0" />
        <div class="hint">连续重组达到该次数后停止重组、改播兜底语，避免 AI 复读。</div>
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
      title="尚无裁判"
      description="请先在「AI 配置」中添加至少一个裁判（kind=裁判 并填写标识），才能编辑路由规则。"
    />

    <el-table v-else :data="form.routing_rules" border>
      <el-table-column label="#" type="index" width="48" />
      <el-table-column label="裁判" width="160">
        <template #default="{ row }">
          <el-select v-model="row.referee" size="small" placeholder="裁判 label">
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
            placeholder="输入裁判输出的分类值"
            style="width: 100%"
          />
        </template>
      </el-table-column>
      <el-table-column label="动作" width="320">
        <template #default="{ row }">
          <div class="action-cell">
            <el-select
              :model-value="row.action.type"
              size="small"
              style="width: 96px"
              @change="(t: string) => onActionTypeChange(row, t)"
            >
              <el-option label="转移" value="transition" />
              <el-option label="重组" value="restructure" />
            </el-select>
            <template v-if="row.action.type === 'transition'">
              <el-select v-model="row.action.to" size="small" style="width: 130px">
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
} from "@/types/campaign";

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
  const action: RoutingAction =
    type === "restructure"
      ? { type: "restructure", source: "last_reply" }
      : { type: "transition", to: "goal_achieved", goal_type: "appointment" };
  row.action = action;
}

// Exposed for unit tests (the rule-editing logic is the testable surface; the
// Element Plus selects are awkward to drive in jsdom).
defineExpose({ addRule, removeRule, move, onActionTypeChange });
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
  color: #909399;
  line-height: 1.6;
}
.action-cell {
  display: flex;
  gap: 6px;
  align-items: center;
}
</style>
