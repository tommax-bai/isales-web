<template>
  <div class="voice-preview">
    <el-input
      v-model="text"
      placeholder="试听文本"
      size="small"
      class="text"
    />
    <el-button
      size="small"
      type="primary"
      :loading="busy"
      :disabled="!text"
      @click="onPlay"
    >
      试听
    </el-button>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";

import { voiceApi } from "@/api/voice";

const props = defineProps<{
  voiceId: number;
}>();

const text = ref("您好，欢迎致电。");
const busy = ref(false);

// engine TTS produces 8 kHz mono 16-bit little-endian PCM (per ai-pipeline
// spec). Browsers don't decode raw PCM via decodeAudioData — we hand-build
// an AudioBuffer instead, which works on every evergreen browser.
async function onPlay(): Promise<void> {
  if (busy.value) return;
  busy.value = true;
  try {
    const buf = await voiceApi.preview(props.voiceId, text.value);
    await playPcm16(buf);
  } catch {
    // Surface failures via console only; the parent decides how loud to
    // be (toast / banner).
    console.warn("voice preview failed");
  } finally {
    busy.value = false;
  }
}

async function playPcm16(buf: ArrayBuffer): Promise<void> {
  const SAMPLE_RATE = 8000;
  const ctx = new AudioContext({ sampleRate: SAMPLE_RATE });
  const view = new DataView(buf);
  const sampleCount = Math.floor(buf.byteLength / 2);
  const audioBuffer = ctx.createBuffer(1, sampleCount, SAMPLE_RATE);
  const channel = audioBuffer.getChannelData(0);
  for (let i = 0; i < sampleCount; i++) {
    const s = view.getInt16(i * 2, true); // little-endian
    channel[i] = s / 0x8000;
  }
  const src = ctx.createBufferSource();
  src.buffer = audioBuffer;
  src.connect(ctx.destination);
  src.start();
  // Resolve when playback completes so the busy spinner stops at the
  // right time.
  await new Promise<void>((resolve) => {
    src.onended = () => resolve();
  });
  await ctx.close();
}

defineExpose({ playPcm16 });
</script>

<style scoped>
.voice-preview {
  display: flex;
  align-items: center;
  gap: 8px;
}
.text {
  width: 200px;
}
</style>
