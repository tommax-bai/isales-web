<template>
  <el-card v-loading="loading">
    <template #header>
      <div class="header">
        <span class="title">{{ isEdit ? "编辑回调" : "新建回调" }}</span>
        <div>
          <el-button @click="onBack">返回列表</el-button>
          <el-button type="primary" :loading="saving" @click="onSave">保存</el-button>
        </div>
      </div>
    </template>

    <el-form
      ref="formRef"
      :model="form"
      :rules="rules"
      label-width="140px"
      class="form"
    >
      <el-form-item label="名称" prop="name">
        <el-input v-model="form.name" placeholder="例如：appointment-webhook" />
      </el-form-item>
      <el-form-item label="任务 ID" prop="campaign_id">
        <el-input-number v-model="form.campaign_id" :min="1" />
      </el-form-item>
      <el-form-item label="URL" prop="url">
        <el-input v-model="form.url" placeholder="https://..." />
      </el-form-item>
      <el-form-item label="HTTP method" prop="method">
        <el-select v-model="form.method" style="width: 160px">
          <el-option label="POST" value="POST" />
          <el-option label="PUT" value="PUT" />
          <el-option label="PATCH" value="PATCH" />
        </el-select>
      </el-form-item>

      <el-form-item label="trigger (JsonLogic)">
        <CodeEditor v-model="triggerText" mode="json" :height="160" />
        <div class="hint">
          按 webhook-callback spec § trigger 字段范围引用：goal_achieved /
          goal_type / extracted.* / lead.* / call.*
        </div>
      </el-form-item>

      <el-form-item label="payload_template (Jinja2)">
        <CodeEditor v-model="form.payload_template" mode="jinja2" :height="200" />
      </el-form-item>

      <el-form-item label="signing_secret">
        <el-input
          v-model="form.signing_secret"
          placeholder="****（编辑时留空表示不修改）"
          show-password
        />
        <el-button v-if="isEdit" class="rotate-btn" @click="onRotate">
          重新生成
        </el-button>
      </el-form-item>

      <el-form-item label="超时(s)">
        <el-input-number v-model="form.timeout_seconds" :min="1" :max="120" />
      </el-form-item>

      <el-form-item label="启用">
        <el-switch v-model="form.enabled" />
      </el-form-item>

      <el-form-item>
        <el-button @click="onValidate">验证 trigger / payload</el-button>
      </el-form-item>

      <el-form-item v-if="validateResult">
        <el-alert
          :type="validateResult.trigger_parses && validateResult.payload_renders ? 'success' : 'warning'"
          :closable="false"
        >
          <div>trigger 解析: {{ validateResult.trigger_parses ? "✓" : "✗" }}</div>
          <div>payload 渲染: {{ validateResult.payload_renders ? "✓" : "✗" }}</div>
          <div v-if="validateResult.render_output">
            <pre class="render-output">{{ validateResult.render_output }}</pre>
          </div>
          <ul v-if="validateResult.errors.length">
            <li v-for="(err, i) in validateResult.errors" :key="i">
              {{ err.field }}: {{ err.message }}
            </li>
          </ul>
        </el-alert>
      </el-form-item>
    </el-form>
  </el-card>
</template>

<script setup lang="ts">
import { ElMessage, ElMessageBox, type FormInstance, type FormRules } from "element-plus";
import { computed, onMounted, reactive, ref } from "vue";
import { useRoute, useRouter } from "vue-router";

import { callbackConfigsApi, type CallbackValidateResult } from "@/api/callbacks";
import CodeEditor from "@/components/Common/CodeEditor.vue";

interface FormState {
  campaign_id: number;
  name: string;
  url: string;
  method: string;
  payload_template: string;
  signing_secret: string;
  timeout_seconds: number;
  enabled: boolean;
  retry_policy: Record<string, unknown>;
}

const route = useRoute();
const router = useRouter();

const id = computed(() => {
  const raw = route.params.id;
  return raw && raw !== "new" ? Number(raw) : null;
});
const isEdit = computed(() => id.value !== null);

const formRef = ref<FormInstance | null>(null);
const loading = ref(false);
const saving = ref(false);

const triggerText = ref('{"==": [{"var": "goal_achieved"}, true]}');
const form = reactive<FormState>({
  campaign_id: 1,
  name: "",
  url: "",
  method: "POST",
  payload_template: '{"call_id": {{ call.id }}, "achieved": {{ goal_achieved }}}',
  signing_secret: "",
  timeout_seconds: 10,
  enabled: true,
  retry_policy: { intervals_seconds: [60, 300, 1800], max_attempts: 3 },
});
const validateResult = ref<CallbackValidateResult | null>(null);

const rules: FormRules = {
  name: [{ required: true, message: "请输入名称", trigger: "blur" }],
  url: [{ required: true, message: "请输入 URL", trigger: "blur" }],
  campaign_id: [{ required: true, message: "请输入任务 ID", trigger: "blur" }],
};

onMounted(async () => {
  if (id.value === null) return;
  loading.value = true;
  try {
    const cfg = await callbackConfigsApi.get(id.value);
    form.campaign_id = cfg.campaign_id;
    form.name = cfg.name;
    form.url = cfg.url;
    form.method = cfg.method;
    form.payload_template = cfg.payload_template;
    form.timeout_seconds = cfg.timeout_seconds ?? 10;
    form.enabled = cfg.enabled;
    form.retry_policy = cfg.retry_policy;
    triggerText.value = JSON.stringify(cfg.trigger, null, 2);
  } catch {
    ElMessage.error("加载失败");
  } finally {
    loading.value = false;
  }
});

function parsedTrigger(): Record<string, unknown> | null {
  try {
    return JSON.parse(triggerText.value);
  } catch {
    return null;
  }
}

async function onSave() {
  const trigger = parsedTrigger();
  if (!trigger) {
    ElMessage.error("trigger 必须是合法 JSON");
    return;
  }
  if (!formRef.value) return;
  const valid = await formRef.value.validate().catch(() => false);
  if (!valid) return;

  saving.value = true;
  const body = {
    campaign_id: form.campaign_id,
    name: form.name,
    url: form.url,
    method: form.method,
    trigger,
    payload_template: form.payload_template,
    retry_policy: form.retry_policy,
    timeout_seconds: form.timeout_seconds,
    enabled: form.enabled,
    // signing_secret: send only if user typed a non-empty value (server
    // keeps existing secret otherwise).
    ...(form.signing_secret ? { signing_secret: form.signing_secret } : {}),
  };
  try {
    if (id.value !== null) {
      await callbackConfigsApi.update(id.value, body);
    } else {
      await callbackConfigsApi.create(body);
    }
    ElMessage.success("已保存");
    onBack();
  } catch {
    ElMessage.error("保存失败");
  } finally {
    saving.value = false;
  }
}

async function onValidate() {
  const trigger = parsedTrigger();
  if (!trigger) {
    validateResult.value = {
      trigger_parses: false,
      payload_renders: false,
      render_output: null,
      errors: [{ field: "trigger", message: "本地 JSON 解析失败" }],
    };
    return;
  }
  try {
    validateResult.value = await callbackConfigsApi.validate({
      trigger,
      payload_template: form.payload_template,
    });
  } catch {
    ElMessage.warning("验证 endpoint 后端未实现 — 本地 trigger JSON 已通过");
    validateResult.value = {
      trigger_parses: true,
      payload_renders: false,
      render_output: null,
      errors: [{ field: "server", message: "/callback-configs/validate 调用失败" }],
    };
  }
}

async function onRotate() {
  if (id.value === null) return;
  try {
    await ElMessageBox.confirm(
      "重新生成将使旧 secret 失效，且新 secret 仅本次返回一次。继续吗？",
      "重新生成 signing_secret",
      { type: "warning" },
    );
  } catch {
    return;
  }
  try {
    const result = await callbackConfigsApi.rotateSecret(id.value);
    void ElMessageBox.alert(result.secret, "新 signing_secret（请立即复制保存）", {
      confirmButtonText: "已保存",
    });
  } catch {
    ElMessage.error("重新生成失败 — 后端未实现 /rotate-secret");
  }
}

function onBack() {
  void router.push({ name: "callback-configs" });
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
.form {
  margin-top: 8px;
}
.hint {
  font-size: 12px;
  color: #909399;
  line-height: 1.6;
}
.rotate-btn {
  margin-left: 8px;
}
.render-output {
  background-color: #f5f7fa;
  padding: 8px;
  border-radius: 4px;
  margin: 8px 0;
  white-space: pre-wrap;
  word-break: break-all;
  font-size: 12px;
}
</style>
