<template>
  <div class="trace-panel">
    <div class="header">
      <span class="title">Pipeline Trace</span>
      <el-button size="small" :loading="loading" @click="onLoad">
        {{ trace ? "刷新" : "加载" }}
      </el-button>
    </div>

    <el-alert
      v-if="error"
      :title="error"
      type="warning"
      show-icon
      :closable="false"
      class="alert"
    />

    <el-collapse v-if="trace && trace.turns.length" v-model="openTurns">
      <el-collapse-item
        v-for="turn in trace.turns"
        :key="turn.turn_id"
        :name="turn.turn_id"
      >
        <template #title>
          <span class="turn-title">
            #{{ turn.turn_id }} · {{ truncate(turn.user_input, 30) }}
          </span>
        </template>

        <div class="section">
          <h5>用户输入</h5>
          <pre class="code-block">{{ turn.user_input }}</pre>
        </div>

        <div class="section">
          <h5>
            main 回复
            <el-tag v-if="turn.main_fallback_used" type="warning" size="small">
              fallback
            </el-tag>
          </h5>
          <pre class="code-block">{{ turn.main_reply_text }}</pre>
          <div class="row metrics">
            <span class="lbl">首音频:</span>
            <span>{{ fmtMs(turn.first_audio_ms) }}</span>
            <span class="lbl">main 耗时:</span>
            <span>{{ fmtMs(turn.main_duration_ms) }}</span>
            <span class="lbl">tokens:</span>
            <span>{{ turn.main_tokens_in ?? "–" }} / {{ turn.main_tokens_out ?? "–" }}</span>
          </div>
        </div>

        <div class="section">
          <h5>门控监管 (referee)</h5>
          <div
            v-if="turn.referee_results && turn.referee_results.length"
            class="referee-list"
          >
            <div
              v-for="r in turn.referee_results"
              :key="r.label"
              class="row metrics"
            >
              <el-tag type="info" size="small">{{ r.label }}</el-tag>
              <el-tag type="primary" size="small">{{ r.category }}</el-tag>
              <span class="lbl">耗时:</span>
              <span>{{ fmtMs(r.duration_ms) }}</span>
            </div>
          </div>
          <div v-else class="row metrics">
            <span class="lbl">本轮无门控监管输出</span>
          </div>
          <div class="row metrics">
            <span class="lbl">命中路由:</span>
            <span>{{ turn.selected_route_id ?? "–" }}</span>
            <template v-if="turn.matched_rule">
              <span class="lbl">命中规则:</span>
              <span
                >{{ turn.matched_rule.referee }} →
                {{ (turn.matched_rule.match ?? []).join(" / ") || "–" }}</span
              >
            </template>
          </div>
        </div>

        <div class="section" v-if="turn.error">
          <h5>错误</h5>
          <pre class="code-block">{{ turn.error }}</pre>
        </div>
      </el-collapse-item>
    </el-collapse>

    <div v-else-if="trace" class="empty">本通话尚无 pipeline_trace 数据。</div>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";

import { callsApi } from "@/api/calls";
import type { PipelineTrace } from "@/types/call";

const props = defineProps<{
  callId: number;
}>();

const trace = ref<PipelineTrace | null>(null);
const loading = ref(false);
const error = ref<string | null>(null);
const openTurns = ref<number[]>([]);

async function onLoad(): Promise<void> {
  loading.value = true;
  error.value = null;
  try {
    trace.value = await callsApi.trace(props.callId);
  } catch (err: unknown) {
    type AxiosLikeError = { response?: { status?: number } };
    const status = (err as AxiosLikeError)?.response?.status;
    if (status === 404) {
      error.value = "后端未提供 pipeline_trace 端点（GET /calls/{id}/trace）";
    } else {
      error.value = "加载 pipeline_trace 失败";
    }
  } finally {
    loading.value = false;
  }
}

function truncate(s: string | null | undefined, n: number): string {
  if (!s) return "";
  return s.length <= n ? s : s.slice(0, n) + "…";
}

function fmtMs(ms: number | null): string {
  return ms === null || ms === undefined ? "–" : `${ms}ms`;
}

defineExpose({ load: onLoad });
</script>

<style scoped>
.trace-panel {
  border: 1px solid var(--el-border-color);
  border-radius: 4px;
  padding: 12px;
}
.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}
.title {
  font-size: 14px;
  font-weight: 600;
}
.alert {
  margin-bottom: 8px;
}
.section {
  margin-top: 12px;
}
.section h5 {
  margin: 0 0 6px 0;
  font-size: 12px;
  color: #606266;
}
.code-block {
  background-color: #f5f7fa;
  border-radius: 3px;
  padding: 6px 8px;
  font-size: 12px;
  white-space: pre-wrap;
  word-break: break-all;
  max-height: 160px;
  overflow: auto;
  margin: 0;
}
.code-inline {
  background-color: #f5f7fa;
  border-radius: 3px;
  padding: 4px 6px;
  font-size: 12px;
  white-space: pre-wrap;
  word-break: break-all;
  max-height: 100px;
  overflow: auto;
  margin: 0;
}
.row {
  margin-bottom: 6px;
}
.metrics {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px 10px;
  font-size: 12px;
  margin-top: 6px;
}
.referee-list {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.lbl {
  font-size: 12px;
  color: #909399;
  display: inline-block;
  margin-right: 6px;
}
.turn-title {
  font-size: 13px;
}
.empty {
  font-size: 12px;
  color: #909399;
}
</style>
