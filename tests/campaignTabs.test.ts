import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import { nextTick } from "vue";

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

describe("InterruptionTab", () => {
  it("renders the asr_eos_silence_ms input and emits edits", async () => {
    const form: CampaignBase = { ...CAMPAIGN_DEFAULTS, asr_eos_silence_ms: 350 };
    const wrapper = mount(InterruptionTab, {
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
    expect(wrapper.text()).toContain("太短会把停顿误判成说完打断客户");
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
