<template>
  <el-card>
    <template #header>
      <div class="header">
        <span class="title">回调配置</span>
        <el-button type="primary" @click="onRefresh">刷新</el-button>
      </div>
    </template>
    <el-alert
      type="info"
      :closable="false"
      class="hint"
    >
      回调编辑器（trigger 用 JsonLogic / payload 用 Jinja2）作为
      follow-up PR 接入 CodeMirror 6；当前页面仅提供配置列表 + 触发记录浏览。
    </el-alert>
    <el-table v-loading="loading" :data="items" stripe empty-text="暂无回调">
      <el-table-column prop="id" label="ID" width="80" />
      <el-table-column prop="campaign_id" label="campaign" width="100" />
      <el-table-column prop="name" label="名称" />
      <el-table-column prop="method" label="method" width="80" />
      <el-table-column prop="url" label="URL" />
      <el-table-column label="启用" width="80">
        <template #default="{ row }">
          <el-tag :type="row.enabled ? 'success' : 'info'">
            {{ row.enabled ? "是" : "否" }}
          </el-tag>
        </template>
      </el-table-column>
    </el-table>
  </el-card>
</template>

<script setup lang="ts">
import { onMounted, ref } from "vue";

import { callbackConfigsApi } from "@/api/callbacks";
import type { CallbackConfig } from "@/types/callback";

const items = ref<CallbackConfig[]>([]);
const loading = ref(false);

async function onRefresh() {
  loading.value = true;
  try {
    items.value = await callbackConfigsApi.list();
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
