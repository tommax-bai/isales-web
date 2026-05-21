<template>
  <header class="page-header">
    <div v-if="$slots.icon || icon" class="page-header__icon" :style="iconStyle">
      <slot name="icon">
        <component v-if="icon" :is="icon" :size="20" />
      </slot>
    </div>
    <div class="page-header__text">
      <h1 class="page-header__title">{{ title }}</h1>
      <p v-if="subtitle" class="page-header__sub">{{ subtitle }}</p>
    </div>
    <div v-if="$slots.actions" class="page-header__actions">
      <slot name="actions" />
    </div>
  </header>
</template>

<script setup lang="ts">
import { computed, type Component } from "vue";

const props = defineProps<{
  title: string;
  subtitle?: string;
  icon?: Component;
  /** Optional color token name (blue / green / purple / red / yellow / gray). */
  iconColor?: "primary" | "blue" | "green" | "purple" | "red" | "yellow" | "gray";
}>();

const iconStyle = computed(() => {
  if (!props.iconColor || props.iconColor === "primary") {
    return {
      background: "var(--isales-primary)",
      color: "var(--isales-primary-foreground)",
    };
  }
  return {
    background: `var(--isales-status-${props.iconColor}-100)`,
    color: `var(--isales-status-${props.iconColor}-800)`,
  };
});
</script>

<style scoped>
.page-header {
  display: flex;
  align-items: center;
  gap: var(--isales-space-3);
  margin-bottom: var(--isales-space-5);
}
.page-header__icon {
  width: 40px;
  height: 40px;
  border-radius: var(--isales-radius-md);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.page-header__text {
  flex: 1;
  min-width: 0;
}
.page-header__title {
  font-size: var(--isales-font-size-title-1);
  font-weight: var(--isales-font-weight-semibold);
  line-height: var(--isales-line-height-tight);
  letter-spacing: var(--isales-letter-spacing-tight);
}
.page-header__sub {
  margin-top: 2px;
  font-size: var(--isales-font-size-sm);
  color: var(--isales-muted-foreground);
  line-height: var(--isales-line-height-snug);
}
.page-header__actions {
  display: inline-flex;
  align-items: center;
  gap: var(--isales-space-2);
}
</style>
