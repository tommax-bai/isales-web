<template>
  <el-card>
    <template #header>
      <div class="header">
        <span class="title">转人工任务</span>
        <el-button type="primary" @click="onRefresh">刷新</el-button>
      </div>
    </template>
    <el-alert type="info" :closable="false" class="hint">
      v1 转人工是衰减实现：engine 标记 marked_for_handoff，坐席通过其他业务电话
      系统手动外呼。本页仅展示待处理列表，不做"领取/完成"状态流转（v2）。
    </el-alert>
    <el-table v-loading="loading" :data="items" stripe empty-text="暂无任务">
      <el-table-column prop="id" label="ID" width="80" />
      <el-table-column prop="call_record_id" label="call_record_id" width="140" />
      <el-table-column prop="trigger_type" label="触发类型" width="120" />
      <el-table-column prop="status" label="状态" width="120" />
      <el-table-column prop="agent_id" label="坐席" width="100" />
      <el-table-column prop="created_at" label="创建时间" width="180" />
    </el-table>
  </el-card>
</template>

<script setup lang="ts">
import { onMounted, ref } from "vue";

import apiClient from "@/api/client";

interface HandoffTask {
  id: number;
  call_record_id: number;
  trigger_type: string;
  status: string;
  agent_id: number | null;
  created_at: string;
}

const items = ref<HandoffTask[]>([]);
const loading = ref(false);

async function onRefresh() {
  loading.value = true;
  try {
    const r = await apiClient.get<HandoffTask[]>("/handoff-tasks");
    items.value = r.data;
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
.hint {
  margin-bottom: 12px;
}
</style>
