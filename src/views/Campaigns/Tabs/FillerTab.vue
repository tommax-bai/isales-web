<template>
  <div>
    <div class="header">
      <span class="title">垫词集合</span>
      <el-button type="primary" size="small" @click="onNew">
        + 新增集合
      </el-button>
    </div>

    <el-table :data="modelValue" stripe>
      <el-table-column prop="sort_order" label="排序" width="80" />
      <el-table-column prop="name" label="名称" />
      <el-table-column label="垫词数" width="100">
        <template #default="{ row }">
          {{ row.phrases?.length ?? 0 }}
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

    <FillerSetDialog
      v-model="dialogVisible"
      :initial="dialogInitial"
      @save="onDialogSave"
    />
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";

import FillerSetDialog from "@/components/Campaign/FillerSetDialog.vue";
import type { FillerSetRead } from "@/types/campaign";

const props = defineProps<{
  modelValue: FillerSetRead[];
}>();

const emit = defineEmits<{
  (e: "update:modelValue", v: FillerSetRead[]): void;
}>();

const dialogVisible = ref(false);
const dialogInitial = ref<FillerSetRead | null>(null);
const editingIndex = ref<number | null>(null);

function onNew(): void {
  dialogInitial.value = null;
  editingIndex.value = null;
  dialogVisible.value = true;
}

function onEdit(row: FillerSetRead, idx: number): void {
  dialogInitial.value = { ...row, phrases: [...row.phrases] };
  editingIndex.value = idx;
  dialogVisible.value = true;
}

function onRemove(idx: number): void {
  emit(
    "update:modelValue",
    props.modelValue.filter((_, i) => i !== idx),
  );
}

function onDialogSave(value: FillerSetRead): void {
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
