<template>
  <el-skeleton :rows="rows" animated />
</template>

<script setup lang="ts">
withDefaults(defineProps<{ rows?: number }>(), { rows: 6 });
</script>
