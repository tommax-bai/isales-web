<template>
  <section class="calls">
    <PageHeader title="外呼记录" :subtitle="`共 ${total ?? items.length} 条记录`">
      <template #actions>
        <el-button @click="onRefresh">刷新</el-button>
      </template>
    </PageHeader>

    <el-empty
      v-if="!loading && items.length === 0"
      description="暂无通话记录"
      class="calls__empty"
    />
    <div v-else v-loading="loading" class="calls__list">
      <article v-for="call in items" :key="call.id" class="call-card">
        <header class="call-card__head">
          <div class="call-card__identity">
            <h3 class="call-card__name">线索 #{{ call.lead_id }}</h3>
            <p class="call-card__phone">{{ call.caller_id || "未知主叫" }}</p>
          </div>
          <StatusBadge :color="callResultColor(call.status)">
            {{ callResultLabel(call.status) }}
          </StatusBadge>
        </header>

        <div class="call-card__meta">
          <div class="meta-row">
            <span class="meta-row__label">开始时间</span>
            <span class="meta-row__value">
              {{ call.started_at ? formatTime(call.started_at) : "—" }}
            </span>
          </div>
          <div class="meta-row">
            <span class="meta-row__label">通话时长</span>
            <span class="meta-row__value">{{ formatDuration(call.duration) }}</span>
          </div>
          <div
            v-if="call.transfer_status && call.transfer_status !== 'none'"
            class="meta-row"
          >
            <span class="meta-row__label">转人工</span>
            <span class="meta-row__value">
              {{ call.transfer_status }} / {{ call.transfer_reason || "—" }}
            </span>
          </div>
        </div>

        <GoalAchievementPanel
          v-if="summaries[call.id]"
          :summary="summaries[call.id]"
        />

        <div class="call-card__actions">
          <el-button
            size="large"
            class="call-card__toggle"
            @click="onToggleTranscript(call.id)"
          >
            <MessageSquare :size="16" style="margin-right: 6px" />
            {{ expanded[call.id] ? "收起对话" : "查看通话内容" }}
          </el-button>
          <IconButton label="查看详情" @click="onDetail(call)">
            <ArrowRight :size="16" />
          </IconButton>
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
  </section>
</template>

<script setup lang="ts">
import { ElMessage } from "element-plus";
import { ArrowRight, MessageSquare } from "lucide-vue-next";
import { onMounted, reactive, ref } from "vue";
import { useRouter } from "vue-router";

import { callsApi } from "@/api/calls";
import GoalAchievementPanel from "@/components/Calls/GoalAchievementPanel.vue";
import TranscriptBubbles from "@/components/Calls/TranscriptBubbles.vue";
import IconButton from "@/components/Common/IconButton.vue";
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
  return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
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
  gap: var(--isales-space-4);
}
.calls__empty {
  padding: var(--isales-space-8) 0;
  background: var(--isales-card);
  border: 1px dashed var(--isales-border);
  border-radius: var(--isales-radius);
}
.calls__pagination {
  display: flex;
  justify-content: flex-end;
  margin-top: var(--isales-space-6);
}

/* ---- card ---- */
.call-card {
  background: var(--isales-card);
  border: 1px solid var(--isales-border);
  border-radius: var(--isales-radius-lg);
  padding: var(--isales-space-5);
  display: flex;
  flex-direction: column;
  gap: var(--isales-space-4);
  transition: box-shadow 0.15s;
}
.call-card:hover {
  box-shadow: var(--isales-shadow-md);
}
.call-card__head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: var(--isales-space-3);
}
.call-card__identity {
  min-width: 0;
}
.call-card__name {
  font-size: var(--isales-font-size-title-2);
  font-weight: var(--isales-font-weight-semibold);
  line-height: var(--isales-line-height-tight);
  letter-spacing: var(--isales-letter-spacing-tight);
}
.call-card__phone {
  margin-top: 4px;
  font-size: var(--isales-font-size-sm);
  color: var(--isales-muted-foreground);
  font-variant-numeric: tabular-nums;
}

/* ---- meta ---- */
.call-card__meta {
  display: flex;
  flex-direction: column;
  gap: var(--isales-space-2);
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
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* ---- actions ---- */
.call-card__actions {
  display: flex;
  gap: var(--isales-space-2);
  margin-top: auto;
}
.call-card__toggle {
  flex: 1;
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
