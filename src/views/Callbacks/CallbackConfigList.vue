<template>
  <el-card>
    <template #header>
      <div class="header">
        <span class="title">回调配置</span>
      </div>
    </template>

    <el-alert
      :closable="false"
      type="warning"
      show-icon
      class="explain"
    >
      <template #title>v1.0 暂未实装 — 待开 OpenSpec change 补后端</template>
      <template #default>
        webhook-callback capability 的 spec 已写（HMAC-SHA256 签名 +
        JsonLogic trigger + Jinja2 payload + 指数退避重试），但 isales-api
        还没有 callback_configs / callback_logs 的 admin HTTP CRUD router
        (main.py 无 include)。前端这三个 view (CallbackConfigList /
        CallbackConfigEdit / CallbackLogList) 不再发请求；后端 CRUD 落地
        前请用直连 PG 改 callback_config 表 + 重启 worker 的方式管理 webhook。
        实装动作建议走 `/opsx:propose impl-callback-admin-api`。
      </template>
    </el-alert>
  </el-card>
</template>

<script setup lang="ts">
// banner-only view，v1.0 后端 admin CRUD 未实装。
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
