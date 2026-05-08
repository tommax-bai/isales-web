<template>
  <el-card>
    <template #header>
      <div class="header">
        <span class="title">设备管理</span>
        <el-button type="primary" @click="onRefresh">刷新</el-button>
      </div>
    </template>

    <el-table v-loading="loading" :data="items" stripe empty-text="暂无设备">
      <el-table-column prop="id" label="ID" width="80" />
      <el-table-column prop="imei" label="IMEI" />
      <el-table-column prop="model" label="型号" width="160" />
      <el-table-column prop="port" label="串口" width="160" />
      <el-table-column prop="status" label="状态" width="120">
        <template #default="{ row }">
          <el-tag :type="statusTag(row.status)">{{ row.status }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="signal_strength" label="信号" width="80" />
      <el-table-column prop="last_call_at" label="最近通话" width="180" />
    </el-table>
  </el-card>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref } from "vue";

import { devicesApi } from "@/api/devices";
import type { Device, DeviceStatus } from "@/types/device";

const items = ref<Device[]>([]);
const loading = ref(false);
let pollHandle: ReturnType<typeof setInterval> | null = null;

async function onRefresh() {
  loading.value = true;
  try {
    items.value = await devicesApi.list();
  } finally {
    loading.value = false;
  }
}

function statusTag(status: DeviceStatus): "success" | "warning" | "info" | "danger" | "" {
  if (status === "idle" || status === "registered") return "success";
  if (status === "dialing" || status === "in_call") return "warning";
  if (status === "flagged" || status === "offline") return "danger";
  return "info";
}

onMounted(() => {
  void onRefresh();
  pollHandle = setInterval(() => void onRefresh(), 30_000);
});
onUnmounted(() => {
  if (pollHandle !== null) clearInterval(pollHandle);
});
</script>

<style scoped>
.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.title {
  font-size: 16px;
  font-weight: 600;
}
</style>
