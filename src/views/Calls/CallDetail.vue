<template>
  <el-card v-loading="loading">
    <template #header>
      <div class="header">
        <span class="title">通话详情 #{{ id }}</span>
        <el-button @click="onBack">返回</el-button>
      </div>
    </template>

    <div v-if="detail" class="layout">
      <div class="col left">
        <h4>基本信息</h4>
        <el-descriptions :column="1" border size="small">
          <el-descriptions-item label="lead_id">{{ detail.lead_id }}</el-descriptions-item>
          <el-descriptions-item label="campaign_id">
            {{ detail.campaign_id }}
          </el-descriptions-item>
          <el-descriptions-item label="开始">{{ detail.started_at }}</el-descriptions-item>
          <el-descriptions-item label="结束">{{ detail.ended_at }}</el-descriptions-item>
          <el-descriptions-item label="时长(s)">{{ detail.duration }}</el-descriptions-item>
          <el-descriptions-item label="状态">{{ detail.status }}</el-descriptions-item>
          <el-descriptions-item label="转人工">
            {{ detail.transfer_status }}
            <span v-if="detail.transfer_reason"> · {{ detail.transfer_reason }}</span>
          </el-descriptions-item>
        </el-descriptions>

        <div v-if="detail.recording_url" class="audio-block">
          <h5>录音</h5>
          <audio ref="audioRef" :src="detail.recording_url" controls />
          <div class="hint">点击右侧 transcript 事件可跳转到对应时间。</div>
        </div>
      </div>

      <div class="col mid">
        <h4>Transcript</h4>
        <TranscriptTimeline :events="detail.transcript" @seek="onSeek" />
      </div>

      <div class="col right">
        <h4>提取字段</h4>
        <el-descriptions
          v-if="extractedEntries.length"
          :column="1"
          border
          size="small"
        >
          <el-descriptions-item
            v-for="entry in extractedEntries"
            :key="entry.key"
            :label="entry.key"
          >
            {{ entry.value }}
          </el-descriptions-item>
        </el-descriptions>
        <div v-else class="empty">暂无</div>

        <div class="trace-section">
          <PipelineTracePanel :call-id="id" />
        </div>
      </div>
    </div>
  </el-card>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useRoute, useRouter } from "vue-router";

import { callsApi } from "@/api/calls";
import PipelineTracePanel from "@/components/Calls/PipelineTracePanel.vue";
import TranscriptTimeline from "@/components/Calls/TranscriptTimeline.vue";
import type { CallRecordDetail } from "@/types/call";

const route = useRoute();
const router = useRouter();
const id = Number(route.params.id);
const detail = ref<CallRecordDetail | null>(null);
const loading = ref(false);
const audioRef = ref<HTMLAudioElement | null>(null);

const extractedEntries = computed(() => {
  const fields = detail.value?.extracted_fields ?? {};
  return Object.entries(fields).map(([key, value]) => ({
    key,
    value: typeof value === "object" ? JSON.stringify(value) : String(value),
  }));
});

async function load() {
  loading.value = true;
  try {
    detail.value = await callsApi.get(id);
  } finally {
    loading.value = false;
  }
}

function onBack() {
  void router.push({ name: "calls" });
}

function onSeek(tsMs: number) {
  // transcript event ts is recorded in milliseconds since call start; the
  // <audio> element seeks in seconds.
  if (!audioRef.value) return;
  audioRef.value.currentTime = Math.max(0, tsMs / 1000);
  void audioRef.value.play();
}

onMounted(load);
</script>

<style scoped>
.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.title {
  font-size: 16px;
  font-weight: 600;
}
.layout {
  display: grid;
  grid-template-columns: 320px 1fr 360px;
  gap: 24px;
}
.col h4 {
  margin: 0 0 12px 0;
  font-size: 14px;
}
.col h5 {
  margin: 8px 0 6px 0;
  font-size: 13px;
}
.audio-block {
  margin-top: 16px;
}
.audio-block audio {
  width: 100%;
}
.hint {
  font-size: 12px;
  color: #909399;
  margin-top: 4px;
}
.empty {
  font-size: 12px;
  color: #909399;
}
.trace-section {
  margin-top: 16px;
}
</style>
