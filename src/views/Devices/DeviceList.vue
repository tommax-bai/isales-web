<template>
  <el-card>
    <template #header>
      <div class="header">
        <span class="title">设备管理 — edge fleet liveness</span>
        <div class="header-actions">
          <span v-if="data" class="counts">
            在线 {{ data.online_count }} / 离线 {{ data.offline_count }}
            <span class="threshold">
              (心跳阈值 {{ data.threshold_seconds }}s)
            </span>
          </span>
          <el-button type="primary" :loading="loading" @click="onRefresh">
            刷新
          </el-button>
        </div>
      </div>
    </template>

    <el-alert
      :closable="false"
      type="info"
      show-icon
      class="explain"
    >
      <template #title>这里看到什么</template>
      <template #default>
        本表是云端 admin 视图，列出所有通过 cloud-edge gRPC 心跳上报到 ECS
        的 modem 设备 (Device 表)。**它不会自动识别浏览器所在 PC 的 USB
        modem** —— 那是 edge daemon (isales-telephony) 在客户 PC 上跑起来
        + 自检 + gRPC 上报后才会出现。当前若表为空，多半是没有 edge
        daemon 在跑 (见 A2 §12 MVP gate)。本机 modem 自检请在 PC 上运行
        <code>isales-telephony</code> 的 list-modems 脚本。
      </template>
    </el-alert>

    <el-table
      v-loading="loading"
      :data="data?.items ?? []"
      stripe
      empty-text="暂无设备 (没有 edge 心跳上报)"
      class="table"
    >
      <el-table-column prop="id" label="ID" width="80" />
      <el-table-column prop="name" label="设备名" />
      <el-table-column label="在线" width="100">
        <template #default="{ row }">
          <el-tag :type="row.online ? 'success' : 'info'">
            {{ row.online ? "在线" : "离线" }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="status" label="status" width="140" />
      <el-table-column prop="last_seen_at" label="最近心跳" width="200">
        <template #default="{ row }">
          {{ row.last_seen_at ?? "—" }}
        </template>
      </el-table-column>
    </el-table>
  </el-card>
</template>

<script setup lang="ts">
import { ElMessage } from "element-plus";
import { onMounted, onUnmounted, ref } from "vue";

import { edgeDevicesApi } from "@/api/devices";
import type { EdgeDeviceStatusList } from "@/types/device";

const data = ref<EdgeDeviceStatusList | null>(null);
const loading = ref(false);
let pollHandle: ReturnType<typeof setInterval> | null = null;

async function onRefresh() {
  loading.value = true;
  try {
    data.value = await edgeDevicesApi.status();
  } catch (err: unknown) {
    ElMessage.error(err instanceof Error ? err.message : "拉取失败");
  } finally {
    loading.value = false;
  }
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
.header-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}
.title {
  font-size: 16px;
  font-weight: 600;
}
.counts {
  font-size: 13px;
  color: var(--isales-muted-foreground);
}
.threshold {
  margin-left: 4px;
  font-size: 12px;
  opacity: 0.7;
}
.explain {
  margin-bottom: 16px;
}
.table {
  width: 100%;
}
</style>
