<template>
  <el-dialog
    :model-value="modelValue"
    title="CSV 导入线索"
    width="480px"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <el-form :model="form" label-width="120px">
      <el-form-item label="任务 ID">
        <el-input-number v-model="form.campaign_id" :min="1" />
      </el-form-item>
      <el-form-item label="CSV 文件">
        <el-upload
          ref="uploadRef"
          :auto-upload="false"
          :limit="1"
          accept=".csv"
          :on-change="onFileChange"
        >
          <el-button>选择文件</el-button>
          <template #tip>
            <div class="hint">CSV 列名：phone（必填）/ name / source / custom_data</div>
          </template>
        </el-upload>
      </el-form-item>
      <el-alert
        v-if="summary"
        :title="`成功 ${summary.imported}，跳过 ${summary.skipped}，错误 ${summary.errors.length}`"
        type="success"
        :closable="false"
      />
    </el-form>
    <template #footer>
      <el-button @click="emit('update:modelValue', false)">关闭</el-button>
      <el-button
        type="primary"
        :disabled="!form.file || !form.campaign_id"
        :loading="loading"
        @click="onSubmit"
      >
        开始导入
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ElMessage, type UploadFile } from "element-plus";
import { reactive, ref } from "vue";

import { leadsApi } from "@/api/leads";
import type { LeadImportSummary } from "@/types/lead";

const props = defineProps<{ modelValue: boolean }>();
const emit = defineEmits<{
  (e: "update:modelValue", value: boolean): void;
  (e: "imported", summary: LeadImportSummary): void;
}>();

const form = reactive({ campaign_id: 1, file: null as File | null });
const summary = ref<LeadImportSummary | null>(null);
const loading = ref(false);

void props;

function onFileChange(uploadFile: UploadFile) {
  form.file = (uploadFile.raw as File | undefined) ?? null;
}

async function onSubmit() {
  if (!form.file) return;
  loading.value = true;
  summary.value = null;
  try {
    summary.value = await leadsApi.importCsv(form.campaign_id, form.file);
    ElMessage.success("导入完成");
    emit("imported", summary.value);
  } catch {
    ElMessage.error("导入失败，请检查 CSV 格式");
  } finally {
    loading.value = false;
  }
}
</script>

<style scoped>
.hint {
  font-size: 12px;
  color: #909399;
}
</style>
