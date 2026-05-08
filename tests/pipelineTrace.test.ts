import { mount } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";
import { nextTick } from "vue";

import PipelineTracePanel from "@/components/Calls/PipelineTracePanel.vue";

vi.mock("@/api/calls", () => {
  const traceFn = vi.fn();
  return {
    callsApi: {
      list: () => Promise.resolve([]),
      get: () => Promise.resolve(null),
      trace: traceFn,
    },
  };
});

import { callsApi } from "@/api/calls";

describe("PipelineTracePanel", () => {
  it("does not fetch on mount; only on user click (lazy load)", async () => {
    (callsApi.trace as unknown as { mockClear: () => void }).mockClear();
    const wrapper = mount(PipelineTracePanel, {
      props: { callId: 5 },
      attachTo: document.body,
    });
    await nextTick();
    expect(callsApi.trace).not.toHaveBeenCalled();
    wrapper.unmount();
  });

  it("renders the trace turns when load succeeds", async () => {
    (callsApi.trace as unknown as { mockResolvedValue: (v: unknown) => void })
      .mockResolvedValue({
        call_id: 5,
        turns: [
          {
            turn_id: 1,
            user_input: "你好",
            role_candidates: [],
            judge_results: [],
            polish_input: null,
            polish_output: null,
            final_selected_candidate_index: 0,
            ts: null,
          },
        ],
      });
    const wrapper = mount(PipelineTracePanel, {
      props: { callId: 5 },
      attachTo: document.body,
    });
    await nextTick();
    const exposed = wrapper.vm as unknown as { load: () => Promise<void> };
    await exposed.load();
    await nextTick();
    expect(callsApi.trace).toHaveBeenCalledWith(5);
    expect(wrapper.text()).toContain("你好");
    wrapper.unmount();
  });

  it("shows a friendly fallback when trace endpoint returns 404", async () => {
    (callsApi.trace as unknown as { mockRejectedValueOnce: (v: unknown) => void })
      .mockRejectedValueOnce({ response: { status: 404 } });
    const wrapper = mount(PipelineTracePanel, {
      props: { callId: 5 },
      attachTo: document.body,
    });
    const exposed = wrapper.vm as unknown as { load: () => Promise<void> };
    await exposed.load();
    await nextTick();
    expect(wrapper.text()).toContain("后端未提供 pipeline_trace");
    wrapper.unmount();
  });
});
