<template>
  <button
    type="button"
    class="icon-btn"
    :class="{ 'icon-btn--danger': variant === 'danger' }"
    :title="label"
    :aria-label="label"
  >
    <slot />
  </button>
</template>

<script setup lang="ts">
/**
 * IconButton — 40×40 图标小方钮。
 *
 * 用于卡片操作区的次要操作（编辑 / 删除 / 取消 / 查看详情等）。
 * 主操作应使用主色文字按钮。见 STYLE_GUIDE.md § 组件模式 / 操作区。
 *
 * `@click` 经单根 `<button>` 自动透传，无需显式 emit。
 */
withDefaults(
  defineProps<{
    /** 同时用作 title 与 aria-label，必填以保证可访问性 */
    label: string;
    variant?: "default" | "danger";
  }>(),
  { variant: "default" },
);
</script>

<style scoped>
.icon-btn {
  width: 40px;
  height: 40px;
  flex-shrink: 0;
  border: 1px solid var(--isales-border);
  border-radius: var(--isales-radius-md);
  background: var(--isales-card);
  color: var(--isales-muted-foreground);
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition:
    background 0.15s,
    color 0.15s,
    border-color 0.15s;
}
.icon-btn:hover {
  background: var(--isales-muted);
  color: var(--isales-foreground);
}
.icon-btn--danger:hover {
  background: var(--isales-status-red-100);
  color: var(--isales-status-red-800);
  border-color: var(--isales-status-red-100);
}
</style>
