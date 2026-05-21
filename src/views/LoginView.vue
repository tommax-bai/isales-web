<template>
  <div class="login-root">
    <div class="login-card">
      <div class="login-brand">
        <span class="login-brand__logo" aria-hidden="true">
          <PhoneCall :size="18" />
        </span>
      </div>
      <h1 class="login-title">{{ tenantName }}</h1>
      <p class="login-subtitle">客户外呼系统</p>
      <el-form
        ref="formRef"
        :model="form"
        :rules="rules"
        label-width="56px"
        @submit.prevent="onSubmit"
      >
        <el-form-item label="账号" prop="username">
          <el-input v-model="form.username" autocomplete="username" autofocus />
        </el-form-item>
        <el-form-item label="密码" prop="password">
          <el-input
            v-model="form.password"
            type="password"
            autocomplete="current-password"
            show-password
            @keyup.enter="onSubmit"
          />
        </el-form-item>
        <el-form-item>
          <el-button
            type="primary"
            :loading="loading"
            class="login-button"
            @click="onSubmit"
          >
            登录
          </el-button>
        </el-form-item>
      </el-form>
      <p v-if="errorMessage" class="login-error">{{ errorMessage }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { FormInstance, FormRules } from "element-plus";
import { PhoneCall } from "lucide-vue-next";
import { reactive, ref } from "vue";
import { useRoute, useRouter } from "vue-router";

import { useAuthStore } from "@/stores/auth";

const tenantName = import.meta.env.VITE_TENANT_NAME ?? "iSales";
const router = useRouter();
const route = useRoute();
const auth = useAuthStore();

const formRef = ref<FormInstance | null>(null);
const form = reactive({ username: "", password: "" });
const loading = ref(false);
const errorMessage = ref<string | null>(null);

const rules: FormRules = {
  username: [{ required: true, message: "请输入账号", trigger: "blur" }],
  password: [{ required: true, message: "请输入密码", trigger: "blur" }],
};

async function onSubmit() {
  if (!formRef.value) return;
  const valid = await formRef.value.validate().catch(() => false);
  if (!valid) return;

  loading.value = true;
  errorMessage.value = null;
  try {
    await auth.login({ username: form.username, password: form.password });
    const redirect = (route.query.redirect as string | undefined) ?? "/leads";
    await router.push(redirect);
  } catch (err: unknown) {
    errorMessage.value = extractError(err);
  } finally {
    loading.value = false;
  }
}

function extractError(err: unknown): string {
  if (typeof err === "object" && err !== null && "response" in err) {
    const resp = (err as { response?: { status?: number; data?: { detail?: string } } })
      .response;
    if (resp?.status === 401) return "账号或密码错误";
    if (resp?.data?.detail) return resp.data.detail;
  }
  return "登录失败，请稍后重试";
}
</script>

<style scoped>
.login-root {
  height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background:
    radial-gradient(circle at 20% 20%, rgba(125, 92, 207, 0.18), transparent 60%),
    radial-gradient(circle at 80% 80%, rgba(48, 71, 165, 0.18), transparent 55%),
    var(--isales-primary);
  padding: var(--isales-space-4);
}
.login-card {
  background: var(--isales-card);
  padding: var(--isales-space-8) var(--isales-space-10);
  border-radius: var(--isales-radius-lg);
  box-shadow: var(--isales-shadow-lg);
  width: 100%;
  max-width: 380px;
}
.login-brand {
  display: flex;
  justify-content: center;
  margin-bottom: var(--isales-space-4);
}
.login-brand__logo {
  width: 40px;
  height: 40px;
  border-radius: var(--isales-radius-md);
  background: var(--isales-primary);
  color: var(--isales-primary-foreground);
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
.login-title {
  font-size: var(--isales-font-size-title-1);
  font-weight: var(--isales-font-weight-semibold);
  letter-spacing: var(--isales-letter-spacing-tight);
  text-align: center;
  line-height: var(--isales-line-height-tight);
}
.login-subtitle {
  margin: 4px 0 var(--isales-space-6);
  color: var(--isales-muted-foreground);
  font-size: var(--isales-font-size-sm);
  text-align: center;
}
.login-button {
  width: 100%;
}
.login-error {
  margin-top: var(--isales-space-3);
  color: var(--isales-destructive);
  font-size: var(--isales-font-size-sm);
  text-align: center;
}
</style>
