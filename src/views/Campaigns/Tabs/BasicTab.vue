<template>
  <el-form label-width="160px" class="basic-form">
    <el-form-item
      label="任务名称"
      :error="fieldErrors?.name"
      required
    >
      <el-input v-model="form.name" placeholder="例如：1 月新客回访" />
    </el-form-item>

    <el-form-item label="音色" :error="fieldErrors?.voice_id">
      <el-select
        v-model="form.voice_id"
        clearable
        :loading="voiceLoading"
        placeholder="选择音色"
        style="width: 320px"
      >
        <el-option
          v-for="v in voices"
          :key="v.id"
          :label="`${v.name} (${v.id})`"
          :value="v.id"
        />
      </el-select>
    </el-form-item>

    <el-form-item label="并发上限" :error="fieldErrors?.concurrency" required>
      <el-input-number v-model="form.concurrency" :min="1" :max="64" />
    </el-form-item>

    <el-form-item label="开场白文案" :error="fieldErrors?.greeting">
      <el-input
        v-model="form.greeting"
        type="textarea"
        :rows="3"
        placeholder="留空则由 LLM 生成开场白"
      />
      <div class="preview-row">
        <el-button
          size="small"
          :loading="previewing"
          :disabled="!greetingFilled || !form.voice_id"
          @click="previewGreeting"
        >
          试听
        </el-button>
        <span v-if="!form.voice_id" class="preview-hint">选好「音色」后可试听</span>
      </div>
      <div class="hint">
        通话接通后引擎播放的第一句话（ai-pipeline §
        "开场白不走管线"）。留空 = 走 LLM 路径。试听用所选音色现合成，确认发音 /
        语气。
      </div>
    </el-form-item>

    <el-form-item label="垫词 (filler)">
      <el-switch v-model="form.filler_enabled" />
      <div class="hint">
        streaming 主链路首音频 ~500ms，filler 仅在用慢模型时建议启用。默认关闭。
      </div>
    </el-form-item>

    <el-form-item
      v-if="form.filler_enabled"
      label="垫词触发延迟 (ms)"
      :error="fieldErrors?.filler_delay_ms"
    >
      <el-input-number
        v-model="form.filler_delay_ms"
        :min="0"
        :step="100"
        placeholder="留空默认 600ms"
      />
      <div class="hint">
        首音频超过此时长还没出，才播一句垫词遮等待；快的轮次不会播。留空使用默认
        600ms。
      </div>
    </el-form-item>

    <el-form-item label="默认回复" :error="fieldErrors?.default_replies">
      <el-input
        v-model="defaultRepliesText"
        type="textarea"
        :rows="3"
        placeholder="每行一句兜底回复"
      />
      <div class="hint">
        main LLM 流式回复失败 / 为空时随机抽取一条作为兜底（按 ai-pipeline spec）。
      </div>
    </el-form-item>

    <el-form-item label="提取字段" :error="fieldErrors?.extraction_fields">
      <el-table :data="form.extraction_fields" stripe size="small">
        <el-table-column label="字段名">
          <template #default="{ row }">
            <el-input v-model="row.name" size="small" />
          </template>
        </el-table-column>
        <el-table-column label="类型" width="160">
          <template #default="{ row }">
            <el-select v-model="row.type" size="small">
              <el-option label="字符串" value="string" />
              <el-option label="数字" value="number" />
              <el-option label="布尔" value="boolean" />
              <el-option label="时间" value="datetime" />
            </el-select>
          </template>
        </el-table-column>
        <el-table-column label="必填" width="90">
          <template #default="{ row }">
            <el-checkbox v-model="row.required" />
          </template>
        </el-table-column>
        <el-table-column label="说明">
          <template #default="{ row }">
            <el-input v-model="row.description" size="small" />
          </template>
        </el-table-column>
        <el-table-column label="操作" width="80">
          <template #default="{ $index }">
            <el-button link type="danger" @click="removeField($index)">
              删除
            </el-button>
          </template>
        </el-table-column>
      </el-table>
      <el-button class="add-btn" size="small" @click="addField">
        + 新增字段
      </el-button>
      <div class="hint">
        声明 role LLM 应抽取的字段（goal-achievement spec）。前端不解析，仅做
        schema 声明。
      </div>
    </el-form-item>
  </el-form>
</template>

<script setup lang="ts">
import { ElMessage } from "element-plus";
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";

import { campaignsApi } from "@/api/campaigns";
import { voiceApi } from "@/api/voice";
import type { CampaignBase, ExtractionField } from "@/types/campaign";
import type { VoiceModel } from "@/types/voice";

const props = defineProps<{
  modelValue: CampaignBase;
  fieldErrors?: Record<string, string>;
}>();

const emit = defineEmits<{
  (e: "update:modelValue", v: CampaignBase): void;
}>();

const form = computed({
  get: () => props.modelValue,
  set: (v) => emit("update:modelValue", v),
});

const voices = ref<VoiceModel[]>([]);
const voiceLoading = ref(false);

onMounted(async () => {
  voiceLoading.value = true;
  try {
    voices.value = await voiceApi.list();
  } catch {
    // Voice list is non-fatal — user can still type a numeric voice_id.
  } finally {
    voiceLoading.value = false;
  }
});

// ── greeting 试听 (campaign-greeting-tts-preview) ─────────────────────────
const greetingFilled = computed(() => Boolean(form.value.greeting?.trim()));
const previewing = ref(false);
let currentAudio: HTMLAudioElement | null = null;

function stopPreview(): void {
  if (currentAudio) {
    currentAudio.pause();
    currentAudio = null;
  }
}

async function previewGreeting(): Promise<void> {
  const text = form.value.greeting?.trim();
  if (!text || !form.value.voice_id) return;
  // form.voice_id is the VoiceModel DB id; the TTS endpoint wants the vendor
  // speaker string — resolve it from the already-loaded voices list.
  const speaker = voices.value.find((v) => v.id === form.value.voice_id)?.voice_id;
  if (!speaker) {
    ElMessage.error("找不到所选音色，请重新选择");
    return;
  }
  stopPreview();
  previewing.value = true;
  try {
    const blob = await campaignsApi.ttsPreview(text, speaker);
    const url = URL.createObjectURL(blob);
    const audio = new Audio(url);
    currentAudio = audio;
    audio.onended = () => {
      URL.revokeObjectURL(url);
      if (currentAudio === audio) currentAudio = null;
    };
    await audio.play();
  } catch {
    ElMessage.error("试听失败，请检查音色凭据或稍后重试");
  } finally {
    previewing.value = false;
  }
}

onBeforeUnmount(stopPreview);

const defaultRepliesText = ref(form.value.default_replies.join("\n"));
watch(
  () => form.value.default_replies,
  (next) => {
    const joined = next.join("\n");
    if (joined !== defaultRepliesText.value) defaultRepliesText.value = joined;
  },
);
watch(defaultRepliesText, (text) => {
  form.value.default_replies = text
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);
});

function addField(): void {
  const f: ExtractionField = { name: "", type: "string", required: false, description: "" };
  form.value.extraction_fields = [...form.value.extraction_fields, f];
}

function removeField(idx: number): void {
  form.value.extraction_fields = form.value.extraction_fields.filter(
    (_, i) => i !== idx,
  );
}
</script>

<style scoped>
.basic-form {
  max-width: 920px;
}
.hint {
  font-size: 12px;
  color: #909399;
  line-height: 1.6;
  margin-top: 4px;
}
.preview-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 8px;
}
.preview-hint {
  font-size: 12px;
  color: #909399;
}
.add-btn {
  margin-top: 8px;
}
</style>
