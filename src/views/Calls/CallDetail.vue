<template>
  <el-card v-loading="loading">
    <template #header>
      <div class="header">
        <span class="title">通话详情 #{{ id }}</span>
        <el-button @click="onBack">返回</el-button>
      </div>
    </template>
    <div v-if="detail" class="layout">
      <div class="meta">
        <el-descriptions :column="1" border>
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
          <el-descriptions-item v-if="detail.recording_url" label="录音">
            <audio :src="detail.recording_url" controls />
          </el-descriptions-item>
        </el-descriptions>
      </div>
      <div class="timeline">
        <h3>Transcript</h3>
        <TranscriptTimeline :events="detail.transcript" />
      </div>
    </div>
  </el-card>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useRoute, useRouter } from "vue-router";

import { callsApi } from "@/api/calls";
import TranscriptTimeline from "@/components/Calls/TranscriptTimeline.vue";
import type { CallRecordDetail } from "@/types/call";

const route = useRoute();
const router = useRouter();
const id = computed(() => Number(route.params.id));
const detail = ref<CallRecordDetail | null>(null);
const loading = ref(false);

async function load() {
  loading.value = true;
  try {
    detail.value = await callsApi.get(id.value);
  } finally {
    loading.value = false;
  }
}

function onBack() {
  void router.push({ name: "calls" });
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
  grid-template-columns: 360px 1fr;
  gap: 24px;
}
.timeline h3 {
  margin: 0 0 12px 0;
  font-size: 14px;
}
</style>
