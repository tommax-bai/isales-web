<template>
  <section class="leads">
    <PageHeader
      title="线索管理"
      subtitle="客户线索池，逐条点击外呼或批量导入。"
      :icon="Users"
      icon-color="primary"
    >
      <template #actions>
        <el-button @click="onImport">
          <Upload :size="14" style="margin-right: 4px" />
          CSV 导入
        </el-button>
        <el-button type="primary" @click="onNew">
          <UserPlus :size="14" style="margin-right: 4px" />
          新增线索
        </el-button>
      </template>
    </PageHeader>

    <!-- AI 可用状态横幅 -->
    <el-alert
      :type="aiAvailable ? 'success' : 'warning'"
      :closable="false"
      show-icon
      class="leads__alert"
    >
      <template #title>
        <span v-if="aiAvailable">
          AI 外呼通路就绪 — 当前在可拨时段内，可对线索发起外呼。
        </span>
        <span v-else>
          当前不在默认可拨时段（9:00–21:00），AI 外呼按钮处于待命状态；具体时段由所属 campaign 的
          time-window 决定。
        </span>
      </template>
    </el-alert>

    <!-- 过滤栏 -->
    <div class="leads__filters">
      <el-input
        v-model="searchInput"
        placeholder="按姓名 / 电话过滤（仅前端）"
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

    <!-- 卡片网格 -->
    <div v-loading="store.loading" class="leads__grid">
      <el-empty v-if="filtered.length === 0" description="暂无线索" />
      <article
        v-for="lead in filtered"
        :key="lead.id"
        class="lead-card"
      >
        <div class="lead-card__header">
          <div class="lead-card__id">
            <div class="lead-card__avatar">
              <User :size="18" />
            </div>
            <div>
              <h3 class="lead-card__name">{{ lead.name || "未命名客户" }}</h3>
              <p class="lead-card__phone">{{ lead.phone }}</p>
            </div>
          </div>
          <StatusBadge :color="leadStatusMeta(lead.status).color">
            {{ leadStatusMeta(lead.status).label }}
          </StatusBadge>
        </div>

        <dl class="lead-card__meta">
          <div v-if="lead.source">
            <dt>来源</dt>
            <dd>{{ lead.source }}</dd>
          </div>
          <div v-if="lead.next_call_at">
            <dt>下次外呼</dt>
            <dd>{{ formatTime(lead.next_call_at) }}</dd>
          </div>
          <div v-if="lead.last_hangup_cause">
            <dt>最近挂断</dt>
            <dd>{{ lead.last_hangup_cause }}</dd>
          </div>
        </dl>

        <div class="lead-card__actions">
          <el-button
            type="primary"
            size="small"
            :disabled="!aiAvailable || lead.status === 'do_not_call'"
            @click="onDial(lead)"
          >
            <Phone :size="14" style="margin-right: 4px" />
            外呼
          </el-button>
          <el-button size="small" @click="onEdit(lead)">
            <Edit :size="14" style="margin-right: 4px" />
            编辑
          </el-button>
          <el-button size="small" type="danger" plain @click="onDelete(lead)">
            <Trash2 :size="14" style="margin-right: 4px" />
            删除
          </el-button>
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
    <LeadEditDialog
      v-model="editVisible"
      :initial="editingLead"
      @saved="onRefresh"
    />
  </section>
</template>

<script setup lang="ts">
import { ElMessage, ElMessageBox } from "element-plus";
import {
  Edit,
  Phone,
  Search,
  Trash2,
  Upload,
  User,
  UserPlus,
  Users,
} from "lucide-vue-next";
import { computed, onMounted, ref } from "vue";

import { leadsApi } from "@/api/leads";
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

// 简化版"AI 可用"判定：默认 09:00 ≤ now ≤ 21:00 视为可拨。
// 真正的逐 campaign time-window 评估在后端 scheduler 内做；这里仅是
// 前端给操作者的一个软提示，不阻塞外呼动作（按钮本身仍可用）。
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

function formatTime(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
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
    // 推进 lead 进入 queued；真正排队由 scheduler 处理。
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
.leads__alert {
  margin-bottom: 16px;
}
.leads__filters {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
  flex-wrap: wrap;
}
.leads__search {
  flex: 1;
  max-width: 320px;
}
.leads__status-select {
  width: 160px;
}
.leads__grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 16px;
}
.leads__pagination {
  display: flex;
  justify-content: flex-end;
  margin-top: 24px;
}

.lead-card {
  background: var(--isales-card);
  border: 1px solid var(--isales-border);
  border-radius: var(--isales-radius);
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  transition: box-shadow 0.15s;
}
.lead-card:hover {
  box-shadow: var(--isales-shadow-md);
}
.lead-card__header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 8px;
}
.lead-card__id {
  display: flex;
  align-items: center;
  gap: 10px;
}
.lead-card__avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: var(--isales-status-blue-100);
  color: var(--isales-status-blue-800);
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
.lead-card__name {
  margin: 0;
  font-size: 15px;
  font-weight: var(--isales-font-weight-bold);
}
.lead-card__phone {
  margin: 2px 0 0;
  font-size: 13px;
  color: var(--isales-muted-foreground);
}
.lead-card__meta {
  margin: 0;
  display: grid;
  grid-template-columns: max-content 1fr;
  column-gap: 12px;
  row-gap: 4px;
  font-size: 13px;
}
.lead-card__meta dt {
  color: var(--isales-muted-foreground);
}
.lead-card__meta dd {
  margin: 0;
  color: var(--isales-foreground);
}
.lead-card__actions {
  display: flex;
  gap: 8px;
  padding-top: 8px;
  border-top: 1px dashed var(--isales-border);
}
</style>
