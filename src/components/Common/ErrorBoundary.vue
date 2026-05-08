<template>
  <div v-if="error">
    <el-result
      icon="error"
      :title="error.name || '页面异常'"
      :sub-title="error.message"
    >
      <template #extra>
        <el-button type="primary" @click="onReset">返回首页</el-button>
      </template>
    </el-result>
  </div>
  <slot v-else />
</template>

<script setup lang="ts">
import { onErrorCaptured, ref } from "vue";
import { useRouter } from "vue-router";

const router = useRouter();
const error = ref<Error | null>(null);

onErrorCaptured((err) => {
  // Surface unhandled component errors to the user instead of leaving a
  // blank page. axios network errors are still caught by the response
  // interceptor — this catches render / setup-time exceptions.
  error.value = err as Error;
  return false;
});

function onReset() {
  error.value = null;
  void router.push({ name: "dashboard" });
}
</script>
