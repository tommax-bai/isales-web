<template>
  <section class="filler">
    <header class="filler__head">
      <span class="filler__icon">
        <Music :size="16" />
      </span>
      <div class="filler__title-block">
        <h3 class="filler__title">垫词</h3>
        <p class="filler__desc">客户语音空档期播放的过渡语料，按组管理。</p>
      </div>
      <el-button size="small" type="primary" :disabled="!campaignId" @click="addSet">
        <Plus :size="14" style="margin-right: 4px" />
        新增垫词组
      </el-button>
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
        开关与触发延迟随页面底部「保存」生效；下面的垫词组改完即时保存。
      </p>
    </div>

    <p v-if="sets.length === 0" class="filler__empty">
      暂无垫词组——点击「新增垫词组」开始。
    </p>

    <article v-for="set in sets" :key="set.key" class="fset">
      <div class="fset__head">
        <el-input
          v-model="set.name"
          placeholder="垫词组名称"
          class="fset__name"
          @change="onRenameSet(set)"
        />
        <el-button size="small" plain type="danger" @click="removeSet(set)">
          <Trash2 :size="14" />
        </el-button>
      </div>

      <div v-for="ph in set.phrases" :key="ph.key" class="phrase">
        <el-input v-model="ph.text" placeholder="一句垫词，如「好的，我看一下」" />
        <el-button
          size="small"
          type="primary"
          :loading="ph.saving"
          @click="savePhrase(set, ph)"
        >
          <Save :size="13" />
        </el-button>
        <el-button size="small" plain type="danger" @click="removePhrase(set, ph)">
          <Trash2 :size="13" />
        </el-button>
      </div>

      <el-button size="small" text @click="addPhrase(set)">
        <Plus :size="13" style="margin-right: 4px" />
        添加垫词
      </el-button>
    </article>
  </section>
</template>

<script setup lang="ts">
import { ElMessage } from "element-plus";
import { Music, Plus, Save, Trash2 } from "lucide-vue-next";
import { computed, onMounted, ref, watch } from "vue";

import { fillersApi } from "@/api/fillers";
import type { CampaignBase } from "@/types/campaign";

// `form` (= modelValue) 承载 filler_enabled / filler_delay_ms（CampaignBase 字段，
// 随页面底部「保存」提交）；垫词组本身按 campaign-id 即时保存，两套保存语义并存。
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
interface SetRow {
  key: string;
  id: number;
  name: string;
  phrases: PhraseRow[];
}

const sets = ref<SetRow[]>([]);

function rid(): string {
  return `f-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}

async function load() {
  sets.value = [];
  if (!props.campaignId) return;
  const fsets = await fillersApi.listSets({ campaign_id: props.campaignId });
  const out: SetRow[] = [];
  for (const fs of fsets) {
    const phrases = await fillersApi.listPhrases(fs.id);
    out.push({
      key: rid(),
      id: fs.id,
      name: fs.name,
      phrases: phrases.map((p) => ({
        key: rid(),
        id: p.id,
        text: p.phrase,
        saving: false,
      })),
    });
  }
  sets.value = out;
}

async function addSet() {
  if (!props.campaignId) return;
  try {
    const fs = await fillersApi.createSet({
      campaign_id: props.campaignId,
      name: "新垫词组",
      sort_order: sets.value.length,
    });
    sets.value.push({ key: rid(), id: fs.id, name: fs.name, phrases: [] });
  } catch (err: unknown) {
    ElMessage.error(err instanceof Error ? err.message : "新增失败");
  }
}

async function onRenameSet(set: SetRow) {
  try {
    await fillersApi.updateSet(set.id, { name: set.name });
  } catch (err: unknown) {
    ElMessage.error(err instanceof Error ? err.message : "重命名失败");
  }
}

async function removeSet(set: SetRow) {
  try {
    await fillersApi.removeSet(set.id);
    sets.value = sets.value.filter((s) => s.key !== set.key);
  } catch (err: unknown) {
    ElMessage.error(err instanceof Error ? err.message : "删除失败");
  }
}

function addPhrase(set: SetRow) {
  set.phrases.push({ key: rid(), id: null, text: "", saving: false });
}

async function savePhrase(set: SetRow, ph: PhraseRow) {
  if (!ph.text.trim()) {
    ElMessage.warning("垫词内容不能为空");
    return;
  }
  ph.saving = true;
  try {
    if (ph.id == null) {
      const created = await fillersApi.createPhrase(set.id, {
        filler_set_id: set.id,
        phrase: ph.text,
      });
      ph.id = created.id;
    } else {
      await fillersApi.updatePhrase(ph.id, { phrase: ph.text });
    }
    ElMessage.success("已保存");
  } catch (err: unknown) {
    ElMessage.error(err instanceof Error ? err.message : "保存失败");
  } finally {
    ph.saving = false;
  }
}

async function removePhrase(set: SetRow, ph: PhraseRow) {
  if (ph.id != null) {
    try {
      await fillersApi.removePhrase(ph.id);
    } catch (err: unknown) {
      ElMessage.error(err instanceof Error ? err.message : "删除失败");
      return;
    }
  }
  set.phrases = set.phrases.filter((p) => p.key !== ph.key);
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
.filler__icon {
  width: 36px;
  height: 36px;
  border-radius: var(--isales-radius-md);
  background: var(--isales-status-yellow-100);
  color: var(--isales-status-yellow-800);
  display: inline-flex;
  align-items: center;
  justify-content: center;
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
.fset__head {
  display: flex;
  align-items: center;
  gap: var(--isales-space-2);
}
.fset__name {
  flex: 1;
}
.phrase {
  display: flex;
  align-items: center;
  gap: var(--isales-space-2);
}
</style>
