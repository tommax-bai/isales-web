import { mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { beforeEach, describe, expect, it } from "vitest";
import { nextTick } from "vue";

import LeadEditDialog from "@/components/Lead/LeadEditDialog.vue";
import type { Lead } from "@/types/lead";

function makeLead(): Lead {
  return {
    id: 9,
    campaign_id: 3,
    name: "张三",
    phone: "13800138000",
    source: "import",
    custom_data: { city: "上海", role: "vip" },
    status: "new",
    retry_count: 0,
    follow_up_count: 0,
    next_call_at: null,
    last_hangup_cause: null,
    created_at: "2026-04-25T10:00:00Z",
    updated_at: "2026-04-25T10:00:00Z",
  };
}

describe("LeadEditDialog", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it("populates form fields from `initial`", async () => {
    const wrapper = mount(LeadEditDialog, {
      props: { modelValue: true, initial: makeLead() },
      attachTo: document.body,
    });
    await nextTick();
    await nextTick();
    const inputs = document.querySelectorAll(".el-dialog input");
    const values = Array.from(inputs).map(
      (n) => (n as HTMLInputElement).value,
    );
    expect(values).toContain("13800138000");
    expect(values).toContain("张三");
    expect(values).toContain("import");
    wrapper.unmount();
  });

  it("renders custom_data into the KV editor", async () => {
    const wrapper = mount(LeadEditDialog, {
      props: { modelValue: true, initial: makeLead() },
      attachTo: document.body,
    });
    await nextTick();
    await nextTick();
    const kvRows = document.querySelectorAll(".kv-row");
    expect(kvRows).toHaveLength(2);
    wrapper.unmount();
  });
});
