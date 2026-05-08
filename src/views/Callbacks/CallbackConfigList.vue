<template>
  <el-card>
    <template #header>
      <div class="header">
        <span class="title">回调配置</span>
        <div>
          <el-button type="primary" @click="onNew">新建</el-button>
          <el-button @click="onRefresh">刷新</el-button>
        </div>
      </div>
    </template>
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
      <el-table-column label="操作" width="160" fixed="right">
        <template #default="{ row }">
          <el-button type="primary" link @click="onEdit(row)">编辑</el-button>
          <el-popconfirm
            title="确认删除？"
            @confirm="onDelete(row)"
          >
            <template #reference>
              <el-button type="danger" link>删除</el-button>
            </template>
          </el-popconfirm>
        </template>
      </el-table-column>
    </el-table>
  </el-card>
</template>

<script setup lang="ts">
import { ElMessage } from "element-plus";
import { onMounted, ref } from "vue";
import { useRouter } from "vue-router";

import { callbackConfigsApi } from "@/api/callbacks";
import type { CallbackConfig } from "@/types/callback";

const router = useRouter();
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

function onNew() {
  void router.push({ name: "callback-config-edit", params: { id: "new" } });
}

function onEdit(row: CallbackConfig) {
  void router.push({ name: "callback-config-edit", params: { id: row.id } });
}

async function onDelete(row: CallbackConfig) {
  try {
    await callbackConfigsApi.remove(row.id);
    ElMessage.success("已删除");
    await onRefresh();
  } catch {
    ElMessage.error("删除失败");
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
