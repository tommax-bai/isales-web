<template>
  <el-card>
    <template #header>
      <div class="header">
        <span class="title">通话记录</span>
        <el-button type="primary" @click="onRefresh">刷新</el-button>
      </div>
    </template>
    <el-table v-loading="loading" :data="items" stripe empty-text="暂无通话记录">
      <el-table-column prop="id" label="ID" width="80" />
      <el-table-column prop="lead_id" label="lead_id" width="100" />
      <el-table-column prop="campaign_id" label="campaign_id" width="120" />
      <el-table-column prop="started_at" label="开始时间" width="180" />
      <el-table-column prop="duration" label="时长(s)" width="100" />
      <el-table-column prop="status" label="状态" width="100" />
      <el-table-column label="操作" width="100" fixed="right">
        <template #default="{ row }">
          <el-button type="primary" link @click="onDetail(row)">详情</el-button>
        </template>
      </el-table-column>
    </el-table>
  </el-card>
</template>

<script setup lang="ts">
import { onMounted, ref } from "vue";
import { useRouter } from "vue-router";

import { callsApi } from "@/api/calls";
import type { CallRecordSummary } from "@/types/call";

const router = useRouter();
const items = ref<CallRecordSummary[]>([]);
const loading = ref(false);

async function onRefresh() {
  loading.value = true;
  try {
    items.value = await callsApi.list({ limit: 50 });
  } finally {
    loading.value = false;
  }
}

function onDetail(row: CallRecordSummary) {
  void router.push({ name: "call-detail", params: { id: row.id } });
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
