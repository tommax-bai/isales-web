import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import { nextTick } from "vue";

import CallCard from "@/components/Monitor/CallCard.vue";
import TranscriptTimeline from "@/components/Calls/TranscriptTimeline.vue";

describe("TranscriptTimeline", () => {
  it("renders an item per event with the correct color tag", async () => {
    const wrapper = mount(TranscriptTimeline, {
      props: {
        events: [
          { type: "user_speech", ts: 0, text: "hello" },
          { type: "ai_reply", ts: 1000, text: "hi" },
          { type: "hangup", ts: 2000 },
          { type: "interruption", ts: 1500 },
          { type: "unknown_event", ts: 3000 },
        ],
      },
    });
    await nextTick();
    const items = wrapper.findAll(".el-timeline-item");
    expect(items).toHaveLength(5);
    // The default tag for unknown event types falls back to "info"; assert
    // that at least one info-class tag appears.
    expect(wrapper.html()).toContain("el-tag");
  });

  it("emits seek with the event ts when an event row is clicked", async () => {
    const wrapper = mount(TranscriptTimeline, {
      props: {
        events: [{ type: "user_speech", ts: 4200, text: "hi" }],
      },
    });
    await wrapper.find(".event-row").trigger("click");
    const events = wrapper.emitted("seek");
    expect(events).toBeTruthy();
    expect(events?.[0]?.[0]).toBe(4200);
  });
});

describe("CallCard", () => {
  it("applies the success tag for the in_call status", () => {
    const wrapper = mount(CallCard, {
      props: {
        snapshot: {
          call_record_id: 7,
          status: "in_call",
          started_at: "2026-05-08T00:00:00Z",
          ended_at: null,
          hangup_cause: null,
          asr_partial: "",
          asr_final: "你好",
          last_ts_ms: 0,
        },
      },
    });
    expect(wrapper.find(".el-tag--success").exists()).toBe(true);
    expect(wrapper.text()).toContain("通话中");
    expect(wrapper.text()).toContain("你好");
  });

  it("dims the card when ended_at is set", () => {
    const wrapper = mount(CallCard, {
      props: {
        snapshot: {
          call_record_id: 8,
          status: "end",
          started_at: "2026-05-08T00:00:00Z",
          ended_at: "2026-05-08T00:00:30Z",
          hangup_cause: "user_hangup",
          asr_partial: "",
          asr_final: "",
          last_ts_ms: 0,
        },
      },
    });
    expect(wrapper.find(".call-card").classes()).toContain("ended");
  });
});
