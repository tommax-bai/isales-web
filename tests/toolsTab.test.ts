import { mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { beforeEach, describe, expect, it } from "vitest";
import { nextTick } from "vue";

import { CAMPAIGN_DEFAULTS, type CampaignBase } from "@/types/campaign";
import ToolsTab from "@/views/Campaigns/Tabs/ToolsTab.vue";

interface ToolEntry {
  alias: string;
  config: { type: string; closing_phrase?: string | null; interrupt?: boolean };
}
interface Vm {
  entries: ToolEntry[];
  addTool: () => void;
  removeTool: (i: number) => void;
  onTypeChange: (row: ToolEntry, t: string) => void;
  rebuild: () => void;
  duplicateAliases: string[];
}

function mountTab(form: CampaignBase) {
  const wrapper = mount(ToolsTab, { props: { modelValue: form } });
  return { wrapper, vm: wrapper.vm as unknown as Vm };
}

describe("ToolsTab", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it("adds a hangup tool and syncs to modelValue.tools", async () => {
    const form: CampaignBase = { ...CAMPAIGN_DEFAULTS, tools: {} };
    const { wrapper, vm } = mountTab(form);
    await nextTick();
    vm.addTool();
    vm.entries[0].alias = "bye";
    vm.rebuild();
    expect(form.tools.bye).toEqual({ type: "hangup", closing_phrase: "", interrupt: false });
    wrapper.unmount();
  });

  it("seeds entries from existing tools", async () => {
    const form: CampaignBase = {
      ...CAMPAIGN_DEFAULTS,
      tools: { bye: { type: "hangup", closing_phrase: "再见" }, agent: { type: "transfer" } },
    };
    const { wrapper, vm } = mountTab(form);
    await nextTick();
    expect(vm.entries.map((e) => e.alias).sort()).toEqual(["agent", "bye"]);
    wrapper.unmount();
  });

  it("flags duplicate aliases and excludes them from the synced record", async () => {
    const form: CampaignBase = { ...CAMPAIGN_DEFAULTS, tools: {} };
    const { wrapper, vm } = mountTab(form);
    await nextTick();
    vm.addTool();
    vm.addTool();
    vm.entries[0].alias = "dup";
    vm.entries[1].alias = "dup";
    vm.rebuild();
    expect(vm.duplicateAliases).toContain("dup");
    // only the first "dup" survives in the record
    expect(Object.keys(form.tools)).toEqual(["dup"]);
    wrapper.unmount();
  });

  it("onTypeChange transfer drops the phrase fields", async () => {
    const form: CampaignBase = { ...CAMPAIGN_DEFAULTS, tools: {} };
    const { wrapper, vm } = mountTab(form);
    await nextTick();
    vm.addTool();
    vm.entries[0].alias = "agent";
    vm.onTypeChange(vm.entries[0], "transfer");
    expect(form.tools.agent).toEqual({ type: "transfer" });
    expect("closing_phrase" in form.tools.agent).toBe(false);
    wrapper.unmount();
  });

  it("removeTool drops it from the record", async () => {
    const form: CampaignBase = {
      ...CAMPAIGN_DEFAULTS,
      tools: { bye: { type: "hangup" } },
    };
    const { wrapper, vm } = mountTab(form);
    await nextTick();
    vm.removeTool(0);
    expect(Object.keys(form.tools)).toEqual([]);
    wrapper.unmount();
  });
});
