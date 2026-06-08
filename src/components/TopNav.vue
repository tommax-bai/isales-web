<template>
  <header class="top-nav" role="banner">
    <div class="top-nav__inner">
      <!-- 左：logo + 标题 -->
      <router-link :to="{ name: 'leads' }" class="brand">
        <span class="brand__logo" aria-hidden="true">
          <PhoneCall :size="16" />
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
          <component :is="item.icon" :size="14" />
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
            <component :is="item.icon" :size="16" />
          </router-link>
        </nav>

        <el-dropdown trigger="click" placement="bottom-end">
          <button class="user-trigger" type="button" :aria-label="username ?? '用户菜单'">
            <UserCircle :size="18" />
          </button>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item disabled>{{ username }}</el-dropdown-item>
              <el-dropdown-item divided disabled>更多 / 设置</el-dropdown-item>
              <el-dropdown-item
                v-for="m in moreEntries"
                :key="m.name"
                @click="goTo(m.name)"
              >
                <component :is="m.icon" :size="14" style="margin-right: 6px" />
                {{ m.label }}
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
  CalendarOff,
  HardDrive,
  Headset,
  Key,
  LayoutDashboard,
  Megaphone,
  Music,
  Phone,
  PhoneCall,
  UserCircle,
  Users,
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
  { name: "campaigns", label: "场景", icon: Megaphone },
  { name: "leads", label: "线索管理", icon: Users },
  { name: "calls", label: "外呼记录", icon: Phone },
  { name: "appointments", label: "预约管理", icon: Calendar },
  { name: "dashboard", label: "数据看板", icon: LayoutDashboard },
] as const;

const configEntries = [
  { name: "config-model-providers", label: "模型厂商", icon: Key },
] as const;

// 更多/设置 折叠区 —— 低频但后端已实装的 view（one-role IA §2）。
// 通话监控需 campaign_id，改由场景详情就近进入，不放这里。
// 路由名暂用 operations-* （clean path 在 §3 重命名）。
const moreEntries = [
  { name: "operations-handoff-tasks", label: "转人工任务", icon: Headset },
  { name: "operations-holidays", label: "节假日", icon: CalendarOff },
  { name: "operations-devices", label: "设备在线", icon: HardDrive },
  { name: "operations-voice-models", label: "音色目录", icon: Music },
] as const;

function isActive(name: string): boolean {
  const current = route.name?.toString() ?? "";
  if (current === name) return true;
  // 子路由在父入口下保持高亮
  if (name === "calls" && current.startsWith("call-")) return true;
  if (name === "campaigns" && current.startsWith("campaign-")) return true;
  return false;
}

function goTo(name: string) {
  void router.push({ name });
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
  max-width: var(--isales-container-max);
  margin: 0 auto;
  padding: 0 var(--isales-container-px);
  height: var(--isales-topnav-height);
  display: flex;
  align-items: center;
  gap: var(--isales-space-4);
}

/* ---- brand ---- */
.brand {
  display: inline-flex;
  align-items: center;
  gap: var(--isales-space-2);
  text-decoration: none;
  color: var(--isales-foreground);
  flex-shrink: 0;
}
.brand__logo {
  width: 32px;
  height: 32px;
  border-radius: var(--isales-radius-md);
  background: var(--isales-primary);
  color: var(--isales-primary-foreground);
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
.brand__text {
  display: flex;
  flex-direction: column;
  line-height: var(--isales-line-height-tight);
}
.brand__title {
  font-weight: var(--isales-font-weight-semibold);
  font-size: var(--isales-font-size-body);
  letter-spacing: var(--isales-letter-spacing-tight);
}
.brand__sub {
  font-size: var(--isales-font-size-xs);
  color: var(--isales-muted-foreground);
  margin-top: 1px;
}

/* ---- pill containers ---- */
.pill {
  display: inline-flex;
  align-items: center;
  background: var(--isales-muted);
  border-radius: 9999px;
  padding: 3px;
  gap: 2px;
}
.pill--business {
  margin: 0 auto;
}

/* business pill buttons */
.pill__btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  border-radius: 9999px;
  font-size: var(--isales-font-size-sm);
  font-weight: var(--isales-font-weight-medium);
  color: var(--isales-muted-foreground);
  text-decoration: none;
  line-height: 1;
  transition:
    background 0.15s,
    color 0.15s;
}
.pill__btn:hover {
  color: var(--isales-foreground);
}
.pill__btn--active {
  background: var(--isales-background);
  color: var(--isales-foreground);
  box-shadow: var(--isales-shadow-sm);
}

/* config circular buttons */
.pill__circle {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: var(--isales-muted-foreground);
  text-decoration: none;
  transition:
    background 0.15s,
    color 0.15s;
}
.pill__circle:hover {
  color: var(--isales-foreground);
}
.pill__circle--active {
  background: var(--isales-background);
  color: var(--isales-foreground);
  box-shadow: var(--isales-shadow-sm);
}

/* ---- actions cluster ---- */
.actions {
  display: inline-flex;
  align-items: center;
  gap: var(--isales-space-3);
  flex-shrink: 0;
}
.user-trigger {
  width: 32px;
  height: 32px;
  padding: 0;
  border-radius: 50%;
  background: transparent;
  border: 1px solid var(--isales-border);
  color: var(--isales-muted-foreground);
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition:
    background 0.15s,
    color 0.15s;
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
  .brand__sub {
    display: none;
  }
}
</style>
