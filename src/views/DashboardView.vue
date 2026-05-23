<template>
  <div class="dashboard">
    <el-row :gutter="16">
      <el-col :span="6">
        <StatCard label="总通话" :value="overview?.answer.total ?? 0" />
      </el-col>
      <el-col :span="6">
        <StatCard label="接通数" :value="overview?.answer.answered ?? 0" />
      </el-col>
      <el-col :span="6">
        <StatCard label="接通率" :value="answerRatePercent" suffix="%" />
      </el-col>
      <el-col :span="6">
        <StatCard label="目标达成率" :value="goalRatePercent" suffix="%" />
      </el-col>
    </el-row>

    <el-row :gutter="16" class="charts">
      <el-col :span="24">
        <el-card>
          <template #header>通话时长分布</template>
          <div class="chart-host">
            <v-chart
              v-if="durationOption"
              :option="durationOption"
              autoresize
            />
            <el-empty v-else description="暂无数据" />
          </div>
        </el-card>
      </el-col>
    </el-row>

    <el-alert
      :closable="false"
      type="info"
      show-icon
      class="explain"
    >
      <template #title>v1.0 看板说明</template>
      <template #default>
        当前 isales-api 仅提供 3 个 aggregate (`/answer-rate`、`/goal-rate`、
        `/duration-distribution`)，前端拼出概览。7 日趋势 / 各 campaign 通话量
        在后端 (`/analytics/timeseries` + `/by_campaign`) 实装前不展示，
        要做请走 `/opsx:propose impl-analytics-timeseries-bycampaign`。
      </template>
    </el-alert>
  </div>
</template>

<script setup lang="ts">
import { BarChart } from "echarts/charts";
import {
  GridComponent,
  LegendComponent,
  TitleComponent,
  TooltipComponent,
} from "echarts/components";
import { use } from "echarts/core";
import { CanvasRenderer } from "echarts/renderers";
import { computed, onMounted, ref } from "vue";
import VChart from "vue-echarts";

import { analyticsApi } from "@/api/analytics";
import StatCard from "@/components/Dashboard/StatCard.vue";
import type { AnalyticsOverview } from "@/types/analytics";

use([
  CanvasRenderer,
  BarChart,
  GridComponent,
  TooltipComponent,
  TitleComponent,
  LegendComponent,
]);

const overview = ref<AnalyticsOverview | null>(null);

const answerRatePercent = computed(() =>
  overview.value ? Math.round(overview.value.answer.rate * 100) : 0,
);
const goalRatePercent = computed(() =>
  overview.value ? Math.round(overview.value.goal.rate * 100) : 0,
);

const durationOption = computed(() => {
  const d = overview.value?.duration;
  if (!d || d.total === 0) return null;
  return {
    tooltip: { trigger: "axis" },
    grid: { left: 60, right: 20, top: 20, bottom: 30 },
    xAxis: { type: "category", data: d.buckets.map((b) => b.label) },
    yAxis: { type: "value" },
    series: [
      {
        type: "bar",
        data: d.buckets.map((b) => b.count),
      },
    ],
  };
});

onMounted(async () => {
  try {
    overview.value = await analyticsApi.overview();
  } catch {
    // 后端任一 aggregate 端点未就绪时拿不到数据，UI 显示 0 / empty。
  }
});
</script>

<style scoped>
.dashboard {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.charts {
  margin-top: 0;
}
.chart-host {
  height: 280px;
}
.explain {
  margin-top: 8px;
}
</style>
