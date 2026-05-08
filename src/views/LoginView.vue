<template>
  <div class="login-root">
    <div class="login-card">
      <h1 class="login-title">{{ tenantName }}</h1>
      <p class="login-subtitle">PR #2 接入 isales-api /auth/login</p>
    </div>
  </div>
</template>

<script setup lang="ts">
const tenantName = import.meta.env.VITE_TENANT_NAME ?? "iSales";
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
  text-align: center;
}
.login-title {
  margin: 0;
  font-size: 22px;
  color: #333;
}
.login-subtitle {
  margin-top: 12px;
  color: #888;
  font-size: 14px;
}
</style>
