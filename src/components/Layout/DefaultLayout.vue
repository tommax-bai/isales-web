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
        <el-dropdown trigger="click">
          <span class="topbar-user">
            {{ username }}
            <el-icon class="topbar-caret"><ArrowDown /></el-icon>
          </span>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item @click="onLogout">注销</el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
      </el-header>
      <el-main>
        <router-view />
      </el-main>
    </el-container>
  </el-container>
</template>

<script setup lang="ts">
import { ArrowDown } from "@element-plus/icons-vue";
import { computed } from "vue";
import { useRoute, useRouter } from "vue-router";

import { useAuthStore } from "@/stores/auth";

const route = useRoute();
const router = useRouter();
const auth = useAuthStore();
const tenantName = import.meta.env.VITE_TENANT_NAME ?? "iSales";
const username = computed(() => auth.username ?? "未登录");

function onLogout() {
  auth.logout();
  void router.push({ name: "login" });
}
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
  cursor: pointer;
  color: #555;
  display: flex;
  align-items: center;
  gap: 4px;
}
.topbar-caret {
  font-size: 12px;
}
</style>
