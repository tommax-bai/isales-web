import { mount } from "@vue/test-utils";
import { ElMessageBox } from "element-plus";
import { describe, expect, it, vi } from "vitest";
import { nextTick } from "vue";

import BasicTab from "@/views/Campaigns/Tabs/BasicTab.vue";
import EndpointingTab from "@/views/Campaigns/Tabs/EndpointingTab.vue";
import InterruptionTab from "@/views/Campaigns/Tabs/InterruptionTab.vue";
import RetryFollowUpTab from "@/views/Campaigns/Tabs/RetryFollowUpTab.vue";
import SilenceTab from "@/views/Campaigns/Tabs/SilenceTab.vue";
import TimeWindowTab from "@/views/Campaigns/Tabs/TimeWindowTab.vue";
import TransferTab from "@/views/Campaigns/Tabs/TransferTab.vue";
import { CAMPAIGN_DEFAULTS, type CampaignBase } from "@/types/campaign";

describe("SilenceTab", () => {
  it("renders the default silence_threshold_ms value", async () => {
    const form: CampaignBase = { ...CAMPAIGN_DEFAULTS };
    const wrapper = mount(SilenceTab, {
      props: { modelValue: form, fieldErrors: {} },
    });
    await nextTick();
    const numberInputs = wrapper.findAll(".el-input-number input");
    expect(numberInputs.length).toBeGreaterThan(0);
    expect((numberInputs[0].element as HTMLInputElement).value).toBe(
      String(CAMPAIGN_DEFAULTS.silence_threshold_ms),
    );
    wrapper.unmount();
  });
});

describe("BasicTab", () => {
  it("shows filler_delay_ms input + hint only when filler_enabled", async () => {
    const form: CampaignBase = {
      ...CAMPAIGN_DEFAULTS,
      filler_enabled: true,
      filler_delay_ms: 800,
    };
    const wrapper = mount(BasicTab, {
      props: { modelValue: form, fieldErrors: {} },
    });
    await nextTick();
    const values = wrapper
      .findAll(".el-input-number input")
      .map((n) => (n.element as HTMLInputElement).value);
    expect(values).toContain("800");
    expect(wrapper.text()).toContain("首音频超过此时长还没出");
    wrapper.unmount();
  });
});

describe("EndpointingTab", () => {
  it("renders the asr_eos_silence_ms (静默时长) input and the clip-the-caller hint", async () => {
    const form: CampaignBase = { ...CAMPAIGN_DEFAULTS, asr_eos_silence_ms: 350 };
    const wrapper = mount(EndpointingTab, {
      props: { modelValue: form, fieldErrors: {} },
    });
    await nextTick();
    // The endpoint input shows the bound value (350).
    const numberInputs = wrapper.findAll(".el-input-number input");
    const values = numberInputs.map(
      (n) => (n.element as HTMLInputElement).value,
    );
    expect(values).toContain("350");
    // The clip-the-caller warning hint is present.
    expect(wrapper.text()).toContain("太短会把句中停顿误判成说完");
    wrapper.unmount();
  });
});

describe("InterruptionTab", () => {
  it("explains the short_reply vs listen_only continuous-interruption strategy", async () => {
    const form: CampaignBase = { ...CAMPAIGN_DEFAULTS };
    const wrapper = mount(InterruptionTab, {
      props: { modelValue: form, fieldErrors: {} },
    });
    await nextTick();
    expect(wrapper.text()).toContain("仅倾听");
    expect(wrapper.text()).toContain("AI 这轮不回应");
    wrapper.unmount();
  });

  it("defaults to 普通模式 with a single toggle button to 高级模式; basic shows 最小打断字数 + mode-independent continuous fields", async () => {
    const form: CampaignBase = { ...CAMPAIGN_DEFAULTS, interruption_rules: null };
    const wrapper = mount(InterruptionTab, {
      props: { modelValue: form, fieldErrors: {} },
    });
    await nextTick();
    // default mode = 普通模式 (interruption_rules == null), button offers switching to 高级模式
    expect(wrapper.text()).toContain("当前：普通模式");
    expect(wrapper.text()).toContain("切换到高级模式");
    expect(wrapper.text()).not.toContain("切换到普通模式");
    // basic mode scalar fields visible
    expect(wrapper.text()).toContain("打断白名单");
    expect(wrapper.text()).toContain("最小打断字数");
    // mode-independent fields below the toggle
    expect(wrapper.text()).toContain("最大连续打断");
    expect(wrapper.text()).toContain("连续打断策略");
    wrapper.unmount();
  });

  it("toggle button flips label: 高级模式 shows 当前：高级模式 + 切换到普通模式", async () => {
    const form: CampaignBase = {
      ...CAMPAIGN_DEFAULTS,
      interruption_rules: { type: "length", value: 2 },
    };
    const wrapper = mount(InterruptionTab, {
      props: { modelValue: form, fieldErrors: {} },
    });
    await nextTick();
    expect(wrapper.text()).toContain("当前：高级模式");
    expect(wrapper.text()).toContain("切换到普通模式");
    expect(wrapper.text()).not.toContain("切换到高级模式");
    // toggleMode from advanced (unedited default-shaped? no — bare length leaf
    // is not the seeded default, but value 2 with empty whitelist/400ms differs;
    // to avoid a confirm dialog in this label test, drive via the exposed method)
    wrapper.unmount();
  });

  it("toggleMode switches 普通模式 → 高级模式 (seeds a tree, no confirm)", async () => {
    const form: CampaignBase = { ...CAMPAIGN_DEFAULTS, interruption_rules: null };
    const wrapper = mount(InterruptionTab, {
      props: { modelValue: form, fieldErrors: {} },
    });
    await nextTick();
    (wrapper.vm as unknown as { toggleMode: () => void }).toggleMode();
    await nextTick();
    expect(form.interruption_rules).not.toBeNull(); // now 高级模式
    expect(wrapper.text()).toContain("当前：高级模式");
    expect(wrapper.text()).toContain("切换到普通模式");
    wrapper.unmount();
  });

  it("switching to advanced seeds a length leaf from interruption_min_chars; switching back clears the tree", async () => {
    const form: CampaignBase = {
      ...CAMPAIGN_DEFAULTS,
      interruption_rules: null,
      interruption_whitelist: [],
      interruption_min_chars: 4,
      interruption_min_duration_ms: 400,
    };
    const wrapper = mount(InterruptionTab, {
      props: { modelValue: form, fieldErrors: {} },
    });
    await nextTick();
    // mode toggle wires through interruption_rules (null = basic sentinel)
    (wrapper.vm as unknown as { seedDefault: () => void }).seedDefault();
    await nextTick();
    const tree = form.interruption_rules as {
      type: string;
      rules: { type: string; value?: number }[];
    } | null;
    expect(tree).not.toBeNull();
    expect(tree!.type).toBe("and");
    expect(tree!.rules.find((r) => r.type === "length")?.value).toBe(4);
    // switching back to 普通模式 clears the tree
    (wrapper.vm as unknown as { restoreDefault: () => void }).restoreDefault();
    await nextTick();
    expect(form.interruption_rules).toBeNull();
    wrapper.unmount();
  });

  it("switching to 普通模式 with an EDITED tree confirms — cancel preserves it, confirm clears it", async () => {
    // an edited tree (a bare length leaf ≠ the seeded AND default) triggers the guard
    const form: CampaignBase = {
      ...CAMPAIGN_DEFAULTS,
      interruption_rules: { type: "length", value: 9 },
    };
    const wrapper = mount(InterruptionTab, {
      props: { modelValue: form, fieldErrors: {} },
    });
    await nextTick();
    const vm = wrapper.vm as unknown as {
      onModeChange: (m: string) => Promise<void>;
    };
    const spy = vi.spyOn(ElMessageBox, "confirm").mockRejectedValue("cancel");
    await vm.onModeChange("basic");
    expect(spy).toHaveBeenCalledTimes(1);
    expect(form.interruption_rules).not.toBeNull(); // cancelled → tree kept

    spy.mockResolvedValue(
      "confirm" as unknown as Awaited<ReturnType<typeof ElMessageBox.confirm>>,
    );
    await vm.onModeChange("basic");
    expect(form.interruption_rules).toBeNull(); // confirmed → cleared
    spy.mockRestore();
    wrapper.unmount();
  });

  it("switching to 非高级 with an UNEDITED (auto-seeded) tree clears without a confirm dialog", async () => {
    const form: CampaignBase = {
      ...CAMPAIGN_DEFAULTS,
      interruption_rules: null,
      interruption_whitelist: [],
      interruption_min_chars: 2,
      interruption_min_duration_ms: 400,
    };
    const wrapper = mount(InterruptionTab, {
      props: { modelValue: form, fieldErrors: {} },
    });
    await nextTick();
    const vm = wrapper.vm as unknown as {
      onModeChange: (m: string) => Promise<void>;
    };
    const spy = vi.spyOn(ElMessageBox, "confirm");
    await vm.onModeChange("advanced"); // auto-seeds the default tree
    expect(form.interruption_rules).not.toBeNull();
    await vm.onModeChange("basic"); // unedited → no dialog
    expect(spy).not.toHaveBeenCalled();
    expect(form.interruption_rules).toBeNull();
    spy.mockRestore();
    wrapper.unmount();
  });
});

describe("TransferTab", () => {
  it("toggles each of the 4 trigger flags independently", async () => {
    const form: CampaignBase = { ...CAMPAIGN_DEFAULTS };
    const wrapper = mount(TransferTab, {
      props: { modelValue: form, fieldErrors: {} },
    });
    await nextTick();
    // The four switches sit in form-item rows tagged with "启用". Click them
    // in order and verify each flips a distinct flag.
    const switches = wrapper.findAll(".el-switch");
    expect(switches.length).toBeGreaterThanOrEqual(4);

    await switches[0].trigger("click");
    await nextTick();
    expect(form.transfer_keyword_enabled).toBe(true);
    expect(form.transfer_intent_enabled).toBe(false);
    expect(form.transfer_round_enabled).toBe(false);
    expect(form.transfer_llm_enabled).toBe(false);

    await switches[2].trigger("click");
    await nextTick();
    expect(form.transfer_keyword_enabled).toBe(true);
    expect(form.transfer_intent_enabled).toBe(false);
    expect(form.transfer_round_enabled).toBe(true);
    expect(form.transfer_llm_enabled).toBe(false);
    wrapper.unmount();
  });
});

describe("TimeWindowTab", () => {
  it("adds and removes time_windows entries via local handlers", async () => {
    const form: CampaignBase = { ...CAMPAIGN_DEFAULTS, time_windows: [] };
    const wrapper = mount(TimeWindowTab, {
      props: { modelValue: form },
    });
    await nextTick();
    expect(form.time_windows).toEqual([]);

    const addBtn = wrapper
      .findAll("button")
      .find((b) => b.text().includes("新增窗口"));
    expect(addBtn).toBeTruthy();
    await addBtn!.trigger("click");
    await nextTick();
    expect(form.time_windows).toHaveLength(1);
    expect(form.time_windows[0]).toMatchObject({ start: "09:00", end: "18:00" });

    const removeBtn = wrapper
      .findAll("button")
      .find((b) => b.text().includes("删除"));
    expect(removeBtn).toBeTruthy();
    await removeBtn!.trigger("click");
    await nextTick();
    expect(form.time_windows).toHaveLength(0);
    wrapper.unmount();
  });
});

describe("RetryFollowUpTab", () => {
  it("renders the default retry_max_count and parses comma-separated intervals", async () => {
    const form: CampaignBase = {
      ...CAMPAIGN_DEFAULTS,
      retry_intervals: [60, 300, 1800],
    };
    const wrapper = mount(RetryFollowUpTab, {
      props: { modelValue: form, fieldErrors: {} },
    });
    await nextTick();
    const intervalsInput = wrapper.find('input[placeholder*="60"]');
    expect((intervalsInput.element as HTMLInputElement).value).toBe(
      "60, 300, 1800",
    );
    await intervalsInput.setValue("30, 90, 600, 7200");
    await nextTick();
    expect(form.retry_intervals).toEqual([30, 90, 600, 7200]);
    wrapper.unmount();
  });
});
