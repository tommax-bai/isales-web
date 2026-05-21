<template>
  <section class="prompt-list" :style="containerStyle">
    <header class="prompt-list__head">
      <span class="prompt-list__icon" :style="iconStyle">
        <component :is="icon" :size="16" />
      </span>
      <div class="prompt-list__title-block">
        <h3 class="prompt-list__title">{{ title }}</h3>
        <p v-if="description" class="prompt-list__desc">{{ description }}</p>
      </div>
      <StatusBadge :color="badgeColor">N 并行</StatusBadge>
      <el-button size="small" type="primary" @click="onAdd">
        <Plus :size="14" style="margin-right: 4px" />
        新增
      </el-button>
    </header>

    <p v-if="configs.length === 0" class="prompt-list__empty">
      暂无配置 — 点击"新增"创建第一条。
    </p>

    <article
      v-for="(c, i) in configs"
      :key="c.id"
      class="prompt-cfg"
    >
      <div class="prompt-cfg__row">
        <el-input
          v-model="c.name"
          placeholder="配置名称（例如：默认对话策略）"
          class="prompt-cfg__name"
        />
        <el-switch
          v-model="c.enabled"
          active-text="启用"
          inactive-text="禁用"
        />
        <el-button size="small" plain type="danger" @click="onRemove(i)">
          <Trash2 :size="14" />
        </el-button>
      </div>

      <div class="prompt-cfg__row prompt-cfg__row--inline">
        <el-form-item label="provider" class="prompt-cfg__inline">
          <el-select
            v-model="c.provider"
            placeholder="provider"
            class="prompt-cfg__select"
          >
            <el-option
              v-for="p in providers"
              :key="p"
              :label="p"
              :value="p"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="model" class="prompt-cfg__inline">
          <el-input v-model="c.model" placeholder="例如 gpt-4o-mini" />
        </el-form-item>
        <el-form-item label="temperature" class="prompt-cfg__inline">
          <el-slider
            v-model="c.temperature"
            :min="0"
            :max="2"
            :step="0.05"
            show-input
            :show-input-controls="false"
          />
        </el-form-item>
        <el-form-item label="topP" class="prompt-cfg__inline">
          <el-slider
            v-model="c.top_p"
            :min="0"
            :max="1"
            :step="0.05"
            show-input
            :show-input-controls="false"
          />
        </el-form-item>
      </div>

      <el-input
        v-model="c.prompt"
        type="textarea"
        :rows="5"
        :placeholder="`${title} 的 system prompt`"
      />
    </article>
  </section>
</template>

<script setup lang="ts">
import { Plus, Trash2 } from "lucide-vue-next";
import { computed, type Component } from "vue";

import StatusBadge from "@/components/Common/StatusBadge.vue";

export interface PromptConfig {
  id: string;
  name: string;
  enabled: boolean;
  provider: string;
  model: string;
  temperature: number;
  top_p: number;
  prompt: string;
}

const props = defineProps<{
  title: string;
  description?: string;
  icon: Component;
  badgeColor: "blue" | "green" | "yellow" | "purple" | "gray" | "red";
  configs: PromptConfig[];
  providers?: string[];
}>();

// 默认 LLM provider 列表对齐 isales-engine factory.KNOWN_LLM_PROVIDERS
// (`volcengine` / `openai` / `mock`). 不再列 anthropic/azure/google —
// 引擎层未实装，列在 UI 会误导。
const providers = computed(() => props.providers ?? ["volcengine", "openai", "mock"]);

const badgeColor = computed(() => props.badgeColor);

const iconStyle = computed(() => ({
  background: `var(--isales-status-${props.badgeColor}-100)`,
  color: `var(--isales-status-${props.badgeColor}-800)`,
}));

const containerStyle = computed(() => ({
  borderLeft: `4px solid var(--isales-status-${props.badgeColor}-700)`,
}));

function onAdd() {
  // 默认 volcengine + doubao-pro-32k 对齐 isales-engine.settings 的
  // `volcengine_llm_model` 默认值。
  props.configs.push({
    id: `cfg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    name: "",
    enabled: true,
    provider: "volcengine",
    model: "doubao-pro-32k",
    temperature: 0.7,
    top_p: 1.0,
    prompt: "",
  });
}

function onRemove(i: number) {
  props.configs.splice(i, 1);
}
</script>

<style scoped>
.prompt-list {
  background: var(--isales-card);
  border: 1px solid var(--isales-border);
  border-radius: var(--isales-radius);
  padding: var(--isales-space-4);
  display: flex;
  flex-direction: column;
  gap: var(--isales-space-3);
}
.prompt-list__head {
  display: flex;
  align-items: center;
  gap: var(--isales-space-3);
}
.prompt-list__icon {
  width: 36px;
  height: 36px;
  border-radius: var(--isales-radius-md);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.prompt-list__title-block {
  flex: 1;
  min-width: 0;
}
.prompt-list__title {
  font-size: var(--isales-font-size-title-3);
  font-weight: var(--isales-font-weight-semibold);
  line-height: var(--isales-line-height-tight);
}
.prompt-list__desc {
  margin-top: 2px;
  font-size: var(--isales-font-size-xs);
  color: var(--isales-muted-foreground);
  line-height: var(--isales-line-height-snug);
}
.prompt-list__empty {
  margin: var(--isales-space-2) 0;
  font-size: var(--isales-font-size-sm);
  color: var(--isales-muted-foreground);
  text-align: center;
  padding: var(--isales-space-4);
  border: 1px dashed var(--isales-border);
  border-radius: var(--isales-radius-md);
}
.prompt-cfg {
  display: flex;
  flex-direction: column;
  gap: var(--isales-space-2);
  padding: var(--isales-space-3);
  background: var(--isales-muted);
  border-radius: var(--isales-radius-md);
}
.prompt-cfg__row {
  display: flex;
  align-items: center;
  gap: var(--isales-space-2);
}
.prompt-cfg__row--inline {
  flex-wrap: wrap;
}
.prompt-cfg__name {
  flex: 1;
}
.prompt-cfg__inline {
  flex: 1 1 200px;
  margin-bottom: 0 !important;
}
.prompt-cfg__select {
  width: 100%;
}
</style>
