import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import { nextTick } from "vue";

import FillerSetDialog from "@/components/Campaign/FillerSetDialog.vue";
import type { FillerSetRead } from "@/types/campaign";

function makeInitial(): FillerSetRead {
  return {
    id: 5,
    campaign_id: 3,
    name: "思考",
    sort_order: 1,
    phrases: [
      {
        id: 11,
        filler_set_id: 5,
        phrase: "嗯",
        audio_url: null,
        generation_status: "pending",
        created_at: "2026-01-01T00:00:00Z",
        updated_at: "2026-01-01T00:00:00Z",
      },
    ],
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
  };
}

describe("FillerSetDialog", () => {
  it("renders the initial set name in the form", async () => {
    const wrapper = mount(FillerSetDialog, {
      props: { modelValue: true, initial: makeInitial() },
      attachTo: document.body,
    });
    await nextTick();
    await nextTick();
    const inputs = document.querySelectorAll(".el-dialog input");
    const values = Array.from(inputs).map(
      (n) => (n as HTMLInputElement).value,
    );
    expect(values).toContain("思考");
    wrapper.unmount();
  });

  it("CRUD: 新增 then 删除 a phrase keeps the form in sync", async () => {
    const wrapper = mount(FillerSetDialog, {
      props: { modelValue: true, initial: makeInitial() },
      attachTo: document.body,
    });
    await nextTick();
    await nextTick();

    const addBtn = Array.from(document.querySelectorAll("button")).find((b) =>
      b.textContent?.trim().startsWith("+ 新增"),
    );
    expect(addBtn).toBeTruthy();
    (addBtn as HTMLButtonElement).click();
    await nextTick();
    await nextTick();

    // After adding, the underlying form.phrases should now hold 2 entries.
    const vm = wrapper.vm as unknown as {
      form: { phrases: { phrase: string }[] };
    };
    expect(vm.form.phrases).toHaveLength(2);

    // Remove the first phrase via the danger button in the table.
    const deleteBtns = Array.from(document.querySelectorAll("button")).filter(
      (b) => b.textContent?.trim() === "删除",
    );
    expect(deleteBtns.length).toBeGreaterThanOrEqual(1);
    (deleteBtns[0] as HTMLButtonElement).click();
    await nextTick();
    expect(vm.form.phrases).toHaveLength(1);
    wrapper.unmount();
  });
});
