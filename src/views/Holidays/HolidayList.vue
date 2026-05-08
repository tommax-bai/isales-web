<template>
  <el-card>
    <template #header>
      <div class="header">
        <span class="title">节假日</span>
        <el-button type="primary" @click="onRefresh">刷新</el-button>
      </div>
    </template>
    <el-table v-loading="loading" :data="items" stripe empty-text="暂无节假日">
      <el-table-column prop="id" label="ID" width="80" />
      <el-table-column prop="date" label="日期" width="160" />
      <el-table-column prop="name" label="名称" />
    </el-table>
  </el-card>
</template>

<script setup lang="ts">
import { onMounted, ref } from "vue";

import apiClient from "@/api/client";

interface Holiday {
  id: number;
  date: string;
  name: string;
}

const items = ref<Holiday[]>([]);
const loading = ref(false);

async function onRefresh() {
  loading.value = true;
  try {
    const r = await apiClient.get<Holiday[]>("/holidays");
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
</style>
