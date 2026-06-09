<template>
  <section class="filler">
    <header class="filler__head">
      <Settings :size="16" class="filler__icon-plain" />
      <div class="filler__title-block">
        <h3 class="filler__title">垫词</h3>
        <p class="filler__desc">
          客户语音空档期播放的过渡语料。本场景下配多句即可，触发时随机播一句、同一通电话不重复。
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
      </el-form>
      <p class="filler__save-note">
        开关与触发延迟随页面底部「保存」生效；下面的垫词改完即时保存。
      </p>
    </div>

    <div class="fset">
      <p v-if="phrases.length === 0" class="filler__empty">
        暂无垫词——点击「添加垫词」开始。
      </p>

      <div v-for="ph in phrases" :key="ph.key" class="phrase">
        <el-input v-model="ph.text" placeholder="一句垫词，如「好的，我看一下」" />
        <el-button
          size="small"
          type="primary"
          :loading="ph.saving"
          :disabled="!campaignId"
          @click="savePhrase(ph)"
        >
          <Save :size="13" />
        </el-button>
        <el-button size="small" plain type="danger" @click="removePhrase(ph)">
          <Trash2 :size="13" />
        </el-button>
      </div>

      <el-button size="small" text :disabled="!campaignId" @click="addPhrase">
        <Plus :size="13" style="margin-right: 4px" />
        添加垫词
      </el-button>
    </div>
  </section>
</template>

<script setup lang="ts">
import { ElMessage } from "element-plus";
import { Plus, Save, Settings, Trash2 } from "lucide-vue-next";
import { computed, onMounted, ref, watch } from "vue";

import { fillersApi } from "@/api/fillers";
import type { CampaignBase } from "@/types/campaign";

// `form` (= modelValue) 承载 filler_enabled / filler_delay_ms（CampaignBase 字段，
// 随页面底部「保存」提交）；垫词本身按 campaign-id 即时保存，两套保存语义并存。
// 经 computed 间接持有 modelValue，与各 Tab 一致——直接 v-model prop 会触发
// vue/no-mutating-props。
const props = defineProps<{ campaignId: number | null; modelValue: CampaignBase }>();
const emit = defineEmits<{
  (e: "update:modelValue", v: CampaignBase): void;
}>();
const form = computed({
  get: () => props.modelValue,
  set: (v) => emit("update:modelValue", v),
});

interface PhraseRow {
  key: string;
  id: number | null;
  text: string;
  saving: boolean;
}

const phrases = ref<PhraseRow[]>([]);

function rid(): string {
  return `f-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}

async function load() {
  phrases.value = [];
  if (!props.campaignId) return;
  const rows = await fillersApi.list(props.campaignId);
  phrases.value = rows.map((p) => ({
    key: rid(),
    id: p.id,
    text: p.phrase,
    saving: false,
  }));
}

function addPhrase() {
  phrases.value.push({ key: rid(), id: null, text: "", saving: false });
}

async function savePhrase(ph: PhraseRow) {
  if (!props.campaignId) return;
  if (!ph.text.trim()) {
    ElMessage.warning("垫词内容不能为空");
    return;
  }
  ph.saving = true;
  try {
    if (ph.id == null) {
      const created = await fillersApi.create({
        campaign_id: props.campaignId,
        phrase: ph.text,
      });
      ph.id = created.id;
    } else {
      await fillersApi.update(ph.id, { phrase: ph.text });
    }
    ElMessage.success("已保存");
  } catch (err: unknown) {
    ElMessage.error(err instanceof Error ? err.message : "保存失败");
  } finally {
    ph.saving = false;
  }
}

async function removePhrase(ph: PhraseRow) {
  if (ph.id != null) {
    try {
      await fillersApi.remove(ph.id);
    } catch (err: unknown) {
      ElMessage.error(err instanceof Error ? err.message : "删除失败");
      return;
    }
  }
  phrases.value = phrases.value.filter((p) => p.key !== ph.key);
}

watch(() => props.campaignId, () => void load());
onMounted(() => void load());
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
  gap: var(--isales-space-3);
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
.filler__save-note {
  margin-top: var(--isales-space-1);
  font-size: var(--isales-font-size-xs);
  color: var(--isales-muted-foreground);
}
.filler__empty {
  margin: var(--isales-space-2) 0;
  font-size: var(--isales-font-size-sm);
  color: var(--isales-muted-foreground);
  text-align: center;
  padding: var(--isales-space-4);
  border: 1px dashed var(--isales-border);
  border-radius: var(--isales-radius-md);
}
.fset {
  display: flex;
  flex-direction: column;
  gap: var(--isales-space-2);
  padding: var(--isales-space-3);
  background: var(--isales-muted);
  border-radius: var(--isales-radius-md);
}
.phrase {
  display: flex;
  align-items: center;
  gap: var(--isales-space-2);
}
</style>
