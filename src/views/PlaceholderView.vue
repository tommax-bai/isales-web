<template>
  <el-card>
    <template #header>
      <div class="card-header">
        <span>{{ title }}</span>
        <el-tag type="warning">即将上线</el-tag>
      </div>
    </template>
    <p>该页面会在后续 PR 中实施。当前路由：{{ route.path }}</p>
  </el-card>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useRoute } from "vue-router";

const route = useRoute();
const title = computed(() => (route.meta.title as string | undefined) ?? "页面");
</script>

<style scoped>
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
</style>
