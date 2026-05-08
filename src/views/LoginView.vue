<template>
  <div class="login-root">
    <div class="login-card">
      <h1 class="login-title">{{ tenantName }}</h1>
      <p class="login-subtitle">请登录</p>
      <el-form
        ref="formRef"
        :model="form"
        :rules="rules"
        label-width="64px"
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
    const redirect = (route.query.redirect as string | undefined) ?? "/dashboard";
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
  background: linear-gradient(135deg, #1890ff 0%, #001529 100%);
}
.login-card {
  background: #fff;
  padding: 48px 64px;
  border-radius: 8px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
  min-width: 360px;
}
.login-title {
  margin: 0 0 4px 0;
  font-size: 22px;
  color: #333;
  text-align: center;
}
.login-subtitle {
  margin: 0 0 24px 0;
  color: #888;
  font-size: 13px;
  text-align: center;
}
.login-button {
  width: 100%;
}
.login-error {
  margin: 12px 0 0 0;
  color: #f56c6c;
  font-size: 13px;
  text-align: center;
}
</style>
