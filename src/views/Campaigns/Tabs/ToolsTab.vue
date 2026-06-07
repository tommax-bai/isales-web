<template>
  <div class="tools-tab">
    <el-alert
      type="info"
      :closable="false"
      show-icon
      class="intro"
      title="工具（挂断 / 转人工）"
      description="为路由规则的「工具」动作提供可引用的工具。挂断：裁判判定后主动结束本通电话（可选先播一句告别语）。转人工：转接坐席，衔接话术复用「转人工」页的配置，此处不重复填写。"
    />

    <div class="header">
      <span class="title">工具列表（alias 唯一）</span>
      <el-button type="primary" size="small" @click="addTool">+ 新增工具</el-button>
    </div>

    <el-alert
      v-if="duplicateAliases.length > 0"
      type="error"
      :closable="false"
      show-icon
      :title="`alias 重复：${duplicateAliases.join('、')}`"
      description="每个工具的 alias 必须唯一，否则保存会被后端拒绝 (422 tool_alias_duplicate)。"
      class="intro"
    />

    <el-table v-if="entries.length > 0" :data="entries" border>
      <el-table-column label="alias" width="180">
        <template #default="{ row }">
          <el-input
            v-model="row.alias"
            size="small"
            placeholder="如 bye / agent"
            @input="rebuild"
          />
        </template>
      </el-table-column>
      <el-table-column label="类型" width="140">
        <template #default="{ row }">
          <el-select
            :model-value="row.config.type"
            size="small"
            @change="(t: string) => onTypeChange(row, t)"
          >
            <el-option label="挂断" value="hangup" />
            <el-option label="转人工" value="transfer" />
          </el-select>
        </template>
      </el-table-column>
      <el-table-column label="配置">
        <template #default="{ row }">
          <div v-if="row.config.type === 'hangup'" class="hangup-cfg">
            <el-input
              v-model="row.config.closing_phrase"
              size="small"
              placeholder="挂断前话术（可空则立即挂断）"
              style="width: 280px"
              @input="rebuild"
            />
            <el-checkbox v-model="row.config.interrupt" size="small" @change="rebuild">
              可打断当前回复
            </el-checkbox>
          </div>
          <span v-else class="hint">衔接话术取自「转人工」页（transfer_phrases），无需在此填写。</span>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="90" fixed="right">
        <template #default="{ $index }">
          <el-button link type="danger" @click="removeTool($index)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>
    <el-empty v-else description="暂无工具" :image-size="64" />
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";

import type { CampaignBase, ToolConfig } from "@/types/campaign";

interface ToolEntry {
  alias: string;
  config: ToolConfig;
}

const props = defineProps<{
  modelValue: CampaignBase;
}>();

function toEntries(tools: Record<string, ToolConfig>): ToolEntry[] {
  return Object.entries(tools ?? {}).map(([alias, config]) => ({
    alias,
    // clone so edits don't mutate the source map until rebuild()
    config: { ...config } as ToolConfig,
  }));
}

const entries = ref<ToolEntry[]>(toEntries(props.modelValue.tools));

const duplicateAliases = ref<string[]>([]);

function computeDuplicates(): void {
  const seen = new Set<string>();
  const dups = new Set<string>();
  for (const e of entries.value) {
    const a = e.alias.trim();
    if (!a) continue;
    if (seen.has(a)) dups.add(a);
    seen.add(a);
  }
  duplicateAliases.value = [...dups];
}

// Rebuild the shared modelValue.tools record IN PLACE (same mutate-by-reference
// style as RoutingRulesTab) from the editable entries. Skips empty / duplicate
// aliases; duplicates are surfaced via duplicateAliases for the warning banner.
function rebuild(): void {
  const t = props.modelValue.tools;
  for (const k of Object.keys(t)) delete t[k];
  const seen = new Set<string>();
  for (const e of entries.value) {
    const a = e.alias.trim();
    if (!a || seen.has(a)) continue;
    seen.add(a);
    t[a] = { ...e.config } as ToolConfig;
  }
  computeDuplicates();
}

function addTool(): void {
  entries.value.push({
    alias: "",
    config: { type: "hangup", closing_phrase: "", interrupt: false },
  });
  rebuild();
}

function removeTool(idx: number): void {
  entries.value.splice(idx, 1);
  rebuild();
}

function onTypeChange(row: ToolEntry, type: string): void {
  row.config =
    type === "transfer"
      ? { type: "transfer" }
      : { type: "hangup", closing_phrase: "", interrupt: false };
  rebuild();
}

// Exposed for unit tests (the editing logic is the testable surface).
defineExpose({ entries, addTool, removeTool, onTypeChange, rebuild, duplicateAliases });
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
.hangup-cfg {
  display: flex;
  gap: 12px;
  align-items: center;
}
.hint {
  font-size: 12px;
  color: var(--isales-muted-foreground);
}
</style>
