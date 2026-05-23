<template>
  <el-button
    size="small"
    type="primary"
    :loading="busy"
    @click="onPlay"
  >
    {{ busy ? "播放中..." : "播放样本" }}
  </el-button>
</template>

<script setup lang="ts">
import { onUnmounted, ref } from "vue";

import { voiceApi } from "@/api/voice";

const props = defineProps<{
  voiceId: number;
}>();

const busy = ref(false);
let currentUrl: string | null = null;

// v1.0 后端只暴露预录样本 (GET /voice-models/{id}/sample)，没有动态 TTS
// 合成端点。这里走 ArrayBuffer + Blob URL 给浏览器自己 decode (sample
// 文件 codec 由入库决定，可能 mp3 / wav，不假设)。
async function onPlay(): Promise<void> {
  if (busy.value) return;
  busy.value = true;
  try {
    const buf = await voiceApi.sample(props.voiceId);
    if (currentUrl !== null) URL.revokeObjectURL(currentUrl);
    currentUrl = URL.createObjectURL(new Blob([buf]));
    const audio = new Audio(currentUrl);
    await new Promise<void>((resolve, reject) => {
      audio.onended = () => resolve();
      audio.onerror = () => reject(new Error("audio decode failed"));
      void audio.play();
    });
  } catch {
    console.warn("voice sample failed");
  } finally {
    busy.value = false;
  }
}

onUnmounted(() => {
  if (currentUrl !== null) URL.revokeObjectURL(currentUrl);
});
</script>

<style scoped></style>
