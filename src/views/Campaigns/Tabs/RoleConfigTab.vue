<template>
  <div>
    <div class="header">
      <span class="title">角色 / 裁判 / 润色配置</span>
      <el-button type="primary" size="small" @click="onNew">
        + 新增角色
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
import { ref } from "vue";

import RoleConfigDialog from "@/components/Campaign/RoleConfigDialog.vue";
import type { RoleConfigRead, RoleKind } from "@/types/campaign";

const props = defineProps<{
  modelValue: RoleConfigRead[];
}>();

const emit = defineEmits<{
  (e: "update:modelValue", v: RoleConfigRead[]): void;
}>();

const dialogVisible = ref(false);
const dialogInitial = ref<RoleConfigRead | null>(null);
const editingIndex = ref<number | null>(null);

function kindLabel(kind: RoleKind): string {
  return { role: "角色", judge: "裁判", polish: "润色" }[kind];
}

function kindTagType(
  kind: RoleKind,
): "primary" | "success" | "warning" {
  return ({ role: "primary", judge: "warning", polish: "success" } as const)[kind];
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
  if (editingIndex.value !== null) {
    const next = [...props.modelValue];
    next[editingIndex.value] = value;
    emit("update:modelValue", next);
  } else {
    emit("update:modelValue", [...props.modelValue, value]);
  }
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
</style>
