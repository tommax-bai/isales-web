<template>
  <div>
    <div class="header">
      <span class="title">主对话 / 决策 / 抽取配置</span>
      <el-button type="primary" size="small" @click="onNew">
        + 新增配置
      </el-button>
    </div>

    <el-table :data="modelValue" stripe>
      <el-table-column label="类型" width="100">
        <template #default="{ row }">
          <el-tag :type="kindTagType(row.kind)" size="small">
            {{ kindLabel(row.kind) }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="标识" width="120">
        <template #default="{ row }">
          <span v-if="row.label">{{ row.label }}</span>
          <span v-else class="muted">—</span>
        </template>
      </el-table-column>
      <el-table-column prop="model" label="模型" />
      <el-table-column label="温度" width="100">
        <template #default="{ row }">{{ row.temperature.toFixed(2) }}</template>
      </el-table-column>
      <el-table-column label="top_p" width="100">
        <template #default="{ row }">{{ row.top_p.toFixed(2) }}</template>
      </el-table-column>
      <el-table-column label="启用" width="80">
        <template #default="{ row }">
          <el-tag :type="row.enabled ? 'success' : 'info'" size="small">
            {{ row.enabled ? "是" : "否" }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="160" fixed="right">
        <template #default="{ row, $index }">
          <el-button link type="primary" @click="onEdit(row, $index)">
            编辑
          </el-button>
          <el-button link type="danger" @click="onRemove($index)">
            删除
          </el-button>
        </template>
      </el-table-column>
    </el-table>

    <RoleConfigDialog
      v-model="dialogVisible"
      :initial="dialogInitial"
      @save="onDialogSave"
    />
  </div>
</template>

<script setup lang="ts">
import { ElMessage } from "element-plus";
import { ref } from "vue";

import RoleConfigDialog from "@/components/Campaign/RoleConfigDialog.vue";
import type { RoleConfigRead, RoleKind } from "@/types/campaign";

const props = withDefaults(
  defineProps<{
    modelValue: RoleConfigRead[];
    // engine-tools-multidialogue-gating: total speculative routes incl main,
    // [1,3]. Enabled personas + main MUST NOT exceed it (hard cap below).
    personaFanoutCap?: number;
  }>(),
  { personaFanoutCap: 1 },
);

const emit = defineEmits<{
  (e: "update:modelValue", v: RoleConfigRead[]): void;
}>();

const dialogVisible = ref(false);
const dialogInitial = ref<RoleConfigRead | null>(null);
const editingIndex = ref<number | null>(null);

function kindLabel(kind: RoleKind): string {
  return {
    main: "主对话",
    referee: "门控监管",
    restructure: "重组",
    extractor: "抽取",
    persona: "人设",
  }[kind];
}

function kindTagType(
  kind: RoleKind,
): "primary" | "success" | "warning" | "danger" | "info" {
  return (
    {
      main: "primary",
      referee: "warning",
      restructure: "danger",
      extractor: "success",
      persona: "info",
    } as const
  )[kind];
}

function onNew(): void {
  dialogInitial.value = null;
  editingIndex.value = null;
  dialogVisible.value = true;
}

function onEdit(row: RoleConfigRead, idx: number): void {
  dialogInitial.value = { ...row };
  editingIndex.value = idx;
  dialogVisible.value = true;
}

function onRemove(idx: number): void {
  emit(
    "update:modelValue",
    props.modelValue.filter((_, i) => i !== idx),
  );
}

function onDialogSave(value: RoleConfigRead): void {
  const next =
    editingIndex.value !== null
      ? props.modelValue.map((rc, i) => (i === editingIndex.value ? value : rc))
      : [...props.modelValue, value];

  // Hard-cap over-cap persona enabling (spec §5.4): main(1) + enabled personas
  // must not exceed persona_fanout_cap. The vendor bills cancelled speculative
  // tokens, so this is a block — not a hint. Keep the dialog open on reject so
  // the operator can disable the switch or raise the cap in 「多流路由」.
  const enabledPersonas = next.filter(
    (rc) => rc.kind === "persona" && rc.enabled,
  ).length;
  if (
    value.kind === "persona" &&
    value.enabled &&
    1 + enabledPersonas > props.personaFanoutCap
  ) {
    ElMessage.error(
      `启用人设总数（含主对话）不能超过并发上限 ${props.personaFanoutCap}；` +
        `请先在「多流路由」提高上限，或停用其它人设。`,
    );
    return;
  }

  emit("update:modelValue", next);
  dialogVisible.value = false;
}
</script>

<style scoped>
.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}
.title {
  font-size: 14px;
  font-weight: 600;
}
.muted {
  color: var(--isales-muted-foreground);
}
</style>
