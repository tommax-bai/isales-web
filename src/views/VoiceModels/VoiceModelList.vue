<template>
  <el-card>
    <template #header>
      <div class="header">
        <span class="title">音色管理</span>
        <el-button type="primary" @click="onRefresh">刷新</el-button>
      </div>
    </template>

    <el-table v-loading="loading" :data="items" stripe empty-text="暂无音色">
      <el-table-column prop="id" label="ID" width="80" />
      <el-table-column prop="name" label="名称" />
      <el-table-column prop="vendor" label="厂商" width="120" />
      <el-table-column prop="voice_id" label="vendor voice id" />
      <el-table-column prop="description" label="说明" />
    </el-table>
  </el-card>
</template>

<script setup lang="ts">
import { onMounted, ref } from "vue";

import { voiceApi } from "@/api/voice";
import type { VoiceModel } from "@/types/voice";

const items = ref<VoiceModel[]>([]);
const loading = ref(false);

async function onRefresh() {
  loading.value = true;
  try {
    items.value = await voiceApi.list();
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
