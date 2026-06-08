<template>
  <el-card>
    <template #header>
      <div class="header">
        <span class="title">任务管理</span>
        <el-button type="primary" @click="onNew">新建任务</el-button>
      </div>
    </template>

    <el-alert
      v-if="store.error"
      :title="store.error"
      type="error"
      show-icon
      class="error"
    />

    <el-table
      v-loading="store.loading"
      :data="store.items"
      stripe
      empty-text="暂无任务"
    >
      <el-table-column prop="id" label="ID" width="80" />
      <el-table-column prop="name" label="名称" />
      <el-table-column prop="concurrency" label="并发上限" width="120" />
      <el-table-column label="默认回复" width="200">
        <template #default="{ row }">
          <el-tag
            v-for="(r, i) in row.default_replies?.slice(0, 2) ?? []"
            :key="i"
            size="small"
            class="reply-tag"
          >
            {{ r }}
          </el-tag>
          <span
            v-if="(row.default_replies?.length ?? 0) > 2"
            class="reply-more"
          >
            +{{ (row.default_replies?.length ?? 0) - 2 }}
          </span>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="280" fixed="right">
        <template #default="{ row }">
          <el-button type="primary" link @click="onEdit(row)">编辑</el-button>
          <el-button type="success" link @click="onStart(row)">启动</el-button>
          <el-button type="warning" link @click="onPause(row)">暂停</el-button>
          <el-popconfirm
            title="确认删除？此操作不可撤销"
            @confirm="onDelete(row)"
          >
            <template #reference>
              <el-button type="danger" link>删除</el-button>
            </template>
          </el-popconfirm>
        </template>
      </el-table-column>
    </el-table>

    <CampaignEditDialog
      v-model="dialogVisible"
      :initial="dialogInitial"
      @saved="onSaved"
    />
  </el-card>
</template>

<script setup lang="ts">
import { ElMessage } from "element-plus";
import { onMounted, ref } from "vue";
import { useRouter } from "vue-router";

import CampaignEditDialog from "@/components/Campaign/CampaignEditDialog.vue";
import { useCampaignsStore } from "@/stores/campaigns";
import type { CampaignSummary } from "@/types/campaign";

const store = useCampaignsStore();
const router = useRouter();

const dialogVisible = ref(false);
const dialogInitial = ref<CampaignSummary | null>(null);

onMounted(() => {
  void store.fetchAll();
});

function onNew() {
  // The dialog still owns "new" since required fields fit in a small form;
  // editing routes to the full 9-tab CampaignEdit page (impl-web-polish PR #4).
  dialogInitial.value = null;
  dialogVisible.value = true;
}

function onEdit(row: CampaignSummary) {
  void router.push({ name: "operations-campaign-edit", params: { id: row.id } });
}

async function onStart(row: CampaignSummary) {
  try {
    await store.start(row.id);
    ElMessage.success(`任务「${row.name}」已启动`);
  } catch {
    ElMessage.error("启动失败");
  }
}

async function onPause(row: CampaignSummary) {
  try {
    await store.pause(row.id);
    ElMessage.success(`任务「${row.name}」已暂停`);
  } catch {
    ElMessage.error("暂停失败");
  }
}

async function onDelete(row: CampaignSummary) {
  try {
    await store.remove(row.id);
    ElMessage.success("已删除");
  } catch {
    ElMessage.error("删除失败");
  }
}

async function onSaved() {
  await store.fetchAll();
}
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
.error {
  margin-bottom: 16px;
}
.reply-tag {
  margin-right: 4px;
}
.reply-more {
  color: #909399;
  font-size: 12px;
}
</style>
