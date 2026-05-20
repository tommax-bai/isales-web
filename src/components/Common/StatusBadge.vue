<template>
  <span class="badge" :style="style">
    <slot />
  </span>
</template>

<script setup lang="ts">
import { computed } from "vue";

/**
 * Renders a status badge with three-tier semantic color from
 * design-tokens.css (--isales-status-{color}-{100|700|800}).
 *
 * Pass `color="blue|yellow|green|purple|gray|red"` — defaults to gray.
 */
const props = withDefaults(
  defineProps<{
    color?: "blue" | "yellow" | "green" | "purple" | "gray" | "red";
  }>(),
  { color: "gray" },
);

const style = computed(() => ({
  background: `var(--isales-status-${props.color}-100)`,
  borderColor: `var(--isales-status-${props.color}-700)`,
  color: `var(--isales-status-${props.color}-800)`,
}));
</script>

<style scoped>
.badge {
  display: inline-flex;
  align-items: center;
  padding: 2px 10px;
  border-radius: 9999px;
  border: 1px solid;
  font-size: 12px;
  font-weight: var(--isales-font-weight-medium);
  line-height: 1.5;
}
</style>
