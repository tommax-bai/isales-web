<template>
  <el-card>
    <template #header>
      <div class="header">
        <span class="title">SIM 卡管理</span>
      </div>
    </template>

    <el-alert
      :closable="false"
      type="warning"
      show-icon
      class="explain"
    >
      <template #title>v1.0 暂未对接 — SIM 卡在 edge 自治</template>
      <template #default>
        cloud-edge 架构下 SIM 卡由 edge (isales-telephony) 在客户 PC 上
        通过 AT (`AT+CCID` / `AT+CIMI` / 运营商余额查询) 自检 + 持有，
        cloud-side 暂不暴露 SIM list 端点 (后端无 GET /api/sim-cards)。
        本机 SIM 自检请在客户 PC 上跑 isales-telephony 的 list-sims
        脚本。当多租户 edge_device 表 (C2 范围) 落地时本视图重启。
      </template>
    </el-alert>
  </el-card>
</template>

<script setup lang="ts">
// 本 view 仅展示说明 banner，不发任何请求。等 cloud-edge 多租户 edge_device
// 表 (arch-cloud-edge-split 后续 change C2 范围) 落地，后端补 /api/sim-cards
// 端点时重启数据对接。
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
