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
    expect(wrapper.text()).toContain("尚无门控监管");
    wrapper.unmount();
  });

  it("不再渲染「人设并发上限」控件（已迁入 persona 卡，避免一处配置两个入口）", async () => {
    const form: CampaignBase = { ...CAMPAIGN_DEFAULTS };
    const wrapper = mount(RoutingRulesTab, {
      props: { modelValue: form, roleConfigs: [] },
    });
    await nextTick();
    expect(wrapper.text()).not.toContain("人设并发上限");
    // 门控超时 / 兜底路由仍在
    expect(wrapper.text()).toContain("门控超时");
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

  it("clears goal_type when transition target switches away from goal_achieved (422 fix)", async () => {
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
    const vm = wrapper.vm as unknown as {
      onTransitionTargetChange: (r: unknown, t: string) => void;
    };
    const rule = form.routing_rules[0];
    vm.onTransitionTargetChange(rule, "transfer");
    expect((rule.action as { goal_type?: string | null }).goal_type).toBeNull();
    // switching back restores a default goal_type
    vm.onTransitionTargetChange(rule, "goal_achieved");
    expect((rule.action as { goal_type?: string | null }).goal_type).toBe("appointment");
    wrapper.unmount();
  });

  it("switches action type to route (defaults to first persona) and tool", async () => {
    const persona: RoleConfigRead = { ..._referee("warm", 9), kind: "persona" };
    const form: CampaignBase = {
      ...CAMPAIGN_DEFAULTS,
      tools: { bye: { type: "hangup" } },
      routing_rules: [
        { referee: "a", match: ["X"], action: { type: "transition", to: "transfer" } },
      ],
    };
    const wrapper = mount(RoutingRulesTab, {
      props: { modelValue: form, roleConfigs: [_referee("a", 1), persona] },
    });
    await nextTick();
    const vm = wrapper.vm as unknown as {
      onActionTypeChange: (r: unknown, t: string) => void;
    };
    const rule = form.routing_rules[0];
    vm.onActionTypeChange(rule, "route");
    expect(rule.action).toEqual({ type: "route", to: "warm", then_state: null });
    vm.onActionTypeChange(rule, "tool");
    expect(rule.action).toEqual({ type: "tool", tool: "bye", then_state: null });
    wrapper.unmount();
  });

  it("isHangupTool gates the per-rule closing phrase to hangup tools (§11)", async () => {
    const form: CampaignBase = {
      ...CAMPAIGN_DEFAULTS,
      tools: { bye: { type: "hangup" }, op: { type: "transfer" } },
      routing_rules: [
        {
          referee: "a",
          match: ["OFFENSIVE"],
          action: { type: "tool", tool: "bye", closing_phrase: "不打扰了，再见" },
        },
      ],
    };
    const wrapper = mount(RoutingRulesTab, {
      props: { modelValue: form, roleConfigs: [_referee("a", 1)] },
    });
    await nextTick();
    const vm = wrapper.vm as unknown as { isHangupTool: (a: string) => boolean };
    expect(vm.isHangupTool("bye")).toBe(true); // hangup → phrase input shows
    expect(vm.isHangupTool("op")).toBe(false); // transfer → no phrase
    expect(vm.isHangupTool("missing")).toBe(false);
    // the per-rule closing_phrase rides on the tool action
    expect(
      (form.routing_rules[0].action as { closing_phrase?: string }).closing_phrase,
    ).toBe("不打扰了，再见");
    wrapper.unmount();
  });
});
