<template>
  <section class="campaigns">
    <PageHeader title="场景" :subtitle="`共 ${campaigns.length} 个外呼场景`">
      <template #actions>
        <el-button type="primary" @click="onNew">
          <Plus :size="15" style="margin-right: 4px" />
          新建场景
        </el-button>
      </template>
    </PageHeader>

    <el-empty
      v-if="!loading && campaigns.length === 0"
      description="暂无场景，点击「新建场景」开始"
      class="campaigns__empty"
    />
    <div v-else v-loading="loading" class="campaigns__grid">
      <article
        v-for="c in campaigns"
        :key="c.id"
        class="camp-card"
        @click="onOpen(c.id)"
      >
        <header class="camp-card__head">
          <div class="camp-card__identity">
            <h3 class="camp-card__name">{{ c.name }}</h3>
            <p class="camp-card__sub">并发上限 {{ c.concurrency }}</p>
          </div>
          <StatusBadge :color="progressOf(c.id).is_active ? 'green' : 'gray'">
            {{ progressOf(c.id).is_active ? "运行中" : "已停止" }}
          </StatusBadge>
        </header>

        <div class="camp-card__meta">
          <div class="meta-row">
            <span class="meta-row__label">线索总数</span>
            <span class="meta-row__value">{{ progressOf(c.id).total }}</span>
          </div>
          <div class="meta-row">
            <span class="meta-row__label">外呼进度</span>
            <span class="meta-row__value">{{ progressSummary(c.id) }}</span>
          </div>
        </div>

        <div class="camp-card__foot">
          <span class="camp-card__open">
            进入配置
            <ArrowRight :size="14" />
          </span>
        </div>
      </article>
    </div>

    <el-dialog v-model="newDialogVisible" title="新建场景" width="480px">
      <el-form ref="formRef" :model="form" :rules="rules" label-width="90px">
        <el-form-item label="场景名称" prop="name">
          <el-input v-model="form.name" placeholder="例如：五月新客回访" />
        </el-form-item>
        <el-form-item label="并发上限" prop="concurrency">
          <el-input-number v-model="form.concurrency" :min="1" :max="100" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="newDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="creating" @click="onCreate">
          创建
        </el-button>
      </template>
    </el-dialog>
  </section>
</template>

<script setup lang="ts">
import type { FormInstance, FormRules } from "element-plus";
import { ElMessage } from "element-plus";
import { ArrowRight, Plus } from "lucide-vue-next";
import { onMounted, reactive, ref } from "vue";
import { useRouter } from "vue-router";

import { campaignsApi } from "@/api/campaigns";
import PageHeader from "@/components/Common/PageHeader.vue";
import StatusBadge from "@/components/Common/StatusBadge.vue";
import {
  CAMPAIGN_DEFAULTS,
  type CampaignDetail,
  type CampaignProgress,
} from "@/types/campaign";

const router = useRouter();
const campaigns = ref<CampaignDetail[]>([]);
const progresses = reactive<Record<number, CampaignProgress>>({});
const loading = ref(false);

const newDialogVisible = ref(false);
const creating = ref(false);
const formRef = ref<FormInstance>();
const form = reactive({ name: "", concurrency: 1 });
const rules: FormRules = {
  name: [{ required: true, message: "填写场景名称", trigger: "blur" }],
};

const EMPTY_PROGRESS: CampaignProgress = {
  campaign_id: 0,
  total: 0,
  status_counts: {},
  is_active: false,
};

function progressOf(id: number): CampaignProgress {
  return progresses[id] ?? EMPTY_PROGRESS;
}

function progressSummary(id: number): string {
  const p = progressOf(id);
  if (p.total === 0) return "暂无线索";
  const done = p.status_counts["completed"] ?? 0;
  const calling = p.status_counts["calling"] ?? 0;
  return `已完成 ${done} · 进行中 ${calling}`;
}

async function onRefresh() {
  loading.value = true;
  try {
    campaigns.value = await campaignsApi.list({ page_size: 200 });
    await Promise.all(
      campaigns.value.map(async (c) => {
        try {
          progresses[c.id] = await campaignsApi.progress(c.id);
        } catch {
          // 进度拉取失败不阻塞列表
        }
      }),
    );
  } catch (err: unknown) {
    ElMessage.error(err instanceof Error ? err.message : "加载场景失败");
  } finally {
    loading.value = false;
  }
}

function onNew() {
  form.name = "";
  form.concurrency = 1;
  newDialogVisible.value = true;
}

function onOpen(id: number) {
  void router.push({ name: "campaign-detail", params: { id } });
}

async function onCreate() {
  if (!formRef.value) return;
  const valid = await formRef.value.validate().catch(() => false);
  if (!valid) return;
  creating.value = true;
  try {
    const created = await campaignsApi.create({
      ...CAMPAIGN_DEFAULTS,
      name: form.name,
      concurrency: form.concurrency,
    });
    ElMessage.success("场景已创建");
    newDialogVisible.value = false;
    void router.push({ name: "campaign-detail", params: { id: created.id } });
  } catch (err: unknown) {
    ElMessage.error(err instanceof Error ? err.message : "创建失败");
  } finally {
    creating.value = false;
  }
}

onMounted(onRefresh);
</script>

<style scoped>
.campaigns {
  display: flex;
  flex-direction: column;
}
.campaigns__empty {
  padding: var(--isales-space-8) 0;
  background: var(--isales-card);
  border: 1px dashed var(--isales-border);
  border-radius: var(--isales-radius);
}
.campaigns__grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: var(--isales-space-4);
  align-items: stretch;
}

.camp-card {
  background: var(--isales-card);
  border: 1px solid var(--isales-border);
  border-radius: var(--isales-radius-lg);
  padding: var(--isales-space-5);
  display: flex;
  flex-direction: column;
  gap: var(--isales-space-4);
  cursor: pointer;
  transition:
    box-shadow 0.15s,
    transform 0.15s;
}
.camp-card:hover {
  box-shadow: var(--isales-shadow-md);
  transform: translateY(-1px);
}
.camp-card__head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: var(--isales-space-3);
}
.camp-card__identity {
  min-width: 0;
}
.camp-card__name {
  font-size: var(--isales-font-size-title-2);
  font-weight: var(--isales-font-weight-semibold);
  line-height: var(--isales-line-height-tight);
  letter-spacing: var(--isales-letter-spacing-tight);
}
.camp-card__sub {
  margin-top: 4px;
  font-size: var(--isales-font-size-sm);
  color: var(--isales-muted-foreground);
}
.camp-card__meta {
  display: flex;
  flex-direction: column;
  gap: var(--isales-space-2);
}
.meta-row {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: var(--isales-space-3);
  font-size: var(--isales-font-size-sm);
}
.meta-row__label {
  color: var(--isales-muted-foreground);
}
.meta-row__value {
  color: var(--isales-foreground);
}
.camp-card__foot {
  margin-top: auto;
  padding-top: var(--isales-space-3);
  border-top: 1px solid var(--isales-border);
}
.camp-card__open {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: var(--isales-font-size-sm);
  color: var(--isales-primary);
  font-weight: var(--isales-font-weight-medium);
}
</style>
