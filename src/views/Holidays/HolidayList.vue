<template>
  <section class="holidays">
    <PageHeader title="节假日" :subtitle="`共 ${total ?? items.length} 个节假日`">
      <template #actions>
        <el-button @click="onRefresh">刷新</el-button>
        <el-button type="primary" @click="onNew">
          <Plus :size="15" style="margin-right: 4px" />
          新增节假日
        </el-button>
      </template>
    </PageHeader>

    <el-table
      v-loading="loading"
      :data="items"
      stripe
      empty-text="暂无节假日"
      class="holidays__table"
    >
      <el-table-column prop="id" label="ID" width="80" />
      <el-table-column prop="date" label="日期" width="160" />
      <el-table-column prop="name" label="名称" />
      <el-table-column prop="region" label="地区" width="120" />
      <el-table-column label="操作" width="100" align="right">
        <template #default="{ row }">
          <el-button link type="danger" @click="onDelete(row)">
            <Trash2 :size="15" style="margin-right: 4px" />
            删除
          </el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-dialog v-model="dialogVisible" title="新增节假日" width="480px">
      <el-form ref="formRef" :model="form" :rules="rules" label-width="80px">
        <el-form-item label="日期" prop="date">
          <el-date-picker
            v-model="form.date"
            type="date"
            value-format="YYYY-MM-DD"
            placeholder="选择日期"
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item label="名称" prop="name">
          <el-input v-model="form.name" placeholder="例如：春节" />
        </el-form-item>
        <el-form-item label="地区" prop="region">
          <el-input v-model="form.region" placeholder="例如：CN" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="creating" @click="onCreate">
          创建
        </el-button>
      </template>
    </el-dialog>
  </section>
</template>

<script setup lang="ts">
import type { FormInstance, FormRules } from "element-plus";
import { ElMessage, ElMessageBox } from "element-plus";
import { Plus, Trash2 } from "lucide-vue-next";
import { onMounted, reactive, ref } from "vue";

import { holidaysApi, type Holiday } from "@/api/holidays";
import PageHeader from "@/components/Common/PageHeader.vue";

const items = ref<Holiday[]>([]);
const total = ref<number | null>(null);
const loading = ref(false);

const dialogVisible = ref(false);
const creating = ref(false);
const formRef = ref<FormInstance>();
const form = reactive({ date: "", name: "", region: "CN" });
const rules: FormRules = {
  date: [{ required: true, message: "选择日期", trigger: "change" }],
  name: [{ required: true, message: "填写名称", trigger: "blur" }],
  region: [{ required: true, message: "填写地区", trigger: "blur" }],
};

async function onRefresh() {
  loading.value = true;
  try {
    const res = await holidaysApi.list({ page_size: 500 });
    items.value = res.items;
    total.value = res.total;
  } catch (err: unknown) {
    ElMessage.error(err instanceof Error ? err.message : "加载节假日失败");
  } finally {
    loading.value = false;
  }
}

function onNew() {
  form.date = "";
  form.name = "";
  form.region = "CN";
  dialogVisible.value = true;
}

async function onCreate() {
  if (!formRef.value) return;
  const valid = await formRef.value.validate().catch(() => false);
  if (!valid) return;
  creating.value = true;
  try {
    await holidaysApi.create({
      date: form.date,
      name: form.name,
      region: form.region,
    });
    ElMessage.success("已新增节假日");
    dialogVisible.value = false;
    await onRefresh();
  } catch (err: unknown) {
    ElMessage.error(err instanceof Error ? err.message : "创建失败");
  } finally {
    creating.value = false;
  }
}

async function onDelete(h: Holiday) {
  try {
    await ElMessageBox.confirm(
      `确定删除节假日「${h.name}」（${h.date}）？`,
      "删除节假日",
      {
        type: "warning",
        confirmButtonText: "删除",
        cancelButtonText: "取消",
        confirmButtonClass: "el-button--danger",
      },
    );
  } catch {
    return; // 用户取消
  }
  try {
    await holidaysApi.remove(h.id);
    ElMessage.success(`已删除「${h.name}」`);
    await onRefresh();
  } catch (err: unknown) {
    ElMessage.error(err instanceof Error ? err.message : "删除失败");
  }
}

onMounted(onRefresh);
</script>

<style scoped>
.holidays {
  display: flex;
  flex-direction: column;
}
.holidays__table {
  background: var(--isales-card);
  border: 1px solid var(--isales-border);
  border-radius: var(--isales-radius-lg);
}
</style>
