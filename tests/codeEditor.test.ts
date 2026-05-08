import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import { nextTick } from "vue";

import CodeEditor from "@/components/Common/CodeEditor.vue";

// CodeMirror 6 needs a real DOM range; jsdom supplies enough surface for
// EditorView to mount and dispatch transactions.

describe("CodeEditor", () => {
  it("renders the initial modelValue into the editor doc (json mode)", async () => {
    const wrapper = mount(CodeEditor, {
      attachTo: document.body,
      props: { modelValue: '{"a": 1}', mode: "json", height: 100 },
    });
    await nextTick();
    expect(wrapper.element.textContent).toContain('{"a": 1}');
    wrapper.unmount();
  });

  it("syncs external modelValue changes into the doc and breaks the loop", async () => {
    const wrapper = mount(CodeEditor, {
      attachTo: document.body,
      props: { modelValue: '{"a":1}', mode: "json", height: 100 },
    });
    await nextTick();
    await wrapper.setProps({ modelValue: '{"b":2}' });
    await nextTick();
    // The doc must reflect the new external value; the inner equality guard
    // prevents the watcher from firing again (no second emit for the same
    // value).
    expect(wrapper.element.textContent).toContain('{"b":2}');
    const events = wrapper.emitted("update:modelValue") ?? [];
    const matches = events.filter((e) => e[0] === '{"b":2}');
    expect(matches.length).toBeLessThanOrEqual(1);
    wrapper.unmount();
  });

  it("re-renders without throwing when mode toggles to jinja2", async () => {
    const wrapper = mount(CodeEditor, {
      attachTo: document.body,
      props: { modelValue: "Hello {{ name }}!", mode: "jinja2", height: 100 },
    });
    await nextTick();
    await wrapper.setProps({ mode: "json" });
    await nextTick();
    await wrapper.setProps({ mode: "jinja2" });
    await nextTick();
    expect(wrapper.element.textContent).toContain("Hello");
    wrapper.unmount();
  });
});
