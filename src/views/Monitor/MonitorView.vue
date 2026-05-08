<template>
  <el-card>
    <template #header>
      <div class="header">
        <span class="title">通话监控（campaign #{{ campaignId }}）</span>
        <el-tag :type="store.connected ? 'success' : 'danger'">
          {{ store.connected ? "已连接" : "未连接" }}
        </el-tag>
      </div>
    </template>
    <el-empty
      v-if="store.sortedCalls.length === 0"
      description="等待通话事件…"
    />
    <el-row v-else :gutter="16">
      <el-col v-for="snap in store.sortedCalls" :key="snap.call_record_id" :span="6">
        <CallCard :snapshot="snap" />
      </el-col>
    </el-row>
  </el-card>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted } from "vue";
import { useRoute } from "vue-router";

import CallCard from "@/components/Monitor/CallCard.vue";
import { useAuthStore } from "@/stores/auth";
import { useMonitoringStore } from "@/stores/monitoring";
import type { EngineEvent } from "@/types/engineEvent";
import { ReconnectingWsClient } from "@/utils/wsClient";

const route = useRoute();
const auth = useAuthStore();
const store = useMonitoringStore();

const campaignId = computed(() => Number(route.params.campaign_id));

let client: ReconnectingWsClient<EngineEvent> | null = null;

onMounted(() => {
  if (!Number.isFinite(campaignId.value)) return;
  store.reset();
  const wsBase = import.meta.env.VITE_WS_BASE ?? "/ws";
  const protocol = window.location.protocol === "https:" ? "wss" : "ws";
  // wsBase may be relative; concat onto current host.
  const url = `${protocol}://${window.location.host}${wsBase}/calls/${campaignId.value}?token=${encodeURIComponent(auth.token ?? "")}`;
  client = new ReconnectingWsClient<EngineEvent>({
    url,
    onOpen: () => store.setConnected(true),
    onClose: () => store.setConnected(false),
    onMessage: (event) => store.handleEvent(event),
  });
  client.start();
});

onUnmounted(() => {
  client?.stop();
  client = null;
  store.reset();
});
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
