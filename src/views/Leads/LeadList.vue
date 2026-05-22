<template>
  <section class="leads">
    <!-- AI 可用状态横幅 — 整圈描边卡片式 -->
    <div class="ai-banner" :class="`ai-banner--${aiAvailable ? 'ok' : 'warn'}`">
      <span class="ai-banner__icon">
        <component :is="aiAvailable ? PhoneCall : Clock" :size="16" />
      </span>
      <p class="ai-banner__text">
        <strong>{{ aiAvailable ? "AI 外呼可用" : "AI 外呼待命" }}</strong>
        <span>
          {{
            aiAvailable
              ? "— 当前在可拨时段内，可对线索发起外呼"
              : "— 当前不在默认可拨时段（9:00–21:00），由所属 campaign 的 time-window 决定"
          }}
        </span>
      </p>
    </div>

    <PageHeader title="线索列表" :subtitle="`共 ${leadCount} 条线索`">
      <template #actions>
        <el-button @click="onImport">
          <Upload :size="14" style="margin-right: 4px" />
          CSV 导入
        </el-button>
        <el-button type="primary" @click="onNew">
          <Plus :size="15" style="margin-right: 4px" />
          添加线索
        </el-button>
      </template>
    </PageHeader>

    <!-- 过滤栏 -->
    <div class="leads__filters">
      <el-input
        v-model="searchInput"
        placeholder="按姓名 / 电话过滤"
        clearable
        class="leads__search"
      >
        <template #prefix>
          <Search :size="14" />
        </template>
      </el-input>
      <el-input-number
        v-model="store.params.campaign_id"
        :min="1"
        placeholder="campaign_id"
        controls-position="right"
        @change="onSearch"
      />
      <el-select
        v-model="store.params.status"
        placeholder="全部状态"
        clearable
        class="leads__status-select"
        @change="onSearch"
      >
        <el-option
          v-for="s in statuses"
          :key="s.value"
          :label="s.label"
          :value="s.value"
        />
      </el-select>
    </div>

    <!-- 卡片网格；空态在网格外居中显示 -->
    <el-empty
      v-if="!store.loading && filtered.length === 0"
      description="暂无线索"
      class="leads__empty"
    />
    <div v-else v-loading="store.loading" class="leads__grid">
      <article v-for="lead in filtered" :key="lead.id" class="lead-card">
        <header class="lead-card__header">
          <div class="lead-card__identity">
            <h3 class="lead-card__name">{{ lead.name || "未命名客户" }}</h3>
            <p class="lead-card__phone">{{ lead.phone }}</p>
          </div>
          <StatusBadge :color="leadStatusMeta(lead.status).color">
            {{ leadStatusMeta(lead.status).label }}
          </StatusBadge>
        </header>

        <div class="lead-card__meta">
          <div class="meta-row">
            <span class="meta-row__label">线索来源</span>
            <span class="meta-row__value">{{ lead.source || "—" }}</span>
          </div>
          <div class="meta-row">
            <span class="meta-row__label">创建时间</span>
            <span class="meta-row__value">{{ formatDate(lead.created_at) }}</span>
          </div>
          <div v-if="lead.next_call_at" class="meta-row">
            <span class="meta-row__label">下次外呼</span>
            <span class="meta-row__value">{{ formatTime(lead.next_call_at) }}</span>
          </div>
          <div class="lead-card__note">
            <span class="meta-row__label">备注</span>
            <p
              class="lead-card__note-text"
              :class="{ 'lead-card__note-text--empty': !leadNote(lead) }"
            >
              {{ leadNote(lead) || "暂无备注" }}
            </p>
          </div>
        </div>

        <div class="lead-card__actions">
          <el-button
            type="primary"
            size="large"
            class="lead-card__dial"
            :disabled="!aiAvailable || lead.status === 'do_not_call'"
            @click="onDial(lead)"
          >
            <Phone :size="16" style="margin-right: 6px" />
            外呼
          </el-button>
          <IconButton label="编辑" @click="onEdit(lead)">
            <Edit :size="16" />
          </IconButton>
          <IconButton label="删除" variant="danger" @click="onDelete(lead)">
            <Trash2 :size="16" />
          </IconButton>
        </div>
      </article>
    </div>

    <div v-if="store.total !== null" class="leads__pagination">
      <el-pagination
        v-model:current-page="page"
        v-model:page-size="pageSize"
        :total="store.total"
        :page-sizes="[20, 50, 100, 200]"
        layout="total, sizes, prev, pager, next"
        background
        @current-change="onRefresh"
        @size-change="onRefresh"
      />
    </div>

    <LeadImportDialog v-model="importVisible" @imported="onRefresh" />
    <LeadEditDialog v-model="editVisible" :initial="editingLead" @saved="onRefresh" />
  </section>
</template>

<script setup lang="ts">
import { ElMessage, ElMessageBox } from "element-plus";
import { Clock, Edit, Phone, PhoneCall, Plus, Search, Trash2, Upload } from "lucide-vue-next";
import { computed, onMounted, ref } from "vue";

import { leadsApi } from "@/api/leads";
import IconButton from "@/components/Common/IconButton.vue";
import PageHeader from "@/components/Common/PageHeader.vue";
import StatusBadge from "@/components/Common/StatusBadge.vue";
import LeadEditDialog from "@/components/Lead/LeadEditDialog.vue";
import LeadImportDialog from "@/components/Lead/LeadImportDialog.vue";
import { leadStatusMeta } from "@/composables/useStatusMeta";
import { useLeadsStore } from "@/stores/leads";
import type { Lead, LeadStatus } from "@/types/lead";

const store = useLeadsStore();
const importVisible = ref(false);
const editVisible = ref(false);
const editingLead = ref<Lead | null>(null);
const searchInput = ref("");

const statuses: { value: LeadStatus; label: string }[] = [
  { value: "new", label: "新线索" },
  { value: "queued", label: "待呼叫" },
  { value: "calling", label: "呼叫中" },
  { value: "retrying", label: "重试中" },
  { value: "following_up", label: "跟进中" },
  { value: "appointed", label: "已预约" },
  { value: "visited", label: "已到店" },
  { value: "transferred", label: "已转人工" },
  { value: "completed", label: "已完成" },
  { value: "failed", label: "失败" },
  { value: "follow_up_exhausted", label: "跟进耗尽" },
  { value: "do_not_call", label: "免打扰" },
  { value: "lost", label: "已流失" },
];

const page = computed({
  get: () => store.params.page ?? 1,
  set: (v) => {
    store.params.page = v;
  },
});
const pageSize = computed({
  get: () => store.params.page_size ?? 50,
  set: (v) => {
    store.params.page_size = v;
  },
});

const leadCount = computed(() => store.total ?? store.items.length);

// 简化版"AI 可用"判定：默认 09:00 ≤ now ≤ 21:00 视为可拨。
// 真正的逐 campaign time-window 评估在后端 scheduler 内做。
const aiAvailable = computed(() => {
  const hour = new Date().getHours();
  return hour >= 9 && hour < 21;
});

const filtered = computed(() => {
  const q = searchInput.value.trim().toLowerCase();
  if (!q) return store.items;
  return store.items.filter(
    (l) =>
      (l.name && l.name.toLowerCase().includes(q)) ||
      l.phone.toLowerCase().includes(q),
  );
});

// Lead 表无独立 notes 字段；备注按约定从 custom_data 取常见 key。
const NOTE_KEYS = ["note", "remark", "notes", "备注"];
function leadNote(lead: Lead): string {
  const cd = lead.custom_data ?? {};
  for (const k of NOTE_KEYS) {
    const v = cd[k];
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return "";
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`;
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function onRefresh() {
  void store.fetchAll();
}

function onSearch() {
  store.params.page = 1;
  onRefresh();
}

function onImport() {
  importVisible.value = true;
}

function onNew() {
  editingLead.value = null;
  editVisible.value = true;
}

function onEdit(row: Lead) {
  editingLead.value = row;
  editVisible.value = true;
}

async function onDelete(row: Lead) {
  try {
    await ElMessageBox.confirm(`确认删除线索"${row.name || row.phone}"？`, "删除确认", {
      type: "warning",
    });
    await leadsApi.remove(row.id);
    ElMessage.success("已删除");
    onRefresh();
  } catch {
    // cancelled
  }
}

async function onDial(row: Lead) {
  try {
    await ElMessageBox.confirm(
      `将立即对"${row.name || row.phone}"发起 AI 外呼。继续？`,
      "外呼确认",
      { type: "info" },
    );
    await leadsApi.update(row.id, { status: "queued" });
    ElMessage.success("外呼已加入队列");
    onRefresh();
  } catch {
    // cancelled
  }
}

onMounted(onRefresh);
</script>

<style scoped>
.leads {
  display: flex;
  flex-direction: column;
}

/* ---- AI banner ---- */
.ai-banner {
  display: flex;
  align-items: center;
  gap: var(--isales-space-3);
  padding: var(--isales-space-3) var(--isales-space-4);
  border-radius: var(--isales-radius);
  border: 1px solid;
  margin-bottom: var(--isales-space-5);
  font-size: var(--isales-font-size-sm);
}
.ai-banner--ok {
  background: #f0fdf4;
  border-color: #86efac;
  color: var(--isales-status-green-800);
}
.ai-banner--warn {
  background: #fffbeb;
  border-color: #fcd34d;
  color: var(--isales-status-yellow-800);
}
.ai-banner__icon {
  display: inline-flex;
  flex-shrink: 0;
}
.ai-banner__text {
  margin: 0;
  line-height: var(--isales-line-height-snug);
}
.ai-banner__text strong {
  font-weight: var(--isales-font-weight-semibold);
  margin-right: 2px;
}

/* ---- filters ---- */
.leads__filters {
  display: flex;
  align-items: center;
  gap: var(--isales-space-3);
  margin-bottom: var(--isales-space-4);
  flex-wrap: wrap;
}
.leads__search {
  flex: 1;
  max-width: 320px;
}
.leads__status-select {
  width: 160px;
}

/* ---- grid ---- */
.leads__grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(360px, 1fr));
  gap: var(--isales-space-4);
  align-items: stretch;
}
.leads__empty {
  padding: var(--isales-space-8) 0;
  background: var(--isales-card);
  border: 1px dashed var(--isales-border);
  border-radius: var(--isales-radius);
}
.leads__pagination {
  display: flex;
  justify-content: flex-end;
  margin-top: var(--isales-space-6);
}

/* ---- card ---- */
.lead-card {
  background: var(--isales-card);
  border: 1px solid var(--isales-border);
  border-radius: var(--isales-radius-lg);
  padding: var(--isales-space-5);
  display: flex;
  flex-direction: column;
  gap: var(--isales-space-4);
  transition:
    box-shadow 0.15s,
    border-color 0.15s;
}
.lead-card:hover {
  box-shadow: var(--isales-shadow-md);
}
.lead-card__header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: var(--isales-space-3);
}
.lead-card__identity {
  min-width: 0;
}
.lead-card__name {
  font-size: var(--isales-font-size-title-2);
  font-weight: var(--isales-font-weight-semibold);
  line-height: var(--isales-line-height-tight);
  letter-spacing: var(--isales-letter-spacing-tight);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.lead-card__phone {
  margin-top: 4px;
  font-size: var(--isales-font-size-sm);
  color: var(--isales-muted-foreground);
  font-variant-numeric: tabular-nums;
}

/* ---- meta ---- */
.lead-card__meta {
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
.lead-card__note {
  display: flex;
  flex-direction: column;
  gap: 2px;
  font-size: var(--isales-font-size-sm);
}
.lead-card__note .meta-row__label {
  color: var(--isales-muted-foreground);
}
.lead-card__note-text {
  margin: 0;
  color: var(--isales-foreground);
  line-height: var(--isales-line-height-snug);
  white-space: pre-wrap;
  word-break: break-word;
}
.lead-card__note-text--empty {
  color: var(--isales-muted-foreground);
}

/* ---- actions ---- */
.lead-card__actions {
  display: flex;
  gap: var(--isales-space-2);
  margin-top: auto;
}
.lead-card__dial {
  flex: 1;
}
</style>
