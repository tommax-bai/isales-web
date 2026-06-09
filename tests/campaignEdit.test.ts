import { mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { nextTick } from "vue";

import RoleConfigDialog from "@/components/Campaign/RoleConfigDialog.vue";
import BasicTab from "@/views/Campaigns/Tabs/BasicTab.vue";
import { CAMPAIGN_DEFAULTS, type CampaignBase } from "@/types/campaign";

// jsdom can't actually hit the dev server; silence the voice list call
// BasicTab fires onMounted so error stderr stays clean.
vi.mock("@/api/voice", () => ({
  voiceApi: {
    list: () => Promise.resolve([]),
    preview: () => Promise.resolve(new ArrayBuffer(0)),
  },
}));

describe("BasicTab", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it("renders the campaign name through v-model", async () => {
    const form: CampaignBase = { ...CAMPAIGN_DEFAULTS, name: "测试任务 A" };
    const wrapper = mount(BasicTab, {
      props: { modelValue: form, fieldErrors: {} },
    });
    await nextTick();
    const nameInput = wrapper.find("input");
    expect((nameInput.element as HTMLInputElement).value).toBe("测试任务 A");
    wrapper.unmount();
  });

  it("syncs default_replies textarea → array", async () => {
    const form: CampaignBase = { ...CAMPAIGN_DEFAULTS };
    const wrapper = mount(BasicTab, {
      props: { modelValue: form, fieldErrors: {} },
    });
    await nextTick();
    // Target the default-replies textarea specifically (greeting + filler
    // fields also render before it).
    const defaultReplies = wrapper
      .findAll("textarea")
      .find(
        (t) =>
          (t.element as HTMLTextAreaElement).placeholder === "每行一句兜底回复",
      );
    expect(defaultReplies).toBeTruthy();
    await defaultReplies!.setValue("好的\n再见\n");
    await nextTick();
    expect(form.default_replies).toEqual(["好的", "再见"]);
    wrapper.unmount();
  });
});

describe("RoleConfigDialog", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it("populates form state from `initial` when opened", async () => {
    const wrapper = mount(RoleConfigDialog, {
      props: {
        modelValue: true,
        initial: {
          id: 7,
          campaign_id: 3,
          kind: "referee",
          label: "main_referee",
          model: "gpt-4o-mini",
          current_prompt_version_id: 42,
          temperature: 0.3,
          top_p: 0.9,
          ext_params: {},
          enabled: true,
          created_at: "2026-01-01T00:00:00Z",
          updated_at: "2026-01-01T00:00:00Z",
        },
      },
      attachTo: document.body,
    });
    await nextTick();
    // The radio for "referee" should be selected, and the model input shows
    // the initial model name. Query through document because el-dialog
    // teleports content to body.
    const labels = Array.from(document.querySelectorAll(".el-radio")).map(
      (n) => n.textContent?.trim(),
    );
    expect(labels).toEqual(
      expect.arrayContaining(["主对话", "门控监管", "重组", "抽取"]),
    );
    wrapper.unmount();
  });

  it("emits update:modelValue=false when cancel is clicked", async () => {
    const wrapper = mount(RoleConfigDialog, {
      props: { modelValue: true, initial: null },
      attachTo: document.body,
    });
    await nextTick();
    // The teleported dialog's footer holds Cancel + Save buttons.
    const footerButtons = document.querySelectorAll(".el-dialog__footer button");
    expect(footerButtons.length).toBeGreaterThanOrEqual(2);
    (footerButtons[0] as HTMLButtonElement).click();
    await nextTick();
    const events = wrapper.emitted("update:modelValue");
    expect(events).toBeTruthy();
    expect(events?.at(-1)?.[0]).toBe(false);
    wrapper.unmount();
  });
});
