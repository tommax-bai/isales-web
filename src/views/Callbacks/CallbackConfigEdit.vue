<template>
  <el-card>
    <template #header>
      <div class="header">
        <span class="title">编辑回调</span>
        <el-button @click="onBack">返回列表</el-button>
      </div>
    </template>

    <el-alert
      :closable="false"
      type="warning"
      show-icon
      class="explain"
    >
      <template #title>v1.0 暂未实装</template>
      <template #default>
        编辑器原本对接 callback_configs admin CRUD，但后端 router 还没建
        (见 webhook-callback spec)。实装走 `/opsx:propose impl-callback-admin-api`。
      </template>
    </el-alert>
  </el-card>
</template>

<script setup lang="ts">
import { useRouter } from "vue-router";

const router = useRouter();
function onBack() {
  // 回上一页（多由 campaign 回调 tab 进入）；独立的回调配置列表页在 one-role IA §3 删除。
  router.back();
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
.explain {
  margin-top: 8px;
}
</style>
