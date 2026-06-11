import { flushPromises, mount } from "@vue/test-utils";
import { MessageSquare } from "lucide-vue-next";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { nextTick } from "vue";

import PromptTierEditor from "@/components/Campaign/PromptTierEditor.vue";
import type { RoleConfig } from "@/types/config";

// Spies hoisted so the vi.mock factories can reference them.
const {
  listSpy,
  createSpy,
  updateSpy,
  removeSpy,
  pvCreateSpy,
  pvUpdateSpy,
  campaignUpdateSpy,
  msg,
} = vi.hoisted(() => ({
  listSpy: vi.fn(),
  createSpy: vi.fn(),
  updateSpy: vi.fn(),
  removeSpy: vi.fn(),
  pvCreateSpy: vi.fn(),
  pvUpdateSpy: vi.fn(),
  campaignUpdateSpy: vi.fn(),
  msg: { success: vi.fn(), error: vi.fn(), warning: vi.fn() },
}));

vi.mock("@/api/roleConfigs", () => ({
  roleConfigsApi: {
    list: listSpy,
    create: createSpy,
    update: updateSpy,
    remove: removeSpy,
    get: vi.fn(),
  },
}));
vi.mock("@/api/campaigns", () => ({
  campaignsApi: { update: campaignUpdateSpy },
}));
vi.mock("@/api/promptVersions", () => ({
  promptVersionsApi: { get: vi.fn(), create: pvCreateSpy, update: pvUpdateSpy },
}));
vi.mock("element-plus", async (importOriginal) => ({
  ...(await importOriginal<typeof import("element-plus")>()),
  ElMessage: msg,
}));

function rc(over: Partial<RoleConfig>): RoleConfig {
  return {
    id: 1,
    campaign_id: 1,
    kind: "referee",
    label: null,
    model: "m",
    current_prompt_version_id: null,
    temperature: 0.5,
    top_p: 1,
    ext_params: {},
    enabled: true,
    created_at: "",
    updated_at: "",
    ...over,
  };
}

interface Vm {
  rows: { name: string; enabled: boolean; model: string; prompt: string }[];
  addRow: () => void;
  saveRow: (i: number) => Promise<void>;
  removeRow: (i: number) => Promise<void>;
}

function mountEditor(props: Record<string, unknown>) {
  return mount(PromptTierEditor, {
    props: {
      campaignId: 1,
      kind: "referee",
      title: "T",
      icon: MessageSquare,
      badgeColor: "blue",
      ...props,
    },
  });
}

describe("PromptTierEditor — main lock + labeled + persona", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    listSpy.mockResolvedValue([]);
    createSpy.mockResolvedValue({ id: 5 });
    updateSpy.mockResolvedValue({});
    removeSpy.mockResolvedValue(undefined);
    pvCreateSpy.mockResolvedValue({ id: 10 });
    pvUpdateSpy.mockResolvedValue({});
    campaignUpdateSpy.mockResolvedValue({});
  });

  it("main 卡：无 enable 开关 / 删除 / 新增 / 标识，且 load 自动补一条可编辑行", async () => {
    const w = mountEditor({ kind: "main", isMain: true });
    await flushPromises();
    expect(w.find(".el-switch").exists()).toBe(false);
    expect(w.find(".cfg__name").exists()).toBe(false);
    expect(w.find("button.el-button--danger").exists()).toBe(false);
    expect(w.findAll("button").some((b) => b.text().includes("新增"))).toBe(false);
    expect((w.vm as unknown as Vm).rows).toHaveLength(1);
    w.unmount();
  });

  it("referee 卡（非 main）：保留 enable 开关 + 新增 + 删除（回归）", async () => {
    listSpy.mockResolvedValue([rc({ kind: "referee", label: "intent" })]);
    const w = mountEditor({ kind: "referee", labeled: true });
    await flushPromises();
    expect(w.find(".el-switch").exists()).toBe(true);
    expect(w.find("button.el-button--danger").exists()).toBe(true);
    expect(w.findAll("button").some((b) => b.text().includes("新增"))).toBe(true);
    // labeled：标识来自顶层 label，而非 ext_params.name
    expect((w.vm as unknown as Vm).rows[0].name).toBe("intent");
    w.unmount();
  });

  it("main 保存强制 enabled=true 且不带 label", async () => {
    const w = mountEditor({ kind: "main", isMain: true });
    await flushPromises();
    const vm = w.vm as unknown as Vm;
    vm.rows[0].model = "doubao-pro";
    vm.rows[0].prompt = "hi";
    await vm.saveRow(0);
    expect(createSpy).toHaveBeenCalledWith(
      expect.objectContaining({ kind: "main", enabled: true }),
    );
    expect(createSpy.mock.calls[0][0]).not.toHaveProperty("label");
    w.unmount();
  });

  it("labeled 保存把标识写进顶层 label", async () => {
    const w = mountEditor({ kind: "persona", labeled: true });
    await flushPromises();
    const vm = w.vm as unknown as Vm;
    vm.addRow();
    vm.rows[0].name = "warm";
    vm.rows[0].enabled = false; // 无 cap prop，cap 检查跳过
    await vm.saveRow(0);
    expect(createSpy).toHaveBeenCalledWith(
      expect.objectContaining({ kind: "persona", label: "warm" }),
    );
    w.unmount();
  });

  it("restructure 卡（singleton 非 labeled）：保存 kind=restructure + provider 进 ext_params + 不带 label", async () => {
    const w = mountEditor({ kind: "restructure", singleton: true });
    await flushPromises();
    // singleton 在后端无配置时自动补一条可编辑行（solo 行为，同 extractor）
    const vm = w.vm as unknown as Vm & {
      rows: { model: string; prompt: string; provider: string }[];
    };
    expect(vm.rows).toHaveLength(1);
    vm.rows[0].model = "qwen-plus";
    vm.rows[0].prompt = "把这句话口语化重说一遍";
    vm.rows[0].provider = "dashscope";
    await vm.saveRow(0);
    expect(createSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        kind: "restructure",
        ext_params: expect.objectContaining({ provider: "dashscope" }),
      }),
    );
    // 非 labeled → 不写顶层 label（restructure 走内建路由，不需标识）
    expect(createSpy.mock.calls[0][0]).not.toHaveProperty("label");
    w.unmount();
  });

  it("persona：空标识拦截保存", async () => {
    const w = mountEditor({ kind: "persona", labeled: true });
    await flushPromises();
    const vm = w.vm as unknown as Vm;
    vm.addRow(); // name = ""
    await vm.saveRow(0);
    expect(msg.error).toHaveBeenCalled();
    expect(createSpy).not.toHaveBeenCalled();
    w.unmount();
  });

  it("persona：标识重复拦截保存", async () => {
    const w = mountEditor({ kind: "persona", labeled: true });
    await flushPromises();
    const vm = w.vm as unknown as Vm;
    vm.addRow();
    vm.rows[0].name = "warm";
    vm.addRow();
    vm.rows[1].name = "warm";
    await vm.saveRow(1);
    expect(msg.error).toHaveBeenCalled();
    expect(createSpy).not.toHaveBeenCalled();
    w.unmount();
  });

  it("persona：启用超并发上限拦截保存", async () => {
    listSpy.mockResolvedValue([
      rc({ kind: "persona", label: "a", id: 1, enabled: true }),
    ]);
    const w = mountEditor({ kind: "persona", labeled: true, personaFanoutCap: 1 });
    await flushPromises();
    const vm = w.vm as unknown as Vm;
    // 1 (main) + 1 (enabled persona) > cap 1
    await vm.saveRow(0);
    expect(msg.error).toHaveBeenCalled();
    expect(updateSpy).not.toHaveBeenCalled();
    w.unmount();
  });

  it("persona：删除被路由规则引用的人设被拦截", async () => {
    listSpy.mockResolvedValue([
      rc({ kind: "persona", label: "warm", id: 7 }),
    ]);
    const w = mountEditor({
      kind: "persona",
      labeled: true,
      routingRules: [
        {
          referee: "intent",
          match: ["WARM"],
          action: { type: "route", to: "warm", then_state: null },
        },
      ],
    });
    await flushPromises();
    const vm = w.vm as unknown as Vm;
    await vm.removeRow(0);
    expect(msg.warning).toHaveBeenCalled();
    expect(removeSpy).not.toHaveBeenCalled();
    w.unmount();
  });

  it("persona：删除未被引用的人设成功", async () => {
    listSpy.mockResolvedValue([
      rc({ kind: "persona", label: "warm", id: 7 }),
    ]);
    const w = mountEditor({ kind: "persona", labeled: true, routingRules: [] });
    await flushPromises();
    const vm = w.vm as unknown as Vm;
    await vm.removeRow(0);
    expect(removeSpy).toHaveBeenCalledWith(7);
    w.unmount();
  });

  it("collapsible(persona)：cap=1 收起、cap≥2 展开露出配置体 + 并发上限控件", async () => {
    listSpy.mockResolvedValue([rc({ kind: "persona", label: "warm", id: 3 })]);
    const w = mountEditor({
      kind: "persona",
      labeled: true,
      collapsible: true,
      personaFanoutCap: 1,
    });
    await flushPromises();
    // 关(cap=1)：title 在、有功能开关、配置体(.cfg)/新增/并发上限控件不渲染
    expect(w.find(".tier__title").text()).toContain("T");
    expect(w.find(".tier__toggle").exists()).toBe(true);
    expect(w.find(".cfg").exists()).toBe(false);
    expect(w.find(".tier__fanout").exists()).toBe(false);
    expect(w.findAll("button").some((b) => b.text().includes("新增"))).toBe(false);
    // 开(cap≥2)：展开，配置体 + 卡内「人设并发上限」控件出现
    await w.setProps({ personaFanoutCap: 2 });
    expect(w.find(".cfg").exists()).toBe(true);
    expect(w.find(".tier__fanout").exists()).toBe(true);
    w.unmount();
  });

  it("persona 卡头开关即功能开关：开→写 cap=2（emit persona_fanout_cap）", async () => {
    const w = mountEditor({
      kind: "persona",
      labeled: true,
      collapsible: true,
      personaFanoutCap: 1,
    });
    await flushPromises();
    const vm = w.vm as unknown as { personaOn: boolean };
    expect(vm.personaOn).toBe(false); // cap=1 → 开关「关」
    vm.personaOn = true; // 切「开」
    await nextTick();
    expect(w.emitted("update:personaFanoutCap")?.at(-1)).toEqual([2]);
    w.unmount();
  });

  it("persona 卡头开关关闭：写 cap=1（emit persona_fanout_cap）", async () => {
    const w = mountEditor({
      kind: "persona",
      labeled: true,
      collapsible: true,
      personaFanoutCap: 3,
    });
    await flushPromises();
    const vm = w.vm as unknown as { personaOn: boolean };
    expect(vm.personaOn).toBe(true); // cap=3 → 开关「开」
    vm.personaOn = false; // 切「关」
    await nextTick();
    expect(w.emitted("update:personaFanoutCap")?.at(-1)).toEqual([1]);
    w.unmount();
  });

  it("persona 卡头开关切换即时落库 persona_fanout_cap（campaign PATCH，对齐同卡即时保存）", async () => {
    const w = mountEditor({
      kind: "persona",
      labeled: true,
      collapsible: true,
      personaFanoutCap: 1,
    });
    await flushPromises();
    // 用户点开关 → 切「开」(cap=2) → @change 即时 PATCH，不依赖底部保存条
    await w.find(".tier__toggle").trigger("click");
    await flushPromises();
    expect(campaignUpdateSpy).toHaveBeenCalledWith(1, { persona_fanout_cap: 2 });
    w.unmount();
  });
});
