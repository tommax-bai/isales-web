<template>
  <section class="calls">
    <PageHeader
      title="外呼记录"
      subtitle="AI 通话记录及目标达成评估，可创建到店预约。"
      :icon="Phone"
      icon-color="primary"
    >
      <template #actions>
        <el-button @click="onRefresh">刷新</el-button>
      </template>
    </PageHeader>

    <div v-loading="loading" class="calls__list">
      <el-empty v-if="items.length === 0" description="暂无通话记录" />
      <article v-for="call in items" :key="call.id" class="call-card">
        <header class="call-card__head">
          <div class="call-card__primary">
            <span class="call-card__avatar">
              <Phone :size="18" />
            </span>
            <div>
              <h3 class="call-card__lead">线索 #{{ call.lead_id }}</h3>
              <p class="call-card__phone">{{ call.caller_id || "未知主叫" }}</p>
            </div>
          </div>
          <StatusBadge :color="callResultColor(call.status)">
            {{ callResultLabel(call.status) }}
          </StatusBadge>
        </header>

        <dl class="call-card__meta">
          <div>
            <dt>开始时间</dt>
            <dd>{{ call.started_at ? formatTime(call.started_at) : "—" }}</dd>
          </div>
          <div>
            <dt>时长</dt>
            <dd>{{ formatDuration(call.duration) }}</dd>
          </div>
          <div v-if="call.transfer_status && call.transfer_status !== 'none'">
            <dt>转人工</dt>
            <dd>{{ call.transfer_status }} / {{ call.transfer_reason || "—" }}</dd>
          </div>
        </dl>

        <GoalAchievementPanel
          v-if="summaries[call.id]"
          :summary="summaries[call.id]"
        />

        <div class="call-card__actions">
          <el-button size="small" link type="primary" @click="onDetail(call)">
            查看详情
          </el-button>
          <el-button
            v-if="canCreateAppointment(call)"
            size="small"
            type="primary"
            @click="onCreateAppointment(call)"
          >
            <Calendar :size="14" style="margin-right: 4px" />
            创建预约
          </el-button>
          <el-button
            size="small"
            @click="onToggleTranscript(call.id)"
          >
            <MessageSquare :size="14" style="margin-right: 4px" />
            {{ expanded[call.id] ? "收起对话" : "查看通话内容" }}
          </el-button>
        </div>

        <transition name="fade">
          <div v-if="expanded[call.id]" class="call-card__transcript">
            <p v-if="details[call.id] === undefined" class="loading-line">
              加载中…
            </p>
            <TranscriptBubbles
              v-else
              :transcript="details[call.id]?.transcript ?? []"
              max-height="12rem"
            />
          </div>
        </transition>
      </article>
    </div>

    <div v-if="total !== null" class="calls__pagination">
      <el-pagination
        v-model:current-page="page"
        v-model:page-size="pageSize"
        :total="total"
        :page-sizes="[20, 50, 100]"
        layout="total, sizes, prev, pager, next"
        background
        @current-change="onRefresh"
        @size-change="onRefresh"
      />
    </div>

    <CreateAppointmentDialog
      v-model="appointmentDialogVisible"
      :lead-id="appointmentLeadId"
      :call-id="appointmentCallId"
      @created="onAppointmentCreated"
    />
  </section>
</template>

<script setup lang="ts">
import { ElMessage } from "element-plus";
import { Calendar, MessageSquare, Phone } from "lucide-vue-next";
import { onMounted, reactive, ref } from "vue";
import { useRouter } from "vue-router";

import { callsApi } from "@/api/calls";
import CreateAppointmentDialog from "@/components/Calls/CreateAppointmentDialog.vue";
import GoalAchievementPanel from "@/components/Calls/GoalAchievementPanel.vue";
import TranscriptBubbles from "@/components/Calls/TranscriptBubbles.vue";
import PageHeader from "@/components/Common/PageHeader.vue";
import StatusBadge from "@/components/Common/StatusBadge.vue";
import type { CallRecordDetail, CallRecordSummary, CallSummary } from "@/types/call";

const router = useRouter();
const items = ref<CallRecordSummary[]>([]);
const summaries = reactive<Record<number, CallSummary | null>>({});
const details = reactive<Record<number, CallRecordDetail | undefined>>({});
const expanded = reactive<Record<number, boolean>>({});
const total = ref<number | null>(null);
const page = ref(1);
const pageSize = ref(20);
const loading = ref(false);

const appointmentDialogVisible = ref(false);
const appointmentLeadId = ref<number | null>(null);
const appointmentCallId = ref<number | null>(null);

async function onRefresh() {
  loading.value = true;
  try {
    const result = await callsApi.listPage({
      page: page.value,
      page_size: pageSize.value,
    });
    items.value = result.items;
    total.value = result.total;
    // pre-fetch summaries in parallel (404 → null, swallowed)
    await Promise.all(
      result.items.map(async (c) => {
        summaries[c.id] = await callsApi.summary(c.id);
      }),
    );
  } finally {
    loading.value = false;
  }
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function formatDuration(d: number | null): string {
  if (!d || d <= 0) return "—";
  const m = Math.floor(d / 60);
  const s = d % 60;
  return m > 0 ? `${m}分${s}秒` : `${s}秒`;
}

function callResultColor(
  status: string,
): "blue" | "green" | "yellow" | "gray" | "red" | "purple" {
  switch (status) {
    case "answered":
      return "blue";
    case "interested":
      return "green";
    case "appointment_booked":
      return "purple";
    case "no_answer":
    case "rejected":
    case "failed":
      return "red";
    case "transferred":
      return "yellow";
    default:
      return "gray";
  }
}

function callResultLabel(status: string): string {
  const map: Record<string, string> = {
    answered: "接通",
    interested: "意向客户",
    appointment_booked: "已预约",
    no_answer: "未接听",
    rejected: "拒接",
    failed: "失败",
    transferred: "已转人工",
    completed: "已完成",
  };
  return map[status] ?? status;
}

function canCreateAppointment(call: CallRecordSummary): boolean {
  return ["answered", "interested"].includes(call.status);
}

function onCreateAppointment(call: CallRecordSummary) {
  appointmentLeadId.value = call.lead_id;
  appointmentCallId.value = call.id;
  appointmentDialogVisible.value = true;
}

function onAppointmentCreated() {
  ElMessage.success("已创建预约，可前往预约管理查看");
  void onRefresh();
}

function onDetail(call: CallRecordSummary) {
  void router.push({ name: "call-detail", params: { id: call.id } });
}

async function onToggleTranscript(id: number) {
  expanded[id] = !expanded[id];
  if (expanded[id] && details[id] === undefined) {
    try {
      details[id] = await callsApi.get(id);
    } catch {
      details[id] = undefined;
      ElMessage.warning("加载通话内容失败");
      expanded[id] = false;
    }
  }
}

onMounted(onRefresh);
</script>

<style scoped>
.calls {
  display: flex;
  flex-direction: column;
}
.calls__list {
  display: flex;
  flex-direction: column;
  gap: var(--isales-space-3);
}
.calls__pagination {
  display: flex;
  justify-content: flex-end;
  margin-top: var(--isales-space-6);
}

.call-card {
  background: var(--isales-card);
  border: 1px solid var(--isales-border);
  border-radius: var(--isales-radius);
  padding: var(--isales-space-4);
  display: flex;
  flex-direction: column;
  gap: var(--isales-space-3);
  transition: box-shadow 0.15s;
}
.call-card:hover {
  box-shadow: var(--isales-shadow-sm);
}
.call-card__head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: var(--isales-space-2);
}
.call-card__primary {
  display: flex;
  align-items: center;
  gap: var(--isales-space-3);
  min-width: 0;
}
.call-card__avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: var(--isales-status-blue-100);
  color: var(--isales-status-blue-800);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.call-card__lead {
  font-size: var(--isales-font-size-title-3);
  font-weight: var(--isales-font-weight-semibold);
  line-height: var(--isales-line-height-tight);
}
.call-card__phone {
  margin-top: 2px;
  font-size: var(--isales-font-size-sm);
  color: var(--isales-muted-foreground);
  font-variant-numeric: tabular-nums;
  line-height: var(--isales-line-height-snug);
}
.call-card__meta {
  margin: 0;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: var(--isales-space-3);
  font-size: var(--isales-font-size-sm);
}
.call-card__meta dt {
  color: var(--isales-muted-foreground);
  font-size: var(--isales-font-size-xs);
  margin-bottom: 2px;
  letter-spacing: var(--isales-letter-spacing-wide);
}
.call-card__meta dd {
  margin: 0;
  line-height: var(--isales-line-height-snug);
}
.call-card__actions {
  display: flex;
  gap: var(--isales-space-2);
  flex-wrap: wrap;
  padding-top: var(--isales-space-3);
  border-top: 1px solid var(--isales-border);
}
.call-card__transcript {
  border-top: 1px solid var(--isales-border);
  padding-top: var(--isales-space-3);
}
.loading-line {
  text-align: center;
  margin: var(--isales-space-2) 0;
  color: var(--isales-muted-foreground);
  font-size: var(--isales-font-size-sm);
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
