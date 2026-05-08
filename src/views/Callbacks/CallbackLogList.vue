<template>
  <el-card>
    <template #header>
      <div class="header">
        <span class="title">回调记录</span>
        <el-button type="primary" @click="onRefresh">刷新</el-button>
      </div>
    </template>
    <el-table v-loading="loading" :data="items" stripe empty-text="暂无记录">
      <el-table-column prop="id" label="ID" width="80" />
      <el-table-column prop="callback_config_id" label="config" width="100" />
      <el-table-column prop="call_record_id" label="call" width="100" />
      <el-table-column prop="status" label="状态" width="160" />
      <el-table-column prop="retry_count" label="重试" width="80" />
      <el-table-column prop="response_status" label="HTTP" width="80" />
      <el-table-column prop="error_message" label="错误" />
      <el-table-column prop="created_at" label="时间" width="180" />
    </el-table>
  </el-card>
</template>

<script setup lang="ts">
import { onMounted, ref } from "vue";

import { callbackLogsApi } from "@/api/callbacks";
import type { CallbackLog } from "@/types/callback";

const items = ref<CallbackLog[]>([]);
const loading = ref(false);

async function onRefresh() {
  loading.value = true;
  try {
    items.value = await callbackLogsApi.list({ limit: 100 });
  } finally {
    loading.value = false;
  }
}

onMounted(onRefresh);
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
