<template>
  <div class="goal" v-if="summary">
    <div class="goal__head">
      <Target :size="16" />
      <span class="goal__title">目标达成情况</span>
      <StatusBadge :color="summary.goal_achieved ? 'green' : 'gray'">
        {{ summary.goal_achieved ? "已达成" : "未达成" }}
      </StatusBadge>
    </div>

    <dl class="goal__metrics">
      <div v-if="score !== null">
        <dt>评分</dt>
        <dd>
          <el-progress
            :percentage="score"
            :stroke-width="6"
            :show-text="false"
            :color="scoreColor"
          />
          <span class="goal__score">{{ score }} / 100</span>
        </dd>
      </div>
      <div v-if="intent">
        <dt>客户意向</dt>
        <dd>
          <StatusBadge :color="intentColor">{{ intentLabel }}</StatusBadge>
        </dd>
      </div>
      <div v-if="appointmentBooked !== null">
        <dt>预约成功</dt>
        <dd>
          <StatusBadge :color="appointmentBooked ? 'green' : 'gray'">
            {{ appointmentBooked ? "是" : "否" }}
          </StatusBadge>
        </dd>
      </div>
      <div v-if="summary.goal_type">
        <dt>目标类型</dt>
        <dd>{{ summary.goal_type }}</dd>
      </div>
    </dl>

    <div v-if="keyPoints.length > 0" class="goal__points">
      <p class="goal__points-title">已覆盖的关键要点</p>
      <ul>
        <li v-for="(p, i) in keyPoints" :key="i">
          <CheckCircle :size="13" class="goal__points-icon" />
          {{ p }}
        </li>
      </ul>
    </div>
  </div>
</template>

<script setup lang="ts">
import { CheckCircle, Target } from "lucide-vue-next";
import { computed } from "vue";

import StatusBadge from "@/components/Common/StatusBadge.vue";
import type { CallSummary } from "@/types/call";

/**
 * Reads optional fields from `summary.extracted_fields`:
 *   - score (number 0–100)
 *   - intent ("high" | "medium" | "low" | "none")
 *   - appointment_booked (boolean)
 *   - key_points (string[])
 *
 * Spec: goal-achievement uses extracted_fields JSONB; these are optional
 * conventions that the worker may write. UI degrades gracefully when absent.
 */
const props = defineProps<{ summary: CallSummary | null }>();

const score = computed<number | null>(() => {
  const v = props.summary?.extracted_fields?.score;
  if (typeof v === "number") return Math.max(0, Math.min(100, Math.round(v)));
  return null;
});

const scoreColor = computed(() => {
  if (score.value === null) return "";
  if (score.value >= 70) return "var(--isales-status-green-700)";
  if (score.value >= 40) return "var(--isales-status-yellow-700)";
  return "var(--isales-status-red-700)";
});

const intent = computed<string | null>(() => {
  const v = props.summary?.extracted_fields?.intent;
  return typeof v === "string" ? v : null;
});

const intentColor = computed<"green" | "yellow" | "gray" | "red">(() => {
  if (intent.value === "high") return "green";
  if (intent.value === "medium") return "yellow";
  if (intent.value === "low") return "gray";
  return "red";
});

const intentLabel = computed(() => {
  switch (intent.value) {
    case "high":
      return "高";
    case "medium":
      return "中";
    case "low":
      return "低";
    default:
      return "无";
  }
});

const appointmentBooked = computed<boolean | null>(() => {
  const v = props.summary?.extracted_fields?.appointment_booked;
  return typeof v === "boolean" ? v : null;
});

const keyPoints = computed<string[]>(() => {
  const v = props.summary?.extracted_fields?.key_points;
  if (Array.isArray(v)) return v.filter((x): x is string => typeof x === "string");
  return [];
});
</script>

<style scoped>
.goal {
  border: 1px solid var(--isales-border);
  border-radius: var(--isales-radius-md);
  padding: var(--isales-space-3);
  background: var(--isales-card);
}
.goal__head {
  display: flex;
  align-items: center;
  gap: var(--isales-space-2);
  margin-bottom: var(--isales-space-2);
}
.goal__title {
  font-weight: var(--isales-font-weight-medium);
  font-size: var(--isales-font-size-body);
  flex: 1;
  line-height: var(--isales-line-height-tight);
}
.goal__metrics {
  display: grid;
  grid-template-columns: max-content 1fr;
  column-gap: var(--isales-space-3);
  row-gap: 6px;
  font-size: var(--isales-font-size-sm);
  margin: 0;
}
.goal__metrics dt {
  color: var(--isales-muted-foreground);
  font-size: var(--isales-font-size-xs);
}
.goal__metrics dd {
  margin: 0;
  display: flex;
  align-items: center;
  gap: var(--isales-space-2);
}
.goal__score {
  font-variant-numeric: tabular-nums;
  font-size: var(--isales-font-size-xs);
  color: var(--isales-muted-foreground);
}
.goal__points {
  margin-top: var(--isales-space-2);
  padding-top: var(--isales-space-2);
  border-top: 1px dashed var(--isales-border);
}
.goal__points-title {
  font-size: var(--isales-font-size-xs);
  color: var(--isales-muted-foreground);
  margin-bottom: 4px;
  letter-spacing: var(--isales-letter-spacing-wide);
}
.goal__points ul {
  margin: 0;
  padding-left: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.goal__points li {
  display: flex;
  align-items: center;
  gap: var(--isales-space-2);
  font-size: var(--isales-font-size-sm);
  line-height: var(--isales-line-height-snug);
}
.goal__points-icon {
  color: var(--isales-status-green-700);
  flex-shrink: 0;
}
</style>
