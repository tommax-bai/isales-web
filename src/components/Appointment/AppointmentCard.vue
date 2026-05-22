<template>
  <article class="ap-card" :class="{ 'ap-card--dim': isTerminal }">
    <header class="ap-card__head">
      <div class="ap-card__identity">
        <h3 class="ap-card__name">{{ appointment.lead_name || "客户" }}</h3>
        <p class="ap-card__phone">{{ appointment.lead_phone || "—" }}</p>
      </div>
      <StatusBadge :color="statusMeta.color">{{ statusMeta.label }}</StatusBadge>
    </header>

    <div class="ap-card__meta">
      <div class="meta-row">
        <span class="meta-row__label">预约时间</span>
        <span class="meta-row__value">{{ formattedTime }}</span>
      </div>
      <div class="ap-card__block">
        <span class="meta-row__label">门店地址</span>
        <p class="ap-card__block-text">{{ appointment.store_address }}</p>
      </div>
      <div class="ap-card__block">
        <span class="meta-row__label">到店指引</span>
        <p class="ap-card__block-text">{{ appointment.directions }}</p>
      </div>
      <div class="ap-card__block">
        <span class="meta-row__label">备注</span>
        <p
          class="ap-card__block-text"
          :class="{ 'ap-card__block-text--empty': !appointment.notes }"
        >
          {{ appointment.notes || "暂无备注" }}
        </p>
      </div>
    </div>

    <div v-if="!isTerminal" class="ap-card__actions">
      <el-button
        v-if="appointment.status === 'pending'"
        type="primary"
        size="large"
        class="ap-card__main"
        @click="emit('action', { id: appointment.id, action: 'confirm' })"
      >
        <CheckCircle :size="16" style="margin-right: 6px" />
        确认预约
      </el-button>
      <el-button
        v-if="appointment.status === 'confirmed'"
        type="primary"
        size="large"
        class="ap-card__main"
        @click="emit('action', { id: appointment.id, action: 'complete' })"
      >
        <CheckCheck :size="16" style="margin-right: 6px" />
        标记完成
      </el-button>
      <IconButton
        label="取消预约"
        variant="danger"
        @click="emit('action', { id: appointment.id, action: 'cancel' })"
      >
        <XCircle :size="16" />
      </IconButton>
    </div>
  </article>
</template>

<script setup lang="ts">
import { CheckCheck, CheckCircle, XCircle } from "lucide-vue-next";
import { computed } from "vue";

import IconButton from "@/components/Common/IconButton.vue";
import StatusBadge from "@/components/Common/StatusBadge.vue";
import { appointmentStatusMeta } from "@/composables/useStatusMeta";
import type { Appointment, AppointmentAction } from "@/types/appointment";

const props = defineProps<{ appointment: Appointment }>();
const emit = defineEmits<{
  (e: "action", payload: { id: number; action: AppointmentAction }): void;
}>();

const statusMeta = computed(() => appointmentStatusMeta(props.appointment.status));
const isTerminal = computed(
  () =>
    props.appointment.status === "completed" ||
    props.appointment.status === "cancelled",
);

const formattedTime = computed(() => {
  const d = new Date(props.appointment.appointment_time);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  return `${yyyy}年${mm}月${dd}日 ${hh}:${mi}`;
});
</script>

<style scoped>
.ap-card {
  background: var(--isales-card);
  border: 1px solid var(--isales-border);
  border-radius: var(--isales-radius-lg);
  padding: var(--isales-space-5);
  display: flex;
  flex-direction: column;
  gap: var(--isales-space-4);
  transition:
    opacity 0.15s,
    box-shadow 0.15s;
}
.ap-card:hover {
  box-shadow: var(--isales-shadow-md);
}
.ap-card--dim {
  opacity: 0.7;
}
.ap-card__head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: var(--isales-space-3);
}
.ap-card__identity {
  min-width: 0;
}
.ap-card__name {
  font-size: var(--isales-font-size-title-2);
  font-weight: var(--isales-font-weight-semibold);
  line-height: var(--isales-line-height-tight);
  letter-spacing: var(--isales-letter-spacing-tight);
}
.ap-card__phone {
  margin-top: 4px;
  font-size: var(--isales-font-size-sm);
  color: var(--isales-muted-foreground);
  font-variant-numeric: tabular-nums;
}

/* ---- meta ---- */
.ap-card__meta {
  display: flex;
  flex-direction: column;
  gap: var(--isales-space-3);
}
.meta-row {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: var(--isales-space-3);
  font-size: var(--isales-font-size-sm);
}
.meta-row__label {
  color: var(--isales-muted-foreground);
  flex-shrink: 0;
}
.meta-row__value {
  color: var(--isales-foreground);
  text-align: right;
}
.ap-card__block {
  display: flex;
  flex-direction: column;
  gap: 2px;
  font-size: var(--isales-font-size-sm);
}
.ap-card__block-text {
  margin: 0;
  color: var(--isales-foreground);
  line-height: var(--isales-line-height-snug);
  white-space: pre-wrap;
  word-break: break-word;
}
.ap-card__block-text--empty {
  color: var(--isales-muted-foreground);
}

/* ---- actions ---- */
.ap-card__actions {
  display: flex;
  gap: var(--isales-space-2);
  margin-top: auto;
}
.ap-card__main {
  flex: 1;
}
</style>
