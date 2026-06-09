<template>
  <div>
    <div class="header">
      <span class="title">回调配置</span>
      <el-button type="primary" size="small" @click="onAddNew">
        + 新建回调
      </el-button>
    </div>

    <p class="tab-intro">
      <Info :size="13" class="tab-intro__icon" />
      <span>回调的 trigger / payload_template 等细节在独立的"回调编辑"页填写。这里只列出已关联到本任务的回调。</span>
    </p>

    <el-table :data="rows" stripe empty-text="暂无回调">
      <el-table-column prop="id" label="ID" width="80" />
      <el-table-column prop="name" label="名称" />
      <el-table-column prop="method" label="method" width="100" />
      <el-table-column prop="url" label="URL" />
      <el-table-column label="启用" width="100">
        <template #default="{ row }">
          <el-tag :type="row.enabled ? 'success' : 'info'" size="small">
            {{ row.enabled ? "是" : "否" }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="120" fixed="right">
        <template #default="{ row }">
          <el-button link type="primary" @click="onEditExisting(row)">
            编辑
          </el-button>
        </template>
      </el-table-column>
    </el-table>
  </div>
</template>

<script setup lang="ts">
import { Info } from "lucide-vue-next";
import { computed } from "vue";
import { useRouter } from "vue-router";

const props = defineProps<{
  campaignId: number;
  modelValue: unknown[];
}>();

interface CallbackRow {
  id: number;
  name: string;
  method: string;
  url: string;
  enabled: boolean;
}

const router = useRouter();

const rows = computed<CallbackRow[]>(
  () => (props.modelValue ?? []) as CallbackRow[],
);

function onAddNew(): void {
  void router.push({
    name: "callback-config-edit",
    params: { id: "new" },
    query: { campaign_id: String(props.campaignId) },
  });
}

function onEditExisting(row: CallbackRow): void {
  void router.push({ name: "callback-config-edit", params: { id: row.id } });
}
</script>

<style scoped>
.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}
.title {
  font-size: 14px;
  font-weight: 600;
}
/* 配置说明：无背景、小号灰字、小号 info 图标。 */
.tab-intro {
  display: flex;
  align-items: flex-start;
  gap: 6px;
  margin-bottom: 12px;
  font-size: 12px;
  line-height: 1.6;
  color: var(--isales-muted-foreground);
}
.tab-intro__icon {
  flex-shrink: 0;
  margin-top: 2px;
  color: var(--isales-status-blue-700);
}
</style>
