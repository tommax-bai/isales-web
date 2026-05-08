import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";

import KeyValueEditor from "@/components/Common/KeyValueEditor.vue";

describe("KeyValueEditor", () => {
  it("renders rows from initial modelValue", () => {
    const wrapper = mount(KeyValueEditor, {
      props: { modelValue: { city: "上海", role: "vip" } },
    });
    const rows = wrapper.findAll(".kv-row");
    expect(rows).toHaveLength(2);
  });

  it("addRow adds a fresh row", async () => {
    const wrapper = mount(KeyValueEditor, { props: { modelValue: {} } });
    await wrapper.find("button").trigger("click"); // 添加
    const rows = wrapper.findAll(".kv-row");
    expect(rows).toHaveLength(1);
  });

  it("removes a row when × is clicked", async () => {
    const wrapper = mount(KeyValueEditor, {
      props: { modelValue: { city: "上海", role: "vip" } },
    });
    const removeButtons = wrapper.findAll(".kv-row .el-button");
    await removeButtons[0].trigger("click");
    const rows = wrapper.findAll(".kv-row");
    expect(rows).toHaveLength(1);
    const events = wrapper.emitted("update:modelValue");
    expect(events).toBeTruthy();
    expect(events?.at(-1)?.[0]).toEqual({ role: "vip" });
  });
});
