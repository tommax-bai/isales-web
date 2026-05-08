<template>
  <div class="kv-editor">
    <div v-for="(row, i) in rows" :key="i" class="kv-row">
      <el-input
        v-model="row.key"
        placeholder="key"
        size="default"
        class="kv-key"
        @input="emitChange"
      />
      <el-input
        v-model="row.value"
        placeholder="value"
        size="default"
        class="kv-value"
        @input="emitChange"
      />
      <el-button text type="danger" @click="removeRow(i)">×</el-button>
    </div>
    <el-button size="small" @click="addRow">添加</el-button>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from "vue";

interface Row {
  key: string;
  value: string;
}

const props = defineProps<{
  modelValue: Record<string, string>;
}>();

const emit = defineEmits<{
  (e: "update:modelValue", value: Record<string, string>): void;
}>();

const rows = ref<Row[]>(toRows(props.modelValue));

watch(
  () => props.modelValue,
  (next) => {
    // Resync only when external value differs from our serialised form;
    // avoids clobbering the user's in-flight edits.
    if (JSON.stringify(toObject(rows.value)) !== JSON.stringify(next)) {
      rows.value = toRows(next);
    }
  },
);

function toRows(obj: Record<string, string>): Row[] {
  return Object.entries(obj ?? {}).map(([key, value]) => ({
    key,
    value: String(value ?? ""),
  }));
}

function toObject(rs: Row[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const r of rs) {
    if (r.key) out[r.key] = r.value;
  }
  return out;
}

function addRow() {
  rows.value.push({ key: "", value: "" });
}

function removeRow(i: number) {
  rows.value.splice(i, 1);
  emitChange();
}

function emitChange() {
  emit("update:modelValue", toObject(rows.value));
}
</script>

<style scoped>
.kv-editor {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.kv-row {
  display: flex;
  gap: 8px;
  align-items: center;
}
.kv-key {
  width: 200px;
}
.kv-value {
  flex: 1;
}
</style>
