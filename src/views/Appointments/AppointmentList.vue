<template>
  <section class="appointments">
    <PageHeader
      title="预约管理"
      subtitle="到店预约的确认与跟进。"
      :icon="Calendar"
      icon-color="primary"
    >
      <template #actions>
        <el-button @click="onRefresh">刷新</el-button>
      </template>
    </PageHeader>

    <!-- 即将到店 -->
    <section class="group" v-loading="loading">
      <div class="group__head">
        <Clock :size="16" />
        <h2 class="group__title">即将到店</h2>
        <StatusBadge color="purple">{{ upcoming.length }}</StatusBadge>
      </div>
      <p v-if="upcoming.length === 0" class="group__empty">
        暂无即将到店的预约
      </p>
      <div v-else class="group__grid">
        <AppointmentCard
          v-for="ap in upcoming"
          :key="ap.id"
          :appointment="ap"
          @action="onAction"
        />
      </div>
    </section>

    <!-- 历史预约 — 仅当存在时显示 -->
    <section v-if="history.length > 0" class="group">
      <div class="group__head">
        <Archive :size="16" />
        <h2 class="group__title">历史预约</h2>
        <StatusBadge color="gray">{{ history.length }}</StatusBadge>
      </div>
      <div class="group__grid">
        <AppointmentCard
          v-for="ap in history"
          :key="ap.id"
          :appointment="ap"
          @action="onAction"
        />
      </div>
    </section>
  </section>
</template>

<script setup lang="ts">
import { ElMessage } from "element-plus";
import { Archive, Calendar, Clock } from "lucide-vue-next";
import { computed, onMounted, ref } from "vue";

import { appointmentsApi } from "@/api/appointments";
import AppointmentCard from "@/components/Appointment/AppointmentCard.vue";
import PageHeader from "@/components/Common/PageHeader.vue";
import StatusBadge from "@/components/Common/StatusBadge.vue";
import type { Appointment, AppointmentAction } from "@/types/appointment";

const items = ref<Appointment[]>([]);
const loading = ref(false);

const upcoming = computed(() =>
  items.value
    .filter((a) => a.status === "pending" || a.status === "confirmed")
    .sort(
      (a, b) =>
        new Date(a.appointment_time).getTime() -
        new Date(b.appointment_time).getTime(),
    ),
);

const history = computed(() =>
  items.value
    .filter((a) => a.status === "completed" || a.status === "cancelled")
    .sort(
      (a, b) =>
        new Date(b.appointment_time).getTime() -
        new Date(a.appointment_time).getTime(),
    ),
);

async function onRefresh() {
  loading.value = true;
  try {
    const result = await appointmentsApi.list({ page_size: 200 });
    items.value = result.items;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "加载预约失败";
    ElMessage.error(msg);
  } finally {
    loading.value = false;
  }
}

async function onAction(payload: { id: number; action: AppointmentAction }) {
  try {
    await appointmentsApi.transition(payload.id, payload.action);
    ElMessage.success(
      payload.action === "confirm"
        ? "已确认预约"
        : payload.action === "complete"
          ? "已标记完成"
          : "已取消预约",
    );
    onRefresh();
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "操作失败";
    ElMessage.error(msg);
  }
}

onMounted(onRefresh);
</script>

<style scoped>
.appointments {
  display: flex;
  flex-direction: column;
  gap: 32px;
}
.group {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.group__head {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
}
.group__title {
  margin: 0;
  font-size: 16px;
  font-weight: var(--isales-font-weight-bold);
}
.group__empty {
  margin: 0;
  padding: 24px;
  text-align: center;
  color: var(--isales-muted-foreground);
  background: var(--isales-card);
  border: 1px dashed var(--isales-border);
  border-radius: var(--isales-radius);
  font-size: 14px;
}
.group__grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(360px, 1fr));
  gap: 16px;
}
</style>
