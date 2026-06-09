<template>
  <section class="filler">
    <header class="filler__head">
      <Settings :size="16" class="filler__icon-plain" />
      <div class="filler__title-block">
        <h3 class="filler__title">垫词</h3>
        <p class="filler__desc">
          <Info :size="13" class="tab-intro__icon" />
          <span>客户语音空档期播放的过渡语料。本场景下配多句即可，触发时随机播一句、同一通电话不重复。</span>
        </p>
      </div>
    </header>

    <div class="filler__config">
      <el-form label-width="96px" label-position="left">
        <el-form-item label="启用垫词">
          <el-switch v-model="form.filler_enabled" />
          <div class="filler__hint">
            streaming 主链路首音频 ~500ms，filler 仅在用慢模型时建议启用。默认关闭。
          </div>
        </el-form-item>
        <el-form-item v-if="form.filler_enabled" label="触发延迟 (ms)">
          <el-input-number
            v-model="form.filler_delay_ms"
            :min="0"
            :step="100"
            placeholder="留空默认 600ms"
          />
          <div class="filler__hint">
            首音频超过此时长还没出，才播一句垫词遮等待；快的轮次不会播。留空使用默认 600ms。
          </div>
        </el-form-item>
        <el-form-item v-if="form.filler_enabled" label="垫词短语">
          <ExpandingTextarea
            v-model="fillerText"
            placeholder="用分号(；)分隔，如「好的我看一下；嗯嗯稍等；让我确认下」"
            @change="commitFiller"
          />
          <div class="filler__hint">
            触发时从这些短语里随机播一句、同一通电话不重复。随页面底部「保存」一起生效。
          </div>
        </el-form-item>
      </el-form>
    </div>
  </section>
</template>

<script setup lang="ts">
import { Info, Settings } from "lucide-vue-next";
import { computed, ref, watch } from "vue";

import type { CampaignBase } from "@/types/campaign";
import ExpandingTextarea from "@/components/Common/ExpandingTextarea.vue";

// `form` (= modelValue) 承载 filler_enabled / filler_delay_ms / filler_phrases
// （都是 CampaignBase 字段），随页面底部「保存」走 campaign PATCH。经 computed
// 间接持有 modelValue，与各 Tab 一致——直接 v-model prop 会触发 vue/no-mutating-props。
const props = defineProps<{ modelValue: CampaignBase }>();
const emit = defineEmits<{
  (e: "update:modelValue", v: CampaignBase): void;
}>();
const form = computed({
  get: () => props.modelValue,
  set: (v) => emit("update:modelValue", v),
});

// 垫词一行分号输入（参照打断白名单）。filler_phrases 是 CampaignBase 的 list[str]。
const fillerText = ref(form.value.filler_phrases.join("；"));
watch(
  () => form.value.filler_phrases,
  (next) => {
    const j = next.join("；");
    if (j !== fillerText.value) fillerText.value = j;
  },
);
// 失焦时才解析（输入中不动 array，否则刚敲的分号被吃掉）。
function commitFiller(): void {
  form.value.filler_phrases = fillerText.value
    .split(/[;；\n]/) // 兼容半角 ; / 全角 ； / 换行
    .map((s) => s.trim())
    .filter(Boolean);
}
</script>

<style scoped>
.filler {
  background: var(--isales-card);
  border: 1px solid var(--isales-border);
  border-left: 4px solid var(--isales-status-yellow-700);
  border-radius: var(--isales-radius);
  padding: var(--isales-space-4);
  display: flex;
  flex-direction: column;
  gap: var(--isales-space-3);
}
.filler__head {
  display: flex;
  align-items: center;
  /* 与 .card__head 同 gap，使标题与 form 卡对齐。 */
  gap: var(--isales-space-2);
}
/* 裸齿轮（无彩色底框），与 form 小节的 <Settings> 一致；左色条仍为黄色。 */
.filler__icon-plain {
  flex-shrink: 0;
}
.filler__title-block {
  flex: 1;
  min-width: 0;
}
.filler__title {
  font-size: var(--isales-font-size-title-3);
  font-weight: var(--isales-font-weight-semibold);
  line-height: var(--isales-line-height-tight);
}
.filler__desc {
  display: flex;
  align-items: flex-start;
  gap: 6px;
  margin-top: 2px;
  font-size: var(--isales-font-size-xs);
  color: var(--isales-muted-foreground);
}
.filler__config {
  padding: var(--isales-space-3);
  background: var(--isales-muted);
  border-radius: var(--isales-radius-md);
}
.filler__hint {
  font-size: 12px;
  color: var(--isales-muted-foreground);
  line-height: 1.6;
}
</style>
