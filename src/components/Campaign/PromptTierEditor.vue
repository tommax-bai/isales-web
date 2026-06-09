<template>
  <section class="tier" :style="{ borderLeftColor: `var(--isales-status-${badgeColor}-700)` }">
    <header class="tier__head">
      <component v-if="plainIcon" :is="icon" :size="16" class="tier__icon-plain" />
      <span v-else class="tier__icon" :style="iconStyle">
        <component :is="icon" :size="16" />
      </span>
      <div class="tier__title-block">
        <h3 class="tier__title">{{ title }}</h3>
        <p v-if="description" class="tier__desc">{{ description }}</p>
      </div>
      <template v-if="!singleton">
        <StatusBadge :color="badgeColor">{{ rows.length }} 条</StatusBadge>
        <el-button size="small" type="primary" :disabled="!campaignId" @click="addRow">
          <Plus :size="14" style="margin-right: 4px" />
          新增
        </el-button>
      </template>
    </header>

    <p v-if="rows.length === 0 && !singleton" class="tier__empty">
      暂无配置——点击「新增」添加一条 {{ title }}。
    </p>

    <article v-for="(row, i) in rows" :key="row.key" class="cfg">
      <div class="cfg__row">
        <el-input
          v-if="!singleton"
          v-model="row.name"
          placeholder="配置名称"
          class="cfg__name"
        />
        <el-switch v-model="row.enabled" active-text="启用" inactive-text="禁用" />
        <el-button
          v-if="!singleton"
          size="small"
          plain
          type="danger"
          @click="removeRow(i)"
        >
          <Trash2 :size="14" />
        </el-button>
      </div>
      <div class="cfg__row cfg__row--inline">
        <el-select v-model="row.provider" placeholder="provider" @change="onProviderChange(i)">
          <el-option
            v-for="p in PROVIDERS"
            :key="p"
            :label="LLM_PROVIDER_LABEL[p]"
            :value="p"
          />
        </el-select>
        <el-input
          v-model="row.model"
          :placeholder="`model（如 ${LLM_PROVIDER_DEFAULT_MODEL[row.provider as PromptTierProviderId] ?? 'doubao-pro-32k'}）`"
        />
        <div class="cfg__slider">
          <span class="cfg__slider-label">temperature</span>
          <el-slider
            v-model="row.temperature"
            :min="0"
            :max="2"
            :step="0.05"
            show-input
            :show-input-controls="false"
          />
        </div>
        <div class="cfg__slider">
          <span class="cfg__slider-label">topP</span>
          <el-slider
            v-model="row.top_p"
            :min="0"
            :max="1"
            :step="0.05"
            show-input
            :show-input-controls="false"
          />
        </div>
      </div>
      <ExpandingTextarea
        v-model="row.prompt"
        :collapsed-rows="4"
        :placeholder="`${title} 的 system prompt`"
      />
      <div class="cfg__foot">
        <el-button
          size="small"
          type="primary"
          :loading="row.saving"
          @click="saveRow(i)"
        >
          <Save :size="13" style="margin-right: 4px" />
          保存这条
        </el-button>
        <span v-if="row.dirty" class="cfg__dirty">未保存</span>
      </div>
    </article>
  </section>
</template>

<script setup lang="ts">
import { ElMessage } from "element-plus";
import { Plus, Save, Trash2 } from "lucide-vue-next";
import { computed, onMounted, ref, watch, type Component } from "vue";

import { promptVersionsApi } from "@/api/promptVersions";
import { roleConfigsApi } from "@/api/roleConfigs";
import StatusBadge from "@/components/Common/StatusBadge.vue";
import ExpandingTextarea from "@/components/Common/ExpandingTextarea.vue";
import type { RoleKind } from "@/types/campaign";
import {
  LLM_PROVIDER_DEFAULT_MODEL,
  LLM_PROVIDER_LABEL,
  PROVIDER_OPTIONS_WITH_MOCK,
  type PromptTierProviderId,
} from "@/types/llmProviders";

const props = defineProps<{
  campaignId: number | null;
  kind: RoleKind;
  title: string;
  description?: string;
  icon: Component;
  badgeColor: "blue" | "green" | "yellow" | "purple" | "gray" | "red";
  // singleton: 该 kind 逻辑上只有一条配置（如 extractor）——隐藏「新增 / X 条 /
  // 配置名称 / 删除」，load 后若无配置自动补一条空白可编辑行。
  singleton?: boolean;
  // plainIcon: 用裸 lucide 图标（无彩色底框），与 form 小节的 <Settings> 一致；
  // 左色条仍由 badgeColor 驱动。默认 false = 彩色图标底框（main 保留）。
  plainIcon?: boolean;
}>();

// 对齐 SSOT @/types/llmProviders (volcengine + openai + dashscope + mock)；
// 增减 provider 改 SSOT。mock 是 engine factory 合法 provider 但不在
// 模型厂商配置 view 里出现（无 API key 需要配）。
const PROVIDERS = PROVIDER_OPTIONS_WITH_MOCK;

interface PromptRow {
  key: string;
  id: number | null; // role_config.id
  prompt_version_id: number | null;
  name: string;
  provider: string;
  model: string;
  temperature: number;
  top_p: number;
  enabled: boolean;
  prompt: string;
  saving: boolean;
  dirty: boolean;
}

const rows = ref<PromptRow[]>([]);

const iconStyle = computed(() => ({
  background: `var(--isales-status-${props.badgeColor}-100)`,
  color: `var(--isales-status-${props.badgeColor}-800)`,
}));

function rid(): string {
  return `r-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}

async function load() {
  rows.value = [];
  if (!props.campaignId) return;
  const configs = await roleConfigsApi.list({
    campaign_id: props.campaignId,
    kind: props.kind,
  });
  const out: PromptRow[] = [];
  for (const c of configs) {
    let prompt = "";
    if (c.current_prompt_version_id != null) {
      try {
        prompt = (await promptVersionsApi.get(c.current_prompt_version_id)).content;
      } catch {
        // prompt_version 缺失——留空
      }
    }
    const ext = c.ext_params ?? {};
    out.push({
      key: rid(),
      id: c.id,
      prompt_version_id: c.current_prompt_version_id,
      name: typeof ext.name === "string" ? ext.name : "",
      provider: typeof ext.provider === "string" ? ext.provider : "volcengine",
      model: c.model,
      temperature: c.temperature,
      top_p: c.top_p,
      enabled: c.enabled,
      prompt,
      saving: false,
      dirty: false,
    });
  }
  // singleton（如 extractor）逻辑上只有一条：若后端尚无配置，补一条空白行，
  // 让用户直接编辑保存（无「新增」按钮）。
  if (props.singleton && out.length === 0) out.push(blankRow(false));
  rows.value = out;
}

function blankRow(dirty: boolean): PromptRow {
  return {
    key: rid(),
    id: null,
    prompt_version_id: null,
    name: "",
    provider: "volcengine",
    model: "doubao-pro-32k",
    temperature: 0.7,
    top_p: 1.0,
    enabled: true,
    prompt: "",
    saving: false,
    dirty,
  };
}

function addRow() {
  rows.value.push(blankRow(true));
}

async function saveRow(i: number) {
  const row = rows.value[i];
  if (!props.campaignId) return;
  row.saving = true;
  try {
    const extParams = { name: row.name, provider: row.provider };
    if (row.id == null) {
      // 新建：role_config → prompt_version → 回填 current_prompt_version_id
      const rc = await roleConfigsApi.create({
        campaign_id: props.campaignId,
        kind: props.kind,
        model: row.model,
        temperature: row.temperature,
        top_p: row.top_p,
        ext_params: extParams,
        enabled: row.enabled,
      });
      row.id = rc.id;
      const pv = await promptVersionsApi.create({
        scope_type: props.kind,
        scope_id: rc.id,
        content: row.prompt,
        is_active: true,
      });
      row.prompt_version_id = pv.id;
      await roleConfigsApi.update(rc.id, { current_prompt_version_id: pv.id });
    } else {
      // 编辑：PATCH role_config + upsert prompt_version
      await roleConfigsApi.update(row.id, {
        model: row.model,
        temperature: row.temperature,
        top_p: row.top_p,
        ext_params: extParams,
        enabled: row.enabled,
      });
      if (row.prompt_version_id != null) {
        await promptVersionsApi.update(row.prompt_version_id, {
          content: row.prompt,
        });
      } else {
        const pv = await promptVersionsApi.create({
          scope_type: props.kind,
          scope_id: row.id,
          content: row.prompt,
          is_active: true,
        });
        row.prompt_version_id = pv.id;
        await roleConfigsApi.update(row.id, { current_prompt_version_id: pv.id });
      }
    }
    row.dirty = false;
    ElMessage.success(`已保存「${row.name || props.title}」`);
  } catch (err: unknown) {
    ElMessage.error(err instanceof Error ? err.message : "保存失败");
  } finally {
    row.saving = false;
  }
}

function onProviderChange(i: number) {
  const row = rows.value[i];
  // 切 provider 时如果 model 为空或还是某个已知默认，自动填新 provider
  // 的默认 model；如果用户手填了自定义 model 则不覆盖。
  const currentDefaults = Object.values(LLM_PROVIDER_DEFAULT_MODEL);
  if (!row.model || currentDefaults.includes(row.model)) {
    row.model =
      LLM_PROVIDER_DEFAULT_MODEL[row.provider as PromptTierProviderId] ?? row.model;
  }
  row.dirty = true;
}

async function removeRow(i: number) {
  const row = rows.value[i];
  if (row.id != null) {
    try {
      await roleConfigsApi.remove(row.id);
    } catch (err: unknown) {
      ElMessage.error(err instanceof Error ? err.message : "删除失败");
      return;
    }
  }
  rows.value.splice(i, 1);
}

watch(() => props.campaignId, () => void load());
onMounted(() => void load());
</script>

<style scoped>
.tier {
  background: var(--isales-card);
  border: 1px solid var(--isales-border);
  border-left-width: 4px;
  border-radius: var(--isales-radius);
  padding: var(--isales-space-4);
  display: flex;
  flex-direction: column;
  gap: var(--isales-space-3);
}
.tier__head {
  display: flex;
  align-items: center;
  gap: var(--isales-space-3);
}
.tier__icon {
  width: 36px;
  height: 36px;
  border-radius: var(--isales-radius-md);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
/* plainIcon: 裸 lucide 图标（无彩色底框），与 form 小节的 <Settings> 一致。 */
.tier__icon-plain {
  flex-shrink: 0;
}
.tier__title-block {
  flex: 1;
  min-width: 0;
}
.tier__title {
  font-size: var(--isales-font-size-title-3);
  font-weight: var(--isales-font-weight-semibold);
  line-height: var(--isales-line-height-tight);
}
.tier__desc {
  margin-top: 2px;
  font-size: var(--isales-font-size-xs);
  color: var(--isales-muted-foreground);
}
.tier__empty {
  margin: var(--isales-space-2) 0;
  font-size: var(--isales-font-size-sm);
  color: var(--isales-muted-foreground);
  text-align: center;
  padding: var(--isales-space-4);
  border: 1px dashed var(--isales-border);
  border-radius: var(--isales-radius-md);
}
.cfg {
  display: flex;
  flex-direction: column;
  gap: var(--isales-space-2);
  padding: var(--isales-space-3);
  background: var(--isales-muted);
  border-radius: var(--isales-radius-md);
}
.cfg__row {
  display: flex;
  align-items: center;
  gap: var(--isales-space-2);
}
.cfg__row--inline {
  flex-wrap: wrap;
}
.cfg__row--inline > * {
  flex: 1 1 200px;
  min-width: 0;
}
.cfg__name {
  flex: 1;
}
.cfg__slider {
  display: flex;
  flex-direction: column;
}
.cfg__slider-label {
  font-size: var(--isales-font-size-xs);
  color: var(--isales-muted-foreground);
}
.cfg__foot {
  display: flex;
  align-items: center;
  gap: var(--isales-space-2);
}
.cfg__dirty {
  font-size: var(--isales-font-size-xs);
  color: var(--isales-status-yellow-800);
}
</style>
