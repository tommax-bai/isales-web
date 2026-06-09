<template>
  <div class="tools-tab">
    <p class="tab-intro">
      <Info :size="13" class="tab-intro__icon" />
      <span>客户说了某类话时（关键词由旁路监管判定），AI 触发对应工具。挂断：主动结束本通电话；结束语为挂断前说的一句话，留空则直接挂断不播话术。同一种工具可被不同关键词复用、各说不同的结束语。</span>
    </p>

    <el-alert
      v-if="refereeLabels.length === 0"
      type="warning"
      :closable="false"
      show-icon
      title="尚无旁路监管"
      description="请先在「AI 配置」添加旁路监管角色——工具触发需要由旁路监管输出关键词来匹配。"
      class="intro"
    />

    <el-form v-if="refereeLabels.length > 1" label-width="100px" class="form">
      <el-form-item label="判定旁路监管">
        <el-select v-model="flatReferee" style="width: 240px" @change="rebuild">
          <el-option v-for="l in refereeLabels" :key="l" :label="l" :value="l" />
        </el-select>
        <span class="hint">这些关键词由哪个旁路监管输出（整表共用）</span>
      </el-form-item>
    </el-form>

    <div class="header">
      <span class="title">工具触发规则</span>
      <el-button
        type="primary"
        size="small"
        :disabled="refereeLabels.length === 0"
        @click="addRule"
      >
        + 添加规则
      </el-button>
    </div>

    <el-table v-if="rows.length > 0" :data="rows" border>
      <el-table-column label="#" type="index" width="48" />
      <el-table-column label="关键词 (旁路监管输出)" width="220">
        <template #default="{ row }">
          <el-input
            v-model="row.keyword"
            size="small"
            placeholder="如 OFFENSIVE / HANGUP"
            @input="rebuild"
          />
        </template>
      </el-table-column>
      <el-table-column label="处理" width="110">
        <template #default>
          <el-tag size="small" type="danger" disable-transitions>挂断</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="结束语 (留空=直接挂断)">
        <template #default="{ row }">
          <el-input
            v-model="row.phrase"
            size="small"
            clearable
            placeholder="挂断前说的一句话；留空则直接挂断"
            @input="rebuild"
          />
        </template>
      </el-table-column>
      <el-table-column label="操作" width="80" fixed="right">
        <template #default="{ $index }">
          <el-button link type="danger" @click="removeRule($index)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>
    <el-empty v-else description="暂无工具触发规则" :image-size="64" />
  </div>
</template>

<script setup lang="ts">
import { Info } from "lucide-vue-next";
import { computed, ref } from "vue";

import type {
  CampaignBase,
  RoleConfigRead,
  RouteToolAction,
  RoutingRule,
} from "@/types/campaign";

// The single shared hangup tool alias the flat surface auto-manages. Operators
// never see it — each flat row carries its own per-rule closing_phrase. (§11 /
// customer-facing 工具触发.)
const HANGUP_ALIAS = "hangup";

interface FlatRule {
  keyword: string;
  phrase: string;
}

const props = defineProps<{
  modelValue: CampaignBase;
  roleConfigs: RoleConfigRead[];
}>();

const refereeLabels = computed(() =>
  props.roleConfigs
    .filter((rc) => rc.kind === "referee" && rc.label)
    .map((rc) => rc.label as string),
);

// A rule belongs to this surface iff its action is a tool pointing at a hangup
// tool. Persona / transition / restructure rules stay in 「门控路由」 untouched.
function isHangupRule(r: RoutingRule): boolean {
  if (r.action.type !== "tool") return false;
  const alias = (r.action as RouteToolAction).tool;
  return props.modelValue.tools?.[alias]?.type === "hangup";
}

function initRows(): FlatRule[] {
  return (props.modelValue.routing_rules ?? [])
    .filter(isHangupRule)
    .map((r) => ({
      keyword: r.match[0] ?? "",
      phrase: (r.action as RouteToolAction).closing_phrase ?? "",
    }));
}

function initReferee(): string {
  const existing = (props.modelValue.routing_rules ?? []).find(isHangupRule);
  return existing?.referee || refereeLabels.value[0] || "";
}

const rows = ref<FlatRule[]>(initRows());
const flatReferee = ref<string>(initReferee());

// Rewrite the hangup-rule subset of modelValue.routing_rules from the editable
// rows IN PLACE (splice, so the array ref other tabs hold stays stable), keeping
// every non-hangup rule. Ensures the shared hangup tool exists while ≥1 rule.
function rebuild(): void {
  const m = props.modelValue;
  const kept = (m.routing_rules ?? []).filter((r) => !isHangupRule(r));
  const fresh: RoutingRule[] = [];
  for (const row of rows.value) {
    const kw = row.keyword.trim();
    if (!kw) continue;
    fresh.push({
      referee: flatReferee.value,
      match: [kw],
      action: {
        type: "tool",
        tool: HANGUP_ALIAS,
        then_state: "END",
        closing_phrase: row.phrase.trim() || null,
      },
    });
  }
  m.routing_rules.splice(0, m.routing_rules.length, ...kept, ...fresh);
  if (fresh.length > 0 && m.tools[HANGUP_ALIAS]?.type !== "hangup") {
    m.tools[HANGUP_ALIAS] = { type: "hangup" };
  }
}

function addRule(): void {
  rows.value.push({ keyword: "", phrase: "" });
  rebuild();
}

function removeRule(idx: number): void {
  rows.value.splice(idx, 1);
  rebuild();
}

// Exposed for unit tests (the rule-editing logic is the testable surface).
defineExpose({ rows, flatReferee, addRule, removeRule, rebuild, isHangupRule });
</script>

<style scoped>
/* 空状态 warning（尚无旁路监管）仍用 el-alert，保留其间距。 */
.intro {
  margin-bottom: 16px;
}
/* 配置说明：无背景、小号灰字、小号 info 图标（card_title 已给名字，不再重复）。 */
.tab-intro {
  display: flex;
  align-items: flex-start;
  gap: 6px;
  margin-bottom: 16px;
  font-size: 12px;
  line-height: 1.6;
  color: var(--isales-muted-foreground);
}
.tab-intro__icon {
  flex-shrink: 0;
  margin-top: 2px;
  color: var(--isales-status-blue-700);
}
.form {
  margin-bottom: 8px;
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
  margin-left: 12px;
}
</style>
