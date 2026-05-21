<template>
  <article class="ap-card" :class="{ 'ap-card--dim': isTerminal }">
    <header class="ap-card__head">
      <div class="ap-card__lead">
        <span class="ap-card__avatar">
          <User :size="18" />
        </span>
        <div>
          <h3 class="ap-card__name">
            {{ appointment.lead_name || "客户" }}
          </h3>
          <p class="ap-card__phone">{{ appointment.lead_phone || "—" }}</p>
        </div>
      </div>
      <StatusBadge :color="statusMeta.color">{{ statusMeta.label }}</StatusBadge>
    </header>

    <dl class="ap-card__meta">
      <div>
        <dt><Calendar :size="13" /> 时间</dt>
        <dd>{{ formattedTime }}</dd>
      </div>
      <div>
        <dt><MapPin :size="13" /> 地址</dt>
        <dd>{{ appointment.store_address }}</dd>
      </div>
      <div>
        <dt><Compass :size="13" /> 到店指引</dt>
        <dd class="ap-card__directions">{{ appointment.directions }}</dd>
      </div>
      <div v-if="appointment.notes">
        <dt><StickyNote :size="13" /> 备注</dt>
        <dd>{{ appointment.notes }}</dd>
      </div>
    </dl>

    <div v-if="!isTerminal" class="ap-card__actions">
      <el-button
        v-if="appointment.status === 'pending'"
        type="primary"
        size="small"
        @click="emit('action', { id: appointment.id, action: 'confirm' })"
      >
        <CheckCircle :size="14" style="margin-right: 4px" />
        确认预约
      </el-button>
      <el-button
        v-if="appointment.status === 'confirmed'"
        type="primary"
        size="small"
        @click="emit('action', { id: appointment.id, action: 'complete' })"
      >
        <CheckCheck :size="14" style="margin-right: 4px" />
        标记完成
      </el-button>
      <el-button
        size="small"
        plain
        type="danger"
        @click="emit('action', { id: appointment.id, action: 'cancel' })"
      >
        <XCircle :size="14" style="margin-right: 4px" />
        取消
      </el-button>
    </div>
  </article>
</template>

<script setup lang="ts">
import {
  Calendar,
  CheckCheck,
  CheckCircle,
  Compass,
  MapPin,
  StickyNote,
  User,
  XCircle,
} from "lucide-vue-next";
import { computed } from "vue";

import StatusBadge from "@/components/Common/StatusBadge.vue";
import { appointmentStatusMeta } from "@/composables/useStatusMeta";
import type {
  Appointment,
  AppointmentAction,
} from "@/types/appointment";

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
  border-radius: var(--isales-radius);
  padding: var(--isales-space-4);
  display: flex;
  flex-direction: column;
  gap: var(--isales-space-3);
  transition:
    opacity 0.15s,
    box-shadow 0.15s;
}
.ap-card:hover {
  box-shadow: var(--isales-shadow-sm);
}
.ap-card--dim {
  opacity: 0.7;
}
.ap-card__head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: var(--isales-space-2);
}
.ap-card__lead {
  display: flex;
  align-items: center;
  gap: var(--isales-space-3);
  min-width: 0;
}
.ap-card__avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: var(--isales-status-purple-100);
  color: var(--isales-status-purple-800);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.ap-card__name {
  font-size: var(--isales-font-size-title-3);
  font-weight: var(--isales-font-weight-semibold);
  line-height: var(--isales-line-height-tight);
  letter-spacing: var(--isales-letter-spacing-tight);
}
.ap-card__phone {
  margin-top: 2px;
  font-size: var(--isales-font-size-sm);
  color: var(--isales-muted-foreground);
  font-variant-numeric: tabular-nums;
  line-height: var(--isales-line-height-snug);
}
.ap-card__meta {
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: var(--isales-space-2);
  font-size: var(--isales-font-size-sm);
}
.ap-card__meta dt {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  color: var(--isales-muted-foreground);
  font-size: var(--isales-font-size-xs);
  margin-bottom: 2px;
  letter-spacing: var(--isales-letter-spacing-wide);
}
.ap-card__meta dd {
  margin: 0;
  color: var(--isales-foreground);
  line-height: var(--isales-line-height-snug);
}
.ap-card__directions {
  white-space: pre-wrap;
}
.ap-card__actions {
  display: flex;
  gap: var(--isales-space-2);
  padding-top: var(--isales-space-3);
  margin-top: auto;
  border-top: 1px solid var(--isales-border);
}
</style>
