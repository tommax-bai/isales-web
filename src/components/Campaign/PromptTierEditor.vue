<template>
  <section class="tier" :style="{ borderLeftColor: `var(--isales-status-${badgeColor}-700)` }">
    <header class="tier__head">
      <component v-if="plainIcon" :is="icon" :size="16" class="tier__icon-plain" />
      <span v-else class="tier__icon" :style="iconStyle">
        <component :is="icon" :size="16" />
      </span>
      <div class="tier__title-block">
        <h3 class="tier__title">{{ title }}</h3>
        <p v-if="description && open" class="tier__desc">
          <Info :size="13" class="tab-intro__icon" />
          <span>{{ description }}</span>
        </p>
      </div>
      <!-- collapsible（persona）：卡头开关即功能开关（绑 persona_fanout_cap）。
           关=关闭多人设推测(cap=1)、卡体收起；开=启用(cap≥2)、卡体展开露出配置体。 -->
      <el-switch
        v-if="collapsible"
        v-model="personaOn"
        active-text="启用"
        inactive-text="关闭"
        class="tier__toggle"
        @change="persistCap"
      />
      <template v-if="!solo && open">
        <StatusBadge :color="badgeColor">{{ rows.length }} 条</StatusBadge>
        <el-button size="small" type="primary" :disabled="!campaignId" @click="addRow">
          <Plus :size="14" style="margin-right: 4px" />
          新增
        </el-button>
      </template>
    </header>

    <template v-if="open">
      <!-- persona 卡专属：人设并发上限（含 main 的投机并行路由总数）。开关为「开」时 cap 必 ≥2。 -->
      <div v-if="collapsible" class="tier__fanout">
        <span class="tier__fanout-label">人设并发上限</span>
        <el-input-number
          v-model="fanoutLevel"
          :min="2"
          :max="3"
          size="small"
          @change="persistCap"
        />
        <span class="tier__fanout-hint">
          每轮与主对话一起投机并行的路由总数（含 main），上限 3。门控选中其一放行、其余取消（厂商按取消前已生成的 token 计费）。
        </span>
      </div>

      <p v-if="rows.length === 0 && !solo" class="tier__empty">
        暂无配置——点击「新增」添加一条 {{ title }}。
      </p>

      <article v-for="(row, i) in rows" :key="row.key" class="cfg">
      <div class="cfg__row">
        <el-input
          v-if="!solo"
          v-model="row.name"
          :placeholder="labeled ? '标识 label（路由规则按此引用，必填且唯一）' : '配置名称'"
          class="cfg__name"
        />
        <el-switch
          v-if="!isMain"
          v-model="row.enabled"
          active-text="启用"
          inactive-text="禁用"
        />
        <el-button
          v-if="!solo"
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
    </template>
  </section>
</template>

<script setup lang="ts">
import { ElMessage } from "element-plus";
import { Info, Plus, Save, Trash2 } from "lucide-vue-next";
import { computed, onMounted, ref, watch, type Component } from "vue";

import { campaignsApi } from "@/api/campaigns";
import { promptVersionsApi } from "@/api/promptVersions";
import { roleConfigsApi } from "@/api/roleConfigs";
import StatusBadge from "@/components/Common/StatusBadge.vue";
import ExpandingTextarea from "@/components/Common/ExpandingTextarea.vue";
import type { RoleKind, RoutingRule } from "@/types/campaign";
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
  // isMain: main 角色卡锁定——单条、必有、不可禁用/删除/新增/改名。main 是流式
  // 回复唯一驱动，data-model 保证每 campaign 恰好 1 行且 mandatory；禁用/删除/加
  // 第二个都会破坏该不变量。隐藏 enable 开关（恒 on）+ 标识 + 删除 + 新增。
  isMain?: boolean;
  // labeled: 该 kind 由 routing_rules 按 role_config.label 引用（referee / persona）。
  // 启用后「标识」输入映射到顶层 label（必填、kind 内唯一），而非 ext_params.name。
  // 不启用时旧行为不变（标识写 ext_params.name）。
  labeled?: boolean;
  // routingRules: persona 卡专用——删除前据此校验该 label 是否仍被 route 动作引用。
  routingRules?: RoutingRule[];
  // collapsible: persona 卡专用——卡头开关即功能开关（绑 persona_fanout_cap：关=1 仅 main、
  // 开=2/3 启用推测）。开=卡体展开露出「人设并发上限」+人设列表；关=收起。非纯前端折叠。
  collapsible?: boolean;
}>();

// personaFanoutCap: persona 卡专用，双向——卡头开关与卡内「人设并发上限」控件共同读写
// 顶层 campaign.persona_fanout_cap（1=关、2/3=开）。父用 v-model:persona-fanout-cap。
const fanoutCap = defineModel<number>("personaFanoutCap");

// solo: 逻辑上单条、无列表操作的卡（extractor singleton / main）——隐藏「新增 /
// X 条 / 标识 / 删除」；load 后若无配置自动补一条空白可编辑行。
const solo = computed(() => props.singleton || props.isMain);

// collapsible 卡（persona）卡头开关即功能开关：绑 persona_fanout_cap。关→cap=1 卡体收起；
// 开→cap≥2（从 1 切开默认 2）卡体展开。非 collapsible 卡 open 恒 true，行为不变。
const personaOn = computed<boolean>({
  get: () => (fanoutCap.value ?? 1) > 1,
  set: (on) => {
    fanoutCap.value = on ? Math.max(2, fanoutCap.value ?? 2) : 1;
  },
});
const open = computed(() => !props.collapsible || personaOn.value);

// 卡内「人设并发上限」输入绑定：开时取值恒 clamp 到 [2,3]。拦截 el-input-number 清空时
// 的 null/越界写回——否则 cap 瞬时变 null 会让 open 塌陷、卡体连同正在编辑的输入框一起卸载。
const fanoutLevel = computed<number>({
  get: () => Math.min(3, Math.max(2, fanoutCap.value ?? 2)),
  set: (v) => {
    fanoutCap.value = v == null ? 2 : Math.min(3, Math.max(2, v));
  },
});

// 即时落库：persona 卡头开关 / 卡内并发上限改动后直接 PATCH 单字段 persona_fanout_cap，
// 对齐同卡人设行的「即时保存」语义——避免开关看着已开、cap 却只存内存、不点底部保存就
// 离开导致后端仍 =1（引擎 personas[:cap-1]=[] → 刚配的人设永不运行）。v-model 已同步父
// form，故底部保存条不会回退该值。仅 collapsible(persona) 卡有这些控件。
async function persistCap() {
  if (!props.campaignId || !props.collapsible) return;
  const cap = fanoutCap.value ?? 1;
  try {
    await campaignsApi.update(props.campaignId, { persona_fanout_cap: cap });
    ElMessage.success(
      cap > 1 ? `已启用多人设推测（并发上限 ${cap}）` : "已关闭多人设推测",
    );
  } catch (err: unknown) {
    ElMessage.error(err instanceof Error ? err.message : "保存失败");
  }
}

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
      // labeled（referee/persona）：标识来自顶层 role_config.label（routing 引用源）；
      // 否则沿用 ext_params.name。
      name: props.labeled
        ? (c.label ?? "")
        : typeof ext.name === "string"
          ? ext.name
          : "",
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
  // solo（extractor singleton / main）逻辑上只有一条：若后端尚无配置，补一条空白行，
  // 让用户直接编辑保存（无「新增」按钮）。
  if (solo.value && out.length === 0) out.push(blankRow(false));
  // main 必有且恒启用：纠正任何历史 enabled=false（隐藏了开关，避免静默关闭）。
  if (props.isMain) for (const r of out) r.enabled = true;
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
  // labeled（referee/persona）：标识即 routing label，必填 + kind 内唯一。
  if (props.labeled) {
    const label = row.name.trim();
    if (!label) {
      ElMessage.error("请填写标识 (label)——路由规则按此引用");
      return;
    }
    if (rows.value.some((r, j) => j !== i && r.name.trim() === label)) {
      ElMessage.error(`标识「${label}」重复，请改为唯一值`);
      return;
    }
  }
  // persona 卡：启用人设总数（含 main）不得超过并发上限（卡内「人设并发上限」控件）。
  const cap = fanoutCap.value;
  if (
    props.kind === "persona" &&
    row.enabled &&
    cap != null &&
    1 + rows.value.filter((r) => r.enabled).length > cap
  ) {
    ElMessage.error(
      `启用人设总数（含主对话）不能超过并发上限 ${cap}；请调高本卡「人设并发上限」或先禁用其他人设。`,
    );
    return;
  }
  row.saving = true;
  try {
    const extParams = { name: row.name, provider: row.provider };
    // main 恒启用（开关已隐藏）；labeled 行额外写顶层 label 供 routing 引用。
    const enabled = props.isMain ? true : row.enabled;
    const labelPatch = props.labeled ? { label: row.name.trim() } : {};
    if (row.id == null) {
      // 新建：role_config → prompt_version → 回填 current_prompt_version_id
      const rc = await roleConfigsApi.create({
        campaign_id: props.campaignId,
        kind: props.kind,
        ...labelPatch,
        model: row.model,
        temperature: row.temperature,
        top_p: row.top_p,
        ext_params: extParams,
        enabled,
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
        ...labelPatch,
        model: row.model,
        temperature: row.temperature,
        top_p: row.top_p,
        ext_params: extParams,
        enabled,
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
  // persona 删除前置校验：客户端先扫已加载 routing_rules，命中 route 引用则拦截
  // （对应后端 422 routing_rule_unknown_persona delete-guard，避免直接吞裸错误码）。
  if (props.kind === "persona") {
    const label = row.name.trim();
    const refs = (props.routingRules ?? []).filter(
      (r) => r.action.type === "route" && r.action.to === label,
    ).length;
    if (label && refs > 0) {
      ElMessage.warning(
        `人设「${label}」仍被 ${refs} 条路由规则引用，请先在「门控路由」中移除这些引用再删除。`,
      );
      return;
    }
  }
  if (row.id != null) {
    try {
      await roleConfigsApi.remove(row.id);
    } catch (err: unknown) {
      // 后端兜底 delete-guard：翻译 routing_rule_unknown_persona 为可读提示。
      const msg = err instanceof Error ? err.message : "删除失败";
      ElMessage.error(
        msg.includes("routing_rule_unknown_persona")
          ? "该人设仍被路由规则引用，请先在「门控路由」中移除引用再删除。"
          : msg,
      );
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
  /* 与 .card__head 同 gap，使 plain-icon 卡（referee/extractor）标题与 form 卡对齐。 */
  gap: var(--isales-space-2);
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
  display: flex;
  align-items: flex-start;
  gap: 6px;
  margin-top: 2px;
  font-size: var(--isales-font-size-xs);
  color: var(--isales-muted-foreground);
}
/* persona 卡内的「人设并发上限」行：开关为「开」时显示。 */
.tier__fanout {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: var(--isales-space-2);
  padding: var(--isales-space-3);
  background: var(--isales-muted);
  border-radius: var(--isales-radius-md);
}
.tier__fanout-label {
  font-size: var(--isales-font-size-sm);
  font-weight: var(--isales-font-weight-medium);
}
.tier__fanout-hint {
  flex-basis: 100%;
  font-size: var(--isales-font-size-xs);
  color: var(--isales-muted-foreground);
  line-height: 1.6;
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
