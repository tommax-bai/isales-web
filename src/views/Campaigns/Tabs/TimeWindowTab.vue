<template>
  <div>
    <div class="header">
      <span class="title">外呼时间窗口</span>
      <el-button type="primary" size="small" @click="addWindow">+ 新增窗口</el-button>
    </div>

    <el-table :data="form.time_windows" stripe size="small">
      <el-table-column label="工作日">
        <template #default="{ row }">
          <el-checkbox-group v-model="row.days">
            <el-checkbox value="mon">一</el-checkbox>
            <el-checkbox value="tue">二</el-checkbox>
            <el-checkbox value="wed">三</el-checkbox>
            <el-checkbox value="thu">四</el-checkbox>
            <el-checkbox value="fri">五</el-checkbox>
            <el-checkbox value="sat">六</el-checkbox>
            <el-checkbox value="sun">日</el-checkbox>
          </el-checkbox-group>
        </template>
      </el-table-column>
      <el-table-column label="开始 (HH:MM)" width="140">
        <template #default="{ row }">
          <el-input v-model="row.start" placeholder="09:00" />
        </template>
      </el-table-column>
      <el-table-column label="结束 (HH:MM)" width="140">
        <template #default="{ row }">
          <el-input v-model="row.end" placeholder="18:00" />
        </template>
      </el-table-column>
      <el-table-column label="操作" width="80">
        <template #default="{ $index }">
          <el-button link type="danger" @click="removeWindow($index)">
            删除
          </el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-form label-width="120px" class="ext-form">
      <el-form-item label="尊重节假日">
        <el-switch v-model="form.respect_holidays" />
        <el-button class="link-btn" link @click="goHolidays">
          管理节假日 →
        </el-button>
      </el-form-item>
    </el-form>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useRouter } from "vue-router";

import type { CampaignBase, TimeWindow } from "@/types/campaign";

const props = defineProps<{
  modelValue: CampaignBase;
}>();
const emit = defineEmits<{
  (e: "update:modelValue", v: CampaignBase): void;
}>();

const form = computed({
  get: () => props.modelValue,
  set: (v) => emit("update:modelValue", v),
});

const router = useRouter();

function addWindow(): void {
  const w: TimeWindow = { days: ["mon"], start: "09:00", end: "18:00" };
  form.value.time_windows = [...form.value.time_windows, w];
}

function removeWindow(idx: number): void {
  form.value.time_windows = form.value.time_windows.filter((_, i) => i !== idx);
}

function goHolidays(): void {
  void router.push({ name: "holidays" });
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
.ext-form {
  margin-top: 16px;
}
.link-btn {
  margin-left: 12px;
}
</style>
