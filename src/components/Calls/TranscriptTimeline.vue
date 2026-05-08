<template>
  <el-timeline>
    <el-timeline-item
      v-for="(ev, i) in events"
      :key="i"
      :type="iconColor(ev.type)"
      :timestamp="formatTs(ev.ts)"
    >
      <div class="event-row">
        <el-tag size="small" :type="iconColor(ev.type)">{{ ev.type }}</el-tag>
        <span v-if="getText(ev)" class="event-text">{{ getText(ev) }}</span>
      </div>
    </el-timeline-item>
  </el-timeline>
</template>

<script setup lang="ts">
import type { TranscriptEvent } from "@/types/call";

defineProps<{ events: TranscriptEvent[] }>();

function iconColor(type: string): "primary" | "success" | "warning" | "danger" | "info" {
  if (type === "ai_reply" || type === "greeting") return "primary";
  if (type === "user_speech") return "success";
  if (type === "interruption" || type === "default_reply_used" || type === "state_error")
    return "warning";
  if (type === "hangup" || type === "transfer_initiated" || type === "transfer_marked")
    return "danger";
  return "info";
}

function getText(ev: TranscriptEvent): string {
  if (typeof ev.text === "string") return ev.text;
  return "";
}

function formatTs(ms: number): string {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const ss = (s % 60).toString().padStart(2, "0");
  return `${m}:${ss}`;
}
</script>

<style scoped>
.event-row {
  display: flex;
  align-items: center;
  gap: 8px;
}
.event-text {
  color: #303133;
  font-size: 13px;
}
</style>
