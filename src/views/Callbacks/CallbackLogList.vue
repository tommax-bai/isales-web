<template>
  <el-card>
    <template #header>
      <div class="header">
        <span class="title">回调记录</span>
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
        webhook callback_log 在 PG 里由 worker 写入，但 cloud 没暴露 admin
        list 端点 (后端无 GET /api/callback-logs)。worker 的 webhook 重试
        在 spec § "重试策略" 完整规定，落库行为没变；只是 cloud admin
        list 待开 change 补。临时排错请 `psql -d isales -c "select * from
        callback_log order by created_at desc limit 50;"`。
      </template>
    </el-alert>
  </el-card>
</template>

<script setup lang="ts">
// banner-only view，v1.0 后端 admin list 未实装。
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
