<template>
  <header class="top-nav" role="banner">
    <div class="top-nav__inner">
      <!-- 左：logo + 标题 -->
      <router-link :to="{ name: 'leads' }" class="brand">
        <span class="brand__logo" aria-hidden="true">
          <PhoneCall :size="18" />
        </span>
        <span class="brand__text">
          <span class="brand__title">{{ tenantName }}</span>
          <span class="brand__sub">客户外呼系统</span>
        </span>
      </router-link>

      <!-- 中：3 个主入口胶囊（移动端隐藏） -->
      <nav class="pill pill--business" aria-label="主业务">
        <router-link
          v-for="item in businessEntries"
          :key="item.name"
          :to="{ name: item.name }"
          class="pill__btn"
          :class="{ 'pill__btn--active': isActive(item.name) }"
        >
          <component :is="item.icon" :size="16" />
          <span>{{ item.label }}</span>
        </router-link>
      </nav>

      <!-- 右：3 个圆形配置按钮 + 运营 + 注销 -->
      <div class="actions">
        <nav class="pill pill--config" aria-label="配置">
          <router-link
            v-for="item in configEntries"
            :key="item.name"
            :to="{ name: item.name }"
            class="pill__circle"
            :class="{ 'pill__circle--active': isActive(item.name) }"
            :title="item.label"
            :aria-label="item.label"
          >
            <component :is="item.icon" :size="18" />
          </router-link>
        </nav>

        <el-dropdown trigger="click" placement="bottom-end">
          <button class="user-trigger" type="button" :aria-label="username ?? '用户菜单'">
            <UserCircle :size="22" />
          </button>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item disabled>{{ username }}</el-dropdown-item>
              <el-dropdown-item @click="goOperations">
                <LayoutGrid :size="14" style="margin-right: 6px" />
                运营管理
              </el-dropdown-item>
              <el-dropdown-item divided @click="onLogout">注销</el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
      </div>
    </div>
  </header>
</template>

<script setup lang="ts">
import {
  Calendar,
  Key,
  LayoutGrid,
  Phone,
  PhoneCall,
  Settings,
  UserCircle,
  Users,
  Waves,
} from "lucide-vue-next";
import { computed } from "vue";
import { useRoute, useRouter } from "vue-router";

import { useAuthStore } from "@/stores/auth";

const route = useRoute();
const router = useRouter();
const auth = useAuthStore();
const tenantName = import.meta.env.VITE_TENANT_NAME ?? "iSales";
const username = computed(() => auth.username ?? "未登录");

const businessEntries = [
  { name: "leads", label: "线索管理", icon: Users },
  { name: "calls", label: "外呼记录", icon: Phone },
  { name: "appointments", label: "预约管理", icon: Calendar },
] as const;

const configEntries = [
  { name: "config-ai-call", label: "AI 外呼配置", icon: Settings },
  { name: "config-voice-channels", label: "ASR/TTS 通路", icon: Waves },
  { name: "config-model-providers", label: "模型厂商", icon: Key },
] as const;

function isActive(name: string): boolean {
  const current = route.name?.toString() ?? "";
  if (current === name) return true;
  // call detail / appointment children stay active under the parent entry
  if (name === "calls" && (current === "call-detail" || current.startsWith("call-"))) return true;
  return false;
}

function goOperations() {
  void router.push({ name: "operations-index" });
}

function onLogout() {
  auth.logout();
}
</script>

<style scoped>
.top-nav {
  position: sticky;
  top: 0;
  z-index: 50;
  background: var(--isales-background);
  border-bottom: 1px solid var(--isales-border);
  box-shadow: var(--isales-shadow-sm);
}
.top-nav__inner {
  max-width: 1280px;
  margin: 0 auto;
  padding: 0 24px;
  height: 64px;
  display: flex;
  align-items: center;
  gap: 16px;
}

/* ---- brand ---- */
.brand {
  display: flex;
  align-items: center;
  gap: 10px;
  text-decoration: none;
  color: var(--isales-foreground);
}
.brand__logo {
  width: 32px;
  height: 32px;
  border-radius: var(--isales-radius);
  background: var(--isales-primary);
  color: var(--isales-primary-foreground);
  display: flex;
  align-items: center;
  justify-content: center;
}
.brand__text {
  display: flex;
  flex-direction: column;
  line-height: 1.1;
}
.brand__title {
  font-weight: var(--isales-font-weight-bold);
  font-size: 14px;
}
.brand__sub {
  font-size: 11px;
  color: var(--isales-muted-foreground);
}

/* ---- pill containers ---- */
.pill {
  display: inline-flex;
  align-items: center;
  background: var(--isales-muted);
  border-radius: 9999px;
  padding: 4px;
  gap: 2px;
}
.pill--business {
  margin: 0 auto;
}
.pill--config {
  background: var(--isales-muted);
}

/* business pill buttons */
.pill__btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  border-radius: 9999px;
  font-size: 14px;
  color: var(--isales-muted-foreground);
  text-decoration: none;
  transition: background 0.15s, color 0.15s;
}
.pill__btn:hover {
  color: var(--isales-foreground);
}
.pill__btn--active {
  background: var(--isales-background);
  color: var(--isales-primary);
  font-weight: var(--isales-font-weight-medium);
  box-shadow: var(--isales-shadow-sm);
}

/* config circular buttons */
.pill__circle {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: var(--isales-muted-foreground);
  text-decoration: none;
  transition: background 0.15s, color 0.15s;
}
.pill__circle:hover {
  color: var(--isales-foreground);
}
.pill__circle--active {
  background: var(--isales-background);
  color: var(--isales-primary);
  box-shadow: var(--isales-shadow-sm);
}

/* ---- actions cluster ---- */
.actions {
  display: inline-flex;
  align-items: center;
  gap: 12px;
}
.user-trigger {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: transparent;
  border: 1px solid var(--isales-border);
  color: var(--isales-muted-foreground);
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
.user-trigger:hover {
  color: var(--isales-foreground);
  background: var(--isales-muted);
}

/* ---- responsive: hide business pill on mobile ---- */
@media (max-width: 768px) {
  .pill--business {
    display: none;
  }
}
</style>
