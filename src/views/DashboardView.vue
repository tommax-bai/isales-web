<template>
  <div class="dashboard">
    <el-row :gutter="16">
      <el-col :span="6">
        <StatCard label="今日通话" :value="overview?.total_calls ?? 0" />
      </el-col>
      <el-col :span="6">
        <StatCard label="接通率" :value="answerRate" suffix="%" />
      </el-col>
      <el-col :span="6">
        <StatCard label="目标达成率" :value="goalRate" suffix="%" />
      </el-col>
      <el-col :span="6">
        <StatCard label="在打通话" :value="overview?.active_calls ?? 0" />
      </el-col>
    </el-row>

    <el-row :gutter="16" class="charts">
      <el-col :span="14">
        <el-card>
          <template #header>接通率 7 日趋势</template>
          <div class="chart-host">
            <v-chart v-if="trendOption" :option="trendOption" autoresize />
            <el-empty v-else description="暂无数据" />
          </div>
        </el-card>
      </el-col>
      <el-col :span="10">
        <el-card>
          <template #header>各任务通话量</template>
          <div class="chart-host">
            <v-chart v-if="byCampaignOption" :option="byCampaignOption" autoresize />
            <el-empty v-else description="暂无数据" />
          </div>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup lang="ts">
import { BarChart, LineChart } from "echarts/charts";
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
import type {
  AnalyticsByCampaign,
  AnalyticsOverview,
  TimeSeriesPoint,
} from "@/types/analytics";

use([
  CanvasRenderer,
  LineChart,
  BarChart,
  GridComponent,
  TooltipComponent,
  TitleComponent,
  LegendComponent,
]);

const overview = ref<AnalyticsOverview | null>(null);
const series = ref<TimeSeriesPoint[]>([]);
const byCampaign = ref<AnalyticsByCampaign[]>([]);

const answerRate = computed(() => {
  if (!overview.value || overview.value.total_calls === 0) return 0;
  return Math.round((overview.value.answered / overview.value.total_calls) * 100);
});
const goalRate = computed(() => {
  if (!overview.value || overview.value.total_calls === 0) return 0;
  return Math.round(
    (overview.value.goal_achieved / overview.value.total_calls) * 100,
  );
});

const trendOption = computed(() => {
  if (!series.value.length) return null;
  return {
    tooltip: { trigger: "axis" },
    legend: { data: ["接通率", "达成率"] },
    grid: { left: 40, right: 20, top: 40, bottom: 30 },
    xAxis: { type: "category", data: series.value.map((p) => p.date) },
    yAxis: { type: "value", max: 100 },
    series: [
      {
        name: "接通率",
        type: "line",
        smooth: true,
        data: series.value.map((p) =>
          p.total_calls === 0 ? 0 : Math.round((p.answered / p.total_calls) * 100),
        ),
      },
      {
        name: "达成率",
        type: "line",
        smooth: true,
        data: series.value.map((p) =>
          p.total_calls === 0
            ? 0
            : Math.round((p.goal_achieved / p.total_calls) * 100),
        ),
      },
    ],
  };
});

const byCampaignOption = computed(() => {
  if (!byCampaign.value.length) return null;
  return {
    tooltip: { trigger: "axis" },
    grid: { left: 80, right: 20, top: 20, bottom: 30 },
    xAxis: { type: "value" },
    yAxis: {
      type: "category",
      data: byCampaign.value.map((c) => c.campaign_name),
    },
    series: [
      {
        type: "bar",
        data: byCampaign.value.map((c) => c.total_calls),
      },
    ],
  };
});

onMounted(async () => {
  try {
    const [ov, ts, bc] = await Promise.all([
      analyticsApi.overview().catch(() => null),
      analyticsApi.timeseries(7).catch(() => []),
      analyticsApi.byCampaign().catch(() => []),
    ]);
    overview.value = ov;
    series.value = ts;
    byCampaign.value = bc;
  } catch {
    // analytics endpoints may not be ready in some deployments; the cards
    // and chart panels show 0 / empty-state above.
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
</style>
