<template>
  <el-dialog
    :model-value="modelValue"
    title="创建预约"
    width="520px"
    @update:model-value="(v: boolean) => emit('update:modelValue', v)"
    @opened="resetForm"
  >
    <el-form ref="formRef" :model="form" :rules="rules" label-width="100px">
      <el-form-item label="预约时间" prop="appointment_time">
        <el-date-picker
          v-model="form.appointment_time"
          type="datetime"
          placeholder="选择到店日期 / 时间"
          format="YYYY-MM-DD HH:mm"
          value-format="YYYY-MM-DDTHH:mm:ssZ"
        />
      </el-form-item>
      <el-form-item label="门店地址" prop="store_address">
        <el-input v-model="form.store_address" placeholder="完整地址" />
      </el-form-item>
      <el-form-item label="到店指引" prop="directions">
        <el-input
          v-model="form.directions"
          type="textarea"
          :rows="2"
          placeholder="地铁线路 / 停车信息 / 楼层 …"
        />
      </el-form-item>
      <el-form-item label="备注">
        <el-input
          v-model="form.notes"
          type="textarea"
          :rows="2"
          placeholder="客户偏好、行程信息（可选）"
        />
      </el-form-item>
    </el-form>

    <template #footer>
      <el-button @click="emit('update:modelValue', false)">取消</el-button>
      <el-button type="primary" :loading="submitting" @click="onSubmit">
        创建预约
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import type { FormInstance, FormRules } from "element-plus";
import { ElMessage } from "element-plus";
import { reactive, ref } from "vue";

import { appointmentsApi } from "@/api/appointments";

const props = defineProps<{
  modelValue: boolean;
  leadId: number | null;
  callId?: number | null;
}>();

const emit = defineEmits<{
  (e: "update:modelValue", v: boolean): void;
  (e: "created"): void;
}>();

const formRef = ref<FormInstance>();
const submitting = ref(false);

const form = reactive({
  appointment_time: "",
  store_address: "",
  directions: "",
  notes: "",
});

const rules: FormRules = {
  appointment_time: [{ required: true, message: "选择预约时间", trigger: "change" }],
  store_address: [{ required: true, message: "填写门店地址", trigger: "blur" }],
  directions: [{ required: true, message: "填写到店指引", trigger: "blur" }],
};

function resetForm() {
  form.appointment_time = "";
  form.store_address = "";
  form.directions = "";
  form.notes = "";
  formRef.value?.clearValidate();
}

async function onSubmit() {
  if (!props.leadId) {
    ElMessage.error("缺少 lead_id");
    return;
  }
  if (!formRef.value) return;
  await formRef.value.validate(async (valid) => {
    if (!valid) return;
    submitting.value = true;
    try {
      await appointmentsApi.create({
        lead_id: props.leadId!,
        appointment_time: form.appointment_time,
        store_address: form.store_address,
        directions: form.directions,
        notes: form.notes || null,
        created_from_call_id: props.callId ?? null,
      });
      ElMessage.success("预约创建成功");
      emit("created");
      emit("update:modelValue", false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "创建失败";
      ElMessage.error(msg);
    } finally {
      submitting.value = false;
    }
  });
}
</script>
