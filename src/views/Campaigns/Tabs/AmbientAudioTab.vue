<template>
  <p class="tab-intro">
    <Info :size="13" class="tab-intro__icon" />
    <span>给通话叠一层持续的背景环境音，让客户侧有真人坐席的环境感。电平过高会让背景音漏回客户麦克风、干扰识别，建议保持较低并先小范围拨测。</span>
  </p>
  <el-form label-width="200px" class="form">
    <el-form-item label="启用背景音">
      <el-switch v-model="enabled" />
      <div class="hint">关闭＝出向不混背景音（与原来一致）。</div>
    </el-form-item>

    <template v-if="enabled">
      <el-form-item label="场景" :error="fieldErrors?.ambient_audio">
        <el-select v-model="form.ambient_audio" placeholder="选择背景音场景" style="width: 280px">
          <el-option
            v-for="opt in options"
            :key="opt.value"
            :label="opt.label"
            :value="opt.value"
          >
            <span>{{ opt.label }}</span>
            <span class="opt-desc">{{ opt.desc }}</span>
          </el-option>
        </el-select>
        <div class="hint">{{ currentDesc }}</div>
      </el-form-item>

      <el-form-item label="混入电平" :error="fieldErrors?.ambient_gain">
        <el-input-number
          v-model="form.ambient_gain"
          :min="0"
          :max="1"
          :step="0.05"
          :precision="2"
        />
        <div class="hint">背景音相对主语音的音量（0＝无声，0.1≈-20dB）。回声偏大就调低。</div>
      </el-form-item>
    </template>
  </el-form>
</template>

<script setup lang="ts">
import { Info } from "lucide-vue-next";
import { computed, ref } from "vue";

import type { CampaignBase } from "@/types/campaign";
import { AMBIENT_PRESETS } from "@/types/campaign";

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

// Remember the last chosen scene so toggling off → on restores it.
const lastChoice = ref<string | null>(null);

const enabled = computed({
  get: () => !!form.value.ambient_audio,
  set: (on: boolean) => {
    if (on) {
      if (!form.value.ambient_audio) {
        form.value.ambient_audio = lastChoice.value ?? AMBIENT_PRESETS[0].value;
      }
    } else {
      if (form.value.ambient_audio) lastChoice.value = form.value.ambient_audio;
      form.value.ambient_audio = null;
    }
  },
});

// Show preset options; if ops configured a custom asset not in the catalog,
// surface it as an extra option so saving doesn't silently drop it.
const options = computed(() => {
  const cur = form.value.ambient_audio;
  if (cur && !AMBIENT_PRESETS.some((p) => p.value === cur)) {
    return [...AMBIENT_PRESETS, { value: cur, label: cur, desc: "自定义素材" }];
  }
  return AMBIENT_PRESETS;
});

const currentDesc = computed(
  () => options.value.find((o) => o.value === form.value.ambient_audio)?.desc ?? "",
);
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
.opt-desc {
  margin-left: 12px;
  font-size: 12px;
  color: #909399;
}
</style>
