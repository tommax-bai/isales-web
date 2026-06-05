import { mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { beforeEach, describe, expect, it } from "vitest";
import { nextTick } from "vue";

import {
  CAMPAIGN_DEFAULTS,
  type CampaignBase,
  type RoleConfigRead,
} from "@/types/campaign";
import RoutingRulesTab from "@/views/Campaigns/Tabs/RoutingRulesTab.vue";

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

describe("RoutingRulesTab", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it("disables add + warns when there are no referees", async () => {
    const form: CampaignBase = { ...CAMPAIGN_DEFAULTS };
    const wrapper = mount(RoutingRulesTab, {
      props: { modelValue: form, roleConfigs: [] },
    });
    await nextTick();
    expect(wrapper.text()).toContain("尚无裁判");
    wrapper.unmount();
  });

  it("adds a default rule bound to the first referee", async () => {
    const form: CampaignBase = { ...CAMPAIGN_DEFAULTS, routing_rules: [] };
    const wrapper = mount(RoutingRulesTab, {
      props: {
        modelValue: form,
        roleConfigs: [_referee("intent", 1), _referee("reject", 2)],
      },
    });
    await nextTick();
    // The component's addRule pushes into the (shared) reactive form.
    (wrapper.vm as unknown as { addRule: () => void }).addRule();
    expect(form.routing_rules).toHaveLength(1);
    expect(form.routing_rules[0].referee).toBe("intent");
    expect(form.routing_rules[0].action.type).toBe("transition");
    wrapper.unmount();
  });

  it("reorders rules with move()", async () => {
    const form: CampaignBase = {
      ...CAMPAIGN_DEFAULTS,
      routing_rules: [
        { referee: "a", match: ["X"], action: { type: "restructure", source: "last_reply" } },
        { referee: "b", match: ["Y"], action: { type: "transition", to: "transfer" } },
      ],
    };
    const wrapper = mount(RoutingRulesTab, {
      props: { modelValue: form, roleConfigs: [_referee("a", 1), _referee("b", 2)] },
    });
    await nextTick();
    (wrapper.vm as unknown as { move: (i: number, d: number) => void }).move(0, 1);
    expect(form.routing_rules.map((r) => r.referee)).toEqual(["b", "a"]);
    wrapper.unmount();
  });

  it("switches action type between transition and restructure", async () => {
    const form: CampaignBase = {
      ...CAMPAIGN_DEFAULTS,
      routing_rules: [
        { referee: "a", match: ["X"], action: { type: "transition", to: "goal_achieved", goal_type: "appointment" } },
      ],
    };
    const wrapper = mount(RoutingRulesTab, {
      props: { modelValue: form, roleConfigs: [_referee("a", 1)] },
    });
    await nextTick();
    (wrapper.vm as unknown as { onActionTypeChange: (r: unknown, t: string) => void }).onActionTypeChange(
      form.routing_rules[0],
      "restructure",
    );
    expect(form.routing_rules[0].action).toEqual({ type: "restructure", source: "last_reply" });
    wrapper.unmount();
  });
});
