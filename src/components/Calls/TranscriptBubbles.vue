<template>
  <div class="bubbles" :class="{ 'bubbles--scroll': maxHeight }" :style="containerStyle">
    <p v-if="bubbles.length === 0" class="bubbles__empty">
      暂无对话内容 — transcript 仍为空。
    </p>
    <div
      v-for="(b, i) in bubbles"
      :key="i"
      class="bubble-row"
      :class="b.role === 'ai' ? 'bubble-row--ai' : 'bubble-row--customer'"
    >
      <span class="bubble-role">{{ b.role === "ai" ? "AI" : "客户" }}</span>
      <div class="bubble" :class="`bubble--${b.role}`">
        {{ b.text }}
      </div>
      <span class="bubble-ts">{{ formatTimestamp(b.ts) }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";

import { useTranscriptAdapter } from "@/composables/useTranscriptAdapter";

const props = withDefaults(
  defineProps<{
    transcript: unknown[];
    maxHeight?: string;
  }>(),
  { maxHeight: "" },
);

const { toBubbles, formatTimestamp } = useTranscriptAdapter();

const bubbles = computed(() => toBubbles(props.transcript));

const containerStyle = computed(() =>
  props.maxHeight ? { maxHeight: props.maxHeight } : {},
);
</script>

<style scoped>
.bubbles {
  display: flex;
  flex-direction: column;
  gap: var(--isales-space-2);
  padding: var(--isales-space-3);
  background: var(--isales-muted);
  border-radius: var(--isales-radius-md);
}
.bubbles--scroll {
  overflow-y: auto;
}
.bubbles__empty {
  margin: var(--isales-space-2) 0;
  text-align: center;
  color: var(--isales-muted-foreground);
  font-size: var(--isales-font-size-sm);
}
.bubble-row {
  display: flex;
  align-items: flex-end;
  gap: var(--isales-space-2);
}
.bubble-row--ai {
  justify-content: flex-start;
}
.bubble-row--customer {
  justify-content: flex-end;
  flex-direction: row-reverse;
}
.bubble-role {
  font-size: var(--isales-font-size-2xs);
  color: var(--isales-muted-foreground);
  align-self: flex-start;
  margin-top: 2px;
  letter-spacing: var(--isales-letter-spacing-wide);
}
.bubble {
  max-width: 70%;
  padding: var(--isales-space-2) var(--isales-space-3);
  border-radius: var(--isales-radius-md);
  font-size: var(--isales-font-size-sm);
  line-height: var(--isales-line-height-normal);
  word-break: break-word;
  white-space: pre-wrap;
}
.bubble--ai {
  background: var(--isales-bubble-ai-bg);
  color: var(--isales-bubble-ai-fg);
  border-top-left-radius: 4px;
}
.bubble--customer {
  background: var(--isales-bubble-customer-bg);
  color: var(--isales-bubble-customer-fg);
  border-top-right-radius: 4px;
}
.bubble-ts {
  font-size: var(--isales-font-size-2xs);
  color: var(--isales-muted-foreground);
  flex-shrink: 0;
  font-variant-numeric: tabular-nums;
}
</style>
