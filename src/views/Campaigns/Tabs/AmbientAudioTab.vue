<template>
  <p class="tab-intro">
    <Info :size="13" class="tab-intro__icon" />
    <span>给通话叠一层持续的背景环境音（如办公室白噪），让客户侧有真人坐席的环境感。留空＝关闭。电平过高会让背景音漏回客户麦克风、干扰识别，建议保持较低。</span>
  </p>
  <el-form label-width="200px" class="form">
    <el-form-item
      label="背景音素材"
      :error="fieldErrors?.ambient_audio"
    >
      <el-input
        v-model="form.ambient_audio"
        clearable
        placeholder="留空＝关闭，例如 office.wav"
        style="width: 320px"
      />
      <div class="hint">服务端背景音素材的文件名（已预处理为 16kHz 单声道）。留空关闭背景音。</div>
    </el-form-item>
    <el-form-item
      label="混入电平"
      :error="fieldErrors?.ambient_gain"
    >
      <el-input-number
        v-model="form.ambient_gain"
        :min="0"
        :max="1"
        :step="0.05"
        :precision="2"
      />
      <div class="hint">背景音相对主语音的音量（0＝无声，0.1≈-20dB）。仅在选了素材时生效。</div>
    </el-form-item>
  </el-form>
</template>

<script setup lang="ts">
import { Info } from "lucide-vue-next";
import { computed } from "vue";

import type { CampaignBase } from "@/types/campaign";

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
</script>

<style scoped>
.form {
  max-width: 720px;
}
.hint {
  font-size: 12px;
  color: #909399;
  line-height: 1.6;
}
</style>
