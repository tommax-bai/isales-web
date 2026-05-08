<template>
  <el-card>
    <template #header>
      <div class="header">
        <span class="title">SIM 卡管理</span>
        <el-button type="primary" @click="onRefresh">刷新</el-button>
      </div>
    </template>

    <el-table v-loading="loading" :data="items" stripe empty-text="暂无 SIM 卡">
      <el-table-column prop="id" label="ID" width="80" />
      <el-table-column prop="iccid" label="ICCID" />
      <el-table-column prop="imsi" label="IMSI" />
      <el-table-column prop="phone_number" label="号码" />
      <el-table-column prop="carrier" label="运营商" width="120" />
      <el-table-column prop="plan" label="套餐" />
      <el-table-column label="余额" width="120">
        <template #default="{ row }">
          {{ row.balance_cny !== null ? `¥${row.balance_cny.toFixed(2)}` : "—" }}
        </template>
      </el-table-column>
      <el-table-column prop="status" label="状态" width="120">
        <template #default="{ row }">
          <el-tag :type="statusTag(row.status)">{{ row.status }}</el-tag>
        </template>
      </el-table-column>
    </el-table>
  </el-card>
</template>

<script setup lang="ts">
import { onMounted, ref } from "vue";

import { simCardsApi } from "@/api/devices";
import type { SimCard, SimStatus } from "@/types/device";

const items = ref<SimCard[]>([]);
const loading = ref(false);

async function onRefresh() {
  loading.value = true;
  try {
    items.value = await simCardsApi.list();
  } finally {
    loading.value = false;
  }
}

function statusTag(status: SimStatus): "success" | "warning" | "info" | "danger" | "" {
  if (status === "active") return "success";
  if (status === "arrears" || status === "flagged" || status === "suspended")
    return "danger";
  return "info";
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
