<template>
  <header class="page-header">
    <div v-if="$slots.icon || icon" class="page-header__icon" :style="iconStyle">
      <slot name="icon">
        <component v-if="icon" :is="icon" :size="22" />
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
  gap: 14px;
  margin-bottom: 24px;
}
.page-header__icon {
  width: 48px;
  height: 48px;
  border-radius: var(--isales-radius-lg);
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
  margin: 0;
  font-size: 22px;
  font-weight: var(--isales-font-weight-bold);
}
.page-header__sub {
  margin: 4px 0 0;
  font-size: 14px;
  color: var(--isales-muted-foreground);
}
.page-header__actions {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}
</style>
