<template>
  <el-container class="layout-root">
    <el-aside width="220px" class="sidebar">
      <div class="brand">{{ tenantName }}</div>
      <el-menu :default-active="route.name?.toString()" router>
        <el-menu-item index="dashboard" :route="{ name: 'dashboard' }">
          <span>数据看板</span>
        </el-menu-item>
        <el-menu-item index="campaigns" :route="{ name: 'campaigns' }">
          <span>任务管理</span>
        </el-menu-item>
        <el-menu-item index="leads" :route="{ name: 'leads' }">
          <span>线索管理</span>
        </el-menu-item>
        <el-sub-menu index="telephony">
          <template #title>
            <span>设备 &amp; 音色</span>
          </template>
          <el-menu-item index="voice-models" :route="{ name: 'voice-models' }">
            音色
          </el-menu-item>
          <el-menu-item index="devices" :route="{ name: 'devices' }">设备</el-menu-item>
          <el-menu-item index="sim-cards" :route="{ name: 'sim-cards' }">
            SIM 卡
          </el-menu-item>
        </el-sub-menu>
        <el-menu-item index="calls" :route="{ name: 'calls' }">
          <span>通话记录</span>
        </el-menu-item>
        <el-sub-menu index="callbacks">
          <template #title>
            <span>回调</span>
          </template>
          <el-menu-item
            index="callback-configs"
            :route="{ name: 'callback-configs' }"
          >
            配置
          </el-menu-item>
          <el-menu-item index="callback-logs" :route="{ name: 'callback-logs' }">
            记录
          </el-menu-item>
        </el-sub-menu>
        <el-menu-item index="handoff-tasks" :route="{ name: 'handoff-tasks' }">
          <span>转人工任务</span>
        </el-menu-item>
        <el-menu-item index="holidays" :route="{ name: 'holidays' }">
          <span>节假日</span>
        </el-menu-item>
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
.sidebar :deep(.el-menu-item),
.sidebar :deep(.el-sub-menu__title) {
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
