import { flushPromises, mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { beforeEach, describe, expect, it, vi } from "vitest";

import CampaignDetail from "@/views/Campaigns/CampaignDetail.vue";
import type { CampaignNestedUpdate } from "@/types/campaign";

vi.mock("vue-router", async (importOriginal) => ({
  ...(await importOriginal<typeof import("vue-router")>()),
  useRoute: () => ({ params: { id: "3" } }),
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock("@/api/voice", () => ({
  voiceApi: { list: () => Promise.resolve([]) },
}));

// Hoisted so the (hoisted) vi.mock factory can reference them. A detail carrying
// the self-managed children (role_configs / filler_sets / callback_configs) that
// buildPayload MUST strip so a scalar save doesn't children-replace-clobber them.
const { DETAIL, updateSpy } = vi.hoisted(() => {
  const DETAIL = {
    id: 3,
    name: "测试场景",
    concurrency: 2,
    voice_id: "v1",
    greeting: "你好",
    filler_enabled: false,
    filler_delay_ms: null,
    time_windows: [],
    routing_rules: [],
    tools: {},
    role_configs: [
      { id: 1, campaign_id: 3, kind: "referee", label: "intent", model: "m", current_prompt_version_id: null, temperature: 0.5, top_p: 1, ext_params: {}, enabled: true, created_at: "", updated_at: "" },
    ],
    filler_sets: [{ id: 1, name: "s", sort_order: 0, phrases: [] }],
    callback_configs: [{ id: 9 }],
  };
  return { DETAIL, updateSpy: vi.fn(() => Promise.resolve(DETAIL)) };
});

vi.mock("@/api/campaigns", () => ({
  campaignsApi: {
    get: () => Promise.resolve(DETAIL),
    progress: () => Promise.resolve({ campaign_id: 3, total: 0, status_counts: {}, is_active: false }),
    update: updateSpy,
    ttsPreview: () => Promise.resolve(new Blob()),
    start: vi.fn(),
    pause: vi.fn(),
  },
  ttsPreviewError: () => "tts err",
}));

const STUBS = [
  "PromptTierEditor",
  "FillerEditor",
  "RoutingRulesTab",
  "ToolsTab",
  "SilenceTab",
  "InterruptionTab",
  "TransferTab",
  "WrapUpTab",
  "RetryFollowUpTab",
  "DoNotCallTab",
  "CallbacksTab",
].reduce<Record<string, boolean>>((acc, k) => ((acc[k] = true), acc), {});

interface Vm {
  form: Record<string, unknown> & { greeting: string | null };
  roleConfigs: { label: string }[];
  buildPayload: () => CampaignNestedUpdate;
}

async function mountDetail() {
  const wrapper = mount(CampaignDetail, { global: { stubs: STUBS } });
  await flushPromises(); // resolve onRefresh (get + progress)
  return { wrapper, vm: wrapper.vm as unknown as Vm };
}

describe("CampaignDetail (single-page scene config)", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    updateSpy.mockClear();
  });

  it("loads the full campaign into form + roleConfigs", async () => {
    const { wrapper, vm } = await mountDetail();
    expect(vm.form.name).toBe("测试场景");
    expect(vm.form.concurrency).toBe(2);
    expect(vm.roleConfigs.map((r) => r.label)).toEqual(["intent"]);
    wrapper.unmount();
  });

  it("buildPayload strips self-managed children (no clobber) + normalizes empty greeting", async () => {
    const { wrapper, vm } = await mountDetail();
    vm.form.greeting = "   "; // whitespace-only → null
    const payload = vm.buildPayload();
    expect("role_configs" in payload).toBe(false);
    expect("filler_sets" in payload).toBe(false);
    expect("callback_configs" in payload).toBe(false);
    expect(payload.greeting).toBeNull();
    expect(payload.name).toBe("测试场景"); // scalar fields ride along
    wrapper.unmount();
  });

  it("renders all 9 form-driven section titles on one page", async () => {
    const { wrapper } = await mountDetail();
    const text = wrapper.text();
    for (const title of [
      "门控路由", "工具触发", "沉默激活", "打断保护",
      "转人工", "收尾", "重试 / 跟进", "勿打", "回调",
    ]) {
      expect(text).toContain(title);
    }
    // the old cross-page jump is gone
    expect(text).not.toContain("高级配置");
    wrapper.unmount();
  });
});
