<!--
  多行文本框：默认折叠到 collapsedRows 行；获得焦点（点击/Tab）后高度扩张到
  恰好容纳全部已填内容，封顶 maxHeight(px)，超出再内部滚动；失焦回到折叠态。

  自己用原生 textarea 的 scrollHeight 管理高度，不走 el-input 的 autosize——
  autosize=false 时 el-input 不会清掉它算出来的 inline height（失焦无法收回），
  toggle autosize 反而收不回去，所以这里直接操作内层 textarea 的 style.height。
-->
<template>
  <el-input
    ref="inputRef"
    :model-value="modelValue"
    type="textarea"
    :rows="collapsedRows"
    resize="none"
    class="expanding-textarea"
    v-bind="$attrs"
    @update:model-value="onInput"
    @focus="onFocus"
    @blur="onBlur"
  />
</template>

<script setup lang="ts">
import { nextTick, ref } from "vue";

const props = withDefaults(
  defineProps<{
    modelValue: string | null | undefined;
    collapsedRows?: number;
    maxHeight?: number;
  }>(),
  { collapsedRows: 3, maxHeight: 800 },
);

const emit = defineEmits<{
  (e: "update:modelValue", v: string): void;
}>();

defineOptions({ inheritAttrs: false });

const inputRef = ref<{ $el: HTMLElement } | null>(null);
const expanded = ref(false);
// 折叠态（collapsedRows 行）的像素高度，作为展开后的下限——空内容聚焦时
// 不至于缩到 1 行。每次聚焦时实测一次。
const floorPx = ref(0);

function innerTextarea(): HTMLTextAreaElement | null {
  return inputRef.value?.$el?.querySelector("textarea") ?? null;
}

function grow(): void {
  const ta = innerTextarea();
  if (!ta) return;
  ta.style.height = "auto";
  const target = Math.min(Math.max(ta.scrollHeight, floorPx.value), props.maxHeight);
  ta.style.height = `${target}px`;
  ta.style.overflowY = ta.scrollHeight > props.maxHeight ? "auto" : "hidden";
}

function onInput(v: string): void {
  emit("update:modelValue", v);
  if (expanded.value) void nextTick(grow);
}

async function onFocus(): Promise<void> {
  const ta = innerTextarea();
  if (ta) floorPx.value = ta.clientHeight; // 展开前的折叠行高
  expanded.value = true;
  await nextTick();
  grow();
}

function onBlur(): void {
  expanded.value = false;
  const ta = innerTextarea();
  if (ta) {
    // 清掉 inline 高度 → 回到 rows 属性决定的折叠高度。
    ta.style.height = "";
    ta.style.overflowY = "";
  }
}
</script>
