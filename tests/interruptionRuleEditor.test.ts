import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import { nextTick } from "vue";

import InterruptionRuleEditor from "@/views/Campaigns/Tabs/InterruptionRuleEditor.vue";
import InterruptionTab from "@/views/Campaigns/Tabs/InterruptionTab.vue";
import {
  CAMPAIGN_DEFAULTS,
  type AndRule,
  type CampaignBase,
  type InterruptionRule,
  defaultTreeFrom,
  makeRule,
} from "@/types/campaign";

// ---- pure helpers ----------------------------------------------------------

describe("defaultTreeFrom", () => {
  it("mirrors engine default_rule: AND(NOT keyword exact, length>=2, duration)", () => {
    const tree = defaultTreeFrom(["嗯", "好"], 200) as AndRule;
    expect(tree.type).toBe("and");
    expect(tree.rules).toHaveLength(3);
    expect(tree.rules[0]).toEqual({
      type: "not",
      rule: { type: "keyword", values: ["嗯", "好"], match: "exact" },
    });
    expect(tree.rules[1]).toEqual({ type: "length", value: 2 });
    expect(tree.rules[2]).toEqual({ type: "duration", value_ms: 200 });
  });

  it("omits the keyword leaf when whitelist is empty", () => {
    const tree = defaultTreeFrom([], 400) as AndRule;
    expect(tree.rules).toHaveLength(2);
    expect(tree.rules.map((r) => r.type)).toEqual(["length", "duration"]);
  });

  it("does not alias the input whitelist array", () => {
    const wl = ["嗯"];
    const tree = defaultTreeFrom(wl, 200) as AndRule;
    const kw = (tree.rules[0] as { rule: { values: string[] } }).rule;
    kw.values.push("x");
    expect(wl).toEqual(["嗯"]); // original untouched
  });
});

describe("makeRule", () => {
  it("produces legal default shapes per type", () => {
    expect(makeRule("keyword")).toEqual({ type: "keyword", values: [], match: "contains" });
    expect(makeRule("length")).toEqual({ type: "length", value: 2 });
    expect(makeRule("duration")).toEqual({ type: "duration", value_ms: 400 });
    expect(makeRule("none")).toEqual({ type: "none" });
    expect((makeRule("and") as AndRule).rules).toHaveLength(1);
    expect((makeRule("or") as AndRule).rules).toHaveLength(1);
    expect((makeRule("not") as { rule: InterruptionRule }).rule.type).toBe("keyword");
  });
});

// ---- recursive editor component --------------------------------------------

describe("InterruptionRuleEditor", () => {
  it("switching node type rebuilds it as that type's default shape", async () => {
    const wrapper = mount(InterruptionRuleEditor, {
      props: { modelValue: { type: "keyword", values: ["x"], match: "contains" } },
    });
    await nextTick();
    // simulate the type-select change → makeRule('and')
    (wrapper.vm as unknown as { onTypeChange: (t: string) => void }).onTypeChange("and");
    const emitted = wrapper.emitted("update:modelValue");
    expect(emitted).toBeTruthy();
    const next = emitted![0][0] as AndRule;
    expect(next.type).toBe("and");
    expect(next.rules).toHaveLength(1);
    expect("values" in next).toBe(false); // no stale keyword field
    wrapper.unmount();
  });

  it("replaceChild updates one child immutably (no sibling aliasing)", async () => {
    const original: AndRule = {
      type: "and",
      rules: [
        { type: "length", value: 2 },
        { type: "duration", value_ms: 400 },
      ],
    };
    const wrapper = mount(InterruptionRuleEditor, { props: { modelValue: original } });
    await nextTick();
    (
      wrapper.vm as unknown as { replaceChild: (i: number, v: InterruptionRule) => void }
    ).replaceChild(0, { type: "length", value: 5 });
    const next = wrapper.emitted("update:modelValue")![0][0] as AndRule;
    expect((next.rules[0] as { value: number }).value).toBe(5);
    expect(next.rules[1]).toEqual({ type: "duration", value_ms: 400 });
    // original prop object untouched (immutable update)
    expect((original.rules[0] as { value: number }).value).toBe(2);
    expect(next).not.toBe(original);
    expect(next.rules).not.toBe(original.rules);
    wrapper.unmount();
  });

  it("removeChild keeps at least one child", async () => {
    const original: AndRule = { type: "and", rules: [{ type: "length", value: 2 }] };
    const wrapper = mount(InterruptionRuleEditor, { props: { modelValue: original } });
    await nextTick();
    (wrapper.vm as unknown as { removeChild: (i: number) => void }).removeChild(0);
    expect(wrapper.emitted("update:modelValue")).toBeFalsy(); // refused (would empty)
    wrapper.unmount();
  });
});

// ---- InterruptionTab integration -------------------------------------------

describe("InterruptionTab advanced rules", () => {
  it("shows '使用默认规则' + seed button when interruption_rules is null", async () => {
    const form: CampaignBase = { ...CAMPAIGN_DEFAULTS, interruption_rules: null };
    const wrapper = mount(InterruptionTab, { props: { modelValue: form, fieldErrors: {} } });
    await nextTick();
    expect(wrapper.text()).toContain("使用默认规则");
    expect(wrapper.text()).toContain("基于默认规则开始编辑");
    wrapper.unmount();
  });

  it("seedDefault builds a tree from the current whitelist + min_duration", async () => {
    const form: CampaignBase = {
      ...CAMPAIGN_DEFAULTS,
      interruption_rules: null,
      interruption_whitelist: ["嗯", "好"],
      interruption_min_duration_ms: 300,
    };
    const wrapper = mount(InterruptionTab, { props: { modelValue: form, fieldErrors: {} } });
    await nextTick();
    (wrapper.vm as unknown as { seedDefault: () => void }).seedDefault();
    expect(form.interruption_rules).toEqual(defaultTreeFrom(["嗯", "好"], 300));
    wrapper.unmount();
  });

  it("restoreDefault clears the tree back to null", async () => {
    const form: CampaignBase = {
      ...CAMPAIGN_DEFAULTS,
      interruption_rules: { type: "length", value: 3 },
    };
    const wrapper = mount(InterruptionTab, { props: { modelValue: form, fieldErrors: {} } });
    await nextTick();
    (wrapper.vm as unknown as { restoreDefault: () => void }).restoreDefault();
    expect(form.interruption_rules).toBeNull();
    wrapper.unmount();
  });
});
