import { mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { beforeEach, describe, expect, it } from "vitest";
import { nextTick } from "vue";

import {
  CAMPAIGN_DEFAULTS,
  type CampaignBase,
  type RoleConfigRead,
  type RouteToolAction,
} from "@/types/campaign";
import ToolsTab from "@/views/Campaigns/Tabs/ToolsTab.vue";

function _referee(label: string, id = 1): RoleConfigRead {
  return {
    id,
    campaign_id: 1,
    kind: "referee",
    label,
    model: "gpt-4o-mini",
    current_prompt_version_id: null,
    temperature: 0.5,
    top_p: 1,
    ext_params: {},
    enabled: true,
    created_at: "",
    updated_at: "",
  };
}

interface Vm {
  rows: { keyword: string; phrase: string }[];
  flatReferee: string;
  addRule: () => void;
  removeRule: (i: number) => void;
  rebuild: () => void;
}

function mountTab(form: CampaignBase, referees: RoleConfigRead[] = [_referee("intent", 1)]) {
  const wrapper = mount(ToolsTab, {
    props: { modelValue: form, roleConfigs: referees },
  });
  return { wrapper, vm: wrapper.vm as unknown as Vm };
}

describe("ToolsTab (工具触发 flat surface)", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it("adds a flat hangup rule → routing_rules + auto-managed hangup tool", async () => {
    const form: CampaignBase = { ...CAMPAIGN_DEFAULTS, routing_rules: [], tools: {} };
    const { wrapper, vm } = mountTab(form);
    await nextTick();
    vm.addRule();
    vm.rows[0].keyword = "OFFENSIVE";
    vm.rows[0].phrase = "不打扰了，再见";
    vm.rebuild();
    expect(form.routing_rules).toHaveLength(1);
    const r = form.routing_rules[0];
    expect(r.referee).toBe("intent");
    expect(r.match).toEqual(["OFFENSIVE"]);
    expect(r.action).toEqual({
      type: "tool",
      tool: "hangup",
      then_state: "END",
      closing_phrase: "不打扰了，再见",
    });
    // the shared hangup tool is auto-managed (operator never touches it)
    expect(form.tools.hangup).toEqual({ type: "hangup" });
    wrapper.unmount();
  });

  it("empty phrase → closing_phrase null (direct hangup)", async () => {
    const form: CampaignBase = { ...CAMPAIGN_DEFAULTS, routing_rules: [], tools: {} };
    const { wrapper, vm } = mountTab(form);
    await nextTick();
    vm.addRule();
    vm.rows[0].keyword = "HANGUP";
    vm.rebuild();
    expect((form.routing_rules[0].action as RouteToolAction).closing_phrase).toBeNull();
    wrapper.unmount();
  });

  it("seeds rows + referee from existing hangup rules", async () => {
    const form: CampaignBase = {
      ...CAMPAIGN_DEFAULTS,
      tools: { hangup: { type: "hangup" } },
      routing_rules: [
        {
          referee: "intent",
          match: ["OFFENSIVE"],
          action: { type: "tool", tool: "hangup", then_state: "END", closing_phrase: "不打扰了，再见" },
        },
      ],
    };
    const { wrapper, vm } = mountTab(form);
    await nextTick();
    expect(vm.rows).toEqual([{ keyword: "OFFENSIVE", phrase: "不打扰了，再见" }]);
    expect(vm.flatReferee).toBe("intent");
    wrapper.unmount();
  });

  it("drops empty-keyword rows on rebuild", async () => {
    const form: CampaignBase = { ...CAMPAIGN_DEFAULTS, routing_rules: [], tools: {} };
    const { wrapper, vm } = mountTab(form);
    await nextTick();
    vm.addRule();
    vm.addRule();
    vm.rows[0].keyword = "OFFENSIVE";
    // rows[1].keyword left empty → excluded
    vm.rebuild();
    expect(form.routing_rules).toHaveLength(1);
    expect(form.routing_rules[0].match).toEqual(["OFFENSIVE"]);
    wrapper.unmount();
  });

  it("preserves non-hangup (persona) rules when editing", async () => {
    const personaRule = {
      referee: "intent",
      match: ["WARM"],
      action: { type: "route" as const, to: "warm", then_state: null },
    };
    const form: CampaignBase = {
      ...CAMPAIGN_DEFAULTS,
      tools: { hangup: { type: "hangup" } },
      routing_rules: [
        personaRule,
        {
          referee: "intent",
          match: ["OFFENSIVE"],
          action: { type: "tool", tool: "hangup", then_state: "END", closing_phrase: "再见" },
        },
      ],
    };
    const { wrapper, vm } = mountTab(form);
    await nextTick();
    vm.removeRule(0); // remove the only flat (hangup) row
    expect(form.routing_rules).toHaveLength(1);
    expect(form.routing_rules[0]).toEqual(personaRule); // persona rule untouched
    wrapper.unmount();
  });

  it("referee selector binds new rules to the chosen referee", async () => {
    const form: CampaignBase = { ...CAMPAIGN_DEFAULTS, routing_rules: [], tools: {} };
    const { wrapper, vm } = mountTab(form, [_referee("intent", 1), _referee("reject", 2)]);
    await nextTick();
    vm.flatReferee = "reject";
    vm.addRule();
    vm.rows[0].keyword = "OFFENSIVE";
    vm.rebuild();
    expect(form.routing_rules[0].referee).toBe("reject");
    wrapper.unmount();
  });
});
