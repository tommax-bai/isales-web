<template>
  <el-container class="layout-root">
    <el-aside width="220px" class="sidebar">
      <div class="brand">{{ tenantName }}</div>
      <el-menu :default-active="route.name?.toString()" router>
        <el-menu-item index="dashboard" :route="{ name: 'dashboard' }">
          <span>数据看板</span>
        </el-menu-item>
        <!-- Subsequent PRs add: campaigns, leads, voice-models, devices,
             monitor, calls, callback-configs, handoff-tasks, holidays. -->
      </el-menu>
    </el-aside>
    <el-container>
      <el-header class="topbar">
        <div class="topbar-spacer"></div>
        <div class="topbar-user">{{ userName }}</div>
      </el-header>
      <el-main>
        <router-view />
      </el-main>
    </el-container>
  </el-container>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useRoute } from "vue-router";

const route = useRoute();
const tenantName = import.meta.env.VITE_TENANT_NAME ?? "iSales";
const userName = computed(() => "admin"); // PR #2 wires from auth store
</script>

<style scoped>
.layout-root {
  height: 100vh;
}
.sidebar {
  background-color: #001529;
  color: #fff;
}
.brand {
  padding: 16px 20px;
  font-size: 16px;
  font-weight: 600;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}
.sidebar :deep(.el-menu) {
  background-color: transparent;
  border-right: none;
}
.sidebar :deep(.el-menu-item) {
  color: rgba(255, 255, 255, 0.85);
}
.sidebar :deep(.el-menu-item.is-active) {
  background-color: #1890ff;
  color: #fff;
}
.topbar {
  background-color: #fff;
  border-bottom: 1px solid #e6e6e6;
  display: flex;
  align-items: center;
  padding: 0 24px;
}
.topbar-spacer {
  flex: 1;
}
.topbar-user {
  color: #555;
}
</style>
