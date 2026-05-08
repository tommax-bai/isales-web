<template>
  <el-card class="stat-card">
    <div class="label">{{ label }}</div>
    <div class="value">
      {{ value }}<span v-if="suffix" class="suffix">{{ suffix }}</span>
    </div>
  </el-card>
</template>

<script setup lang="ts">
defineProps<{
  label: string;
  value: number | string;
  suffix?: string;
}>();
</script>

<style scoped>
.stat-card .label {
  color: #909399;
  font-size: 13px;
  margin-bottom: 8px;
}
.value {
  font-size: 28px;
  font-weight: 600;
  color: #303133;
}
.suffix {
  font-size: 14px;
  color: #909399;
  margin-left: 4px;
}
</style>
