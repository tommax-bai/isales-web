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
          <h5>候选 ({{ turn.role_candidates.length }})</h5>
          <el-table :data="turn.role_candidates" size="small" stripe>
            <el-table-column label="#" type="index" width="48" />
            <el-table-column label="parsed">
              <template #default="{ row }">
                <el-tag v-if="row.parse_failed" type="danger" size="small">
                  parse_failed
                </el-tag>
                <pre v-else class="code-inline">{{ formatJson(row.parsed_json) }}</pre>
              </template>
            </el-table-column>
            <el-table-column prop="tokens_used" label="tokens" width="90" />
            <el-table-column prop="duration_ms" label="ms" width="90" />
            <el-table-column label="" width="60">
              <template #default="{ row }">
                <el-button
                  size="small"
                  link
                  @click="copy(formatJson(row.parsed_json))"
                >
                  复制
                </el-button>
              </template>
            </el-table-column>
          </el-table>
        </div>

        <div class="section">
          <h5>裁判结果 ({{ turn.judge_results.length }})</h5>
          <el-table :data="turn.judge_results" size="small" stripe>
            <el-table-column prop="judge_id" label="judge_id" width="100" />
            <el-table-column prop="candidate_index" label="cand#" width="80" />
            <el-table-column label="通过" width="80">
              <template #default="{ row }">
                <el-tag :type="row.passed ? 'success' : 'danger'" size="small">
                  {{ row.passed ? "通过" : "否决" }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="reason" label="原因" />
          </el-table>
        </div>

        <div class="section" v-if="turn.polish_input || turn.polish_output">
          <h5>润色</h5>
          <div class="row">
            <span class="lbl">input:</span>
            <pre class="code-block">{{ turn.polish_input }}</pre>
          </div>
          <div class="row">
            <span class="lbl">output:</span>
            <pre class="code-block">{{ turn.polish_output }}</pre>
          </div>
        </div>

        <div class="section">
          <h5>最终选中</h5>
          <span>{{
            turn.final_selected_candidate_index === null
              ? "(default_reply)"
              : `候选 #${turn.final_selected_candidate_index}`
          }}</span>
        </div>
      </el-collapse-item>
    </el-collapse>

    <div v-else-if="trace" class="empty">本通话尚无 pipeline_trace 数据。</div>
  </div>
</template>

<script setup lang="ts">
import { ElMessage } from "element-plus";
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

function formatJson(value: unknown): string {
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

async function copy(text: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(text);
    ElMessage.success("已复制");
  } catch {
    ElMessage.warning("复制失败");
  }
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
