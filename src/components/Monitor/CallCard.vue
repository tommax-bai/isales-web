<template>
  <el-card class="call-card" :class="{ ended: snapshot.ended_at !== null }">
    <div class="row top">
      <span class="cid">#{{ snapshot.call_record_id }}</span>
      <el-tag :type="statusTag(snapshot.status)" size="small">
        {{ snapshot.status }}
      </el-tag>
    </div>
    <div class="row text-row">
      <div class="label">用户</div>
      <div class="text">{{ snapshot.asr_final || snapshot.asr_partial || "—" }}</div>
    </div>
    <div v-if="snapshot.hangup_cause" class="row hangup">
      <span class="label">挂断</span>
      <span>{{ snapshot.hangup_cause }}</span>
    </div>
  </el-card>
</template>

<script setup lang="ts">
import type { CallSnapshot } from "@/stores/monitoring";

defineProps<{ snapshot: CallSnapshot }>();

function statusTag(status: string): "success" | "warning" | "info" | "danger" | "" {
  if (status === "end") return "info";
  if (status === "speaking" || status === "wrapping_up") return "success";
  if (status === "transferring") return "warning";
  return "warning";
}
</script>

<style scoped>
.call-card {
  margin-bottom: 12px;
}
.call-card.ended {
  opacity: 0.6;
}
.row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}
.row.top {
  justify-content: space-between;
}
.cid {
  font-weight: 600;
}
.label {
  color: #909399;
  font-size: 12px;
  width: 32px;
}
.text {
  flex: 1;
  font-size: 13px;
  color: #303133;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.hangup {
  color: #909399;
  font-size: 12px;
}
</style>
