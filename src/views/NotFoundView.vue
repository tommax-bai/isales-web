<template>
  <div class="not-found">
    <h1>404</h1>
    <p class="message">页面找不到</p>
    <router-link :to="{ name: 'dashboard' }">
      <el-button type="primary">返回首页</el-button>
    </router-link>
  </div>
</template>

<script setup lang="ts"></script>

<style scoped>
.not-found {
  height: calc(100vh - 60px);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
}
.not-found h1 {
  font-size: 96px;
  color: #c0c4cc;
  margin: 0;
  line-height: 1;
}
.message {
  color: #909399;
  margin: 0;
}
</style>
