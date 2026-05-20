<template>
  <section class="operations">
    <header class="ops-header">
      <div class="ops-header__icon" aria-hidden="true">
        <LayoutGrid :size="22" />
      </div>
      <div>
        <h1 class="ops-header__title">运营管理</h1>
        <p class="ops-header__sub">
          后台平台运营所需的工具入口。客户侧导航与此区独立，避免噪声。
        </p>
      </div>
    </header>

    <div class="ops-grid">
      <router-link
        v-for="card in cards"
        :key="card.name"
        :to="card.to"
        class="ops-card"
      >
        <span class="ops-card__icon" :style="{ color: card.color }">
          <component :is="card.icon" :size="22" />
        </span>
        <div class="ops-card__body">
          <h3 class="ops-card__title">{{ card.label }}</h3>
          <p class="ops-card__desc">{{ card.desc }}</p>
        </div>
      </router-link>
    </div>
  </section>
</template>

<script setup lang="ts">
import {
  BarChart3,
  CalendarOff,
  Cpu,
  Headphones,
  LayoutGrid,
  Megaphone,
  Music,
  Radio,
  ServerCog,
  Smartphone,
  Webhook,
} from "lucide-vue-next";

const cards = [
  {
    name: "operations-dashboard",
    to: { name: "operations-dashboard" },
    icon: BarChart3,
    label: "数据看板",
    desc: "拨打成功率 / 目标命中率 / 时长分布",
    color: "#1d4ed8",
  },
  {
    name: "operations-campaigns",
    to: { name: "operations-campaigns" },
    icon: Megaphone,
    label: "任务管理",
    desc: "Campaign 配置、设备绑定、启停",
    color: "#15803d",
  },
  {
    name: "operations-monitor",
    to: { name: "operations-monitor", params: { campaign_id: "0" } },
    icon: Radio,
    label: "通话监控",
    desc: "实时 WebSocket 通话流",
    color: "#b45309",
  },
  {
    name: "operations-callback-configs",
    to: { name: "operations-callback-configs" },
    icon: Webhook,
    label: "回调配置",
    desc: "Webhook trigger / URL / 模板",
    color: "#7e22ce",
  },
  {
    name: "operations-callback-logs",
    to: { name: "operations-callback-logs" },
    icon: ServerCog,
    label: "回调记录",
    desc: "请求 / 响应 / 重试状态",
    color: "#374151",
  },
  {
    name: "operations-handoff-tasks",
    to: { name: "operations-handoff-tasks" },
    icon: Headphones,
    label: "转人工任务",
    desc: "Agent 接管任务列表",
    color: "#b91c1c",
  },
  {
    name: "operations-holidays",
    to: { name: "operations-holidays" },
    icon: CalendarOff,
    label: "节假日",
    desc: "假期表（time-window 联动）",
    color: "#92400e",
  },
  {
    name: "operations-devices",
    to: { name: "operations-devices" },
    icon: Cpu,
    label: "设备管理",
    desc: "USB GSM modem 与状态",
    color: "#1e40af",
  },
  {
    name: "operations-sim-cards",
    to: { name: "operations-sim-cards" },
    icon: Smartphone,
    label: "SIM 卡",
    desc: "卡片 / 余额 / 信号强度",
    color: "#166534",
  },
  {
    name: "operations-voice-models",
    to: { name: "operations-voice-models" },
    icon: Music,
    label: "音色管理",
    desc: "TTS 音色样本与绑定",
    color: "#6b21a8",
  },
];
</script>

<style scoped>
.operations {
  display: flex;
  flex-direction: column;
  gap: 24px;
}
.ops-header {
  display: flex;
  align-items: center;
  gap: 16px;
}
.ops-header__icon {
  width: 48px;
  height: 48px;
  border-radius: var(--isales-radius-lg);
  background: var(--isales-primary);
  color: var(--isales-primary-foreground);
  display: flex;
  align-items: center;
  justify-content: center;
}
.ops-header__title {
  margin: 0;
  font-size: 22px;
  font-weight: var(--isales-font-weight-bold);
}
.ops-header__sub {
  margin: 4px 0 0;
  font-size: 14px;
  color: var(--isales-muted-foreground);
}
.ops-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 16px;
}
.ops-card {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 16px;
  background: var(--isales-card);
  border: 1px solid var(--isales-border);
  border-radius: var(--isales-radius);
  text-decoration: none;
  color: inherit;
  transition: box-shadow 0.15s, transform 0.15s;
}
.ops-card:hover {
  box-shadow: var(--isales-shadow-md);
  transform: translateY(-1px);
}
.ops-card__icon {
  width: 40px;
  height: 40px;
  border-radius: var(--isales-radius);
  background: var(--isales-muted);
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
.ops-card__title {
  margin: 0;
  font-size: 15px;
  font-weight: var(--isales-font-weight-medium);
}
.ops-card__desc {
  margin: 4px 0 0;
  font-size: 13px;
  color: var(--isales-muted-foreground);
}
</style>
