<template>
  <el-card>
    <template #header>
      <div class="header">
        <span class="title">线索管理</span>
        <div>
          <el-button @click="onImport">CSV 导入</el-button>
          <el-button type="primary" @click="onNew">新建</el-button>
          <el-button @click="onRefresh">刷新</el-button>
        </div>
      </div>
    </template>

    <el-form :inline="true" :model="store.params" class="filter">
      <el-form-item label="任务">
        <el-input-number
          v-model="store.params.campaign_id"
          :min="1"
          placeholder="campaign_id"
          controls-position="right"
        />
      </el-form-item>
      <el-form-item label="状态">
        <el-select
          v-model="store.params.status"
          placeholder="全部"
          clearable
          style="width: 160px"
        >
          <el-option
            v-for="s in statuses"
            :key="s.value"
            :label="s.label"
            :value="s.value"
          />
        </el-select>
      </el-form-item>
      <el-form-item>
        <el-button type="primary" @click="onSearch">查询</el-button>
      </el-form-item>
    </el-form>

    <el-table v-loading="store.loading" :data="store.items" stripe empty-text="暂无线索">
      <el-table-column prop="id" label="ID" width="80" />
      <el-table-column prop="phone" label="电话" width="180" />
      <el-table-column prop="name" label="姓名" width="120" />
      <el-table-column prop="status" label="状态" width="120">
        <template #default="{ row }">
          <el-tag :type="statusTag(row.status)">{{ row.status }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="retry_count" label="重试" width="80" />
      <el-table-column prop="follow_up_count" label="跟进" width="80" />
      <el-table-column prop="next_call_at" label="下次呼叫" width="180" />
      <el-table-column prop="last_hangup_cause" label="最近挂断原因" />
      <el-table-column label="操作" width="100" fixed="right">
        <template #default="{ row }">
          <el-button link type="primary" @click="onEdit(row)">编辑</el-button>
        </template>
      </el-table-column>
    </el-table>

    <div class="pagination" v-if="store.total !== null">
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
  </el-card>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from "vue";

import LeadEditDialog from "@/components/Lead/LeadEditDialog.vue";
import LeadImportDialog from "@/components/Lead/LeadImportDialog.vue";
import { useLeadsStore } from "@/stores/leads";
import type { Lead, LeadStatus } from "@/types/lead";

const store = useLeadsStore();
const importVisible = ref(false);
const editVisible = ref(false);
const editingLead = ref<Lead | null>(null);

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

const statuses: { value: LeadStatus; label: string }[] = [
  { value: "new", label: "new" },
  { value: "queued", label: "queued" },
  { value: "calling", label: "calling" },
  { value: "retrying", label: "retrying" },
  { value: "following_up", label: "following_up" },
  { value: "completed", label: "completed" },
  { value: "failed", label: "failed" },
  { value: "follow_up_exhausted", label: "follow_up_exhausted" },
  { value: "do_not_call", label: "do_not_call" },
  { value: "transferred", label: "transferred" },
];

function statusTag(status: LeadStatus): "success" | "warning" | "info" | "danger" | "" {
  if (status === "completed" || status === "transferred") return "success";
  if (
    status === "calling" ||
    status === "retrying" ||
    status === "following_up" ||
    status === "queued"
  )
    return "warning";
  if (status === "failed" || status === "follow_up_exhausted" || status === "do_not_call")
    return "danger";
  return "info";
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

onMounted(onRefresh);
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
.filter {
  margin-bottom: 8px;
}
.pagination {
  display: flex;
  justify-content: flex-end;
  margin-top: 16px;
}
</style>
