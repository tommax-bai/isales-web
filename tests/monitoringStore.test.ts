import { createPinia, setActivePinia } from "pinia";
import { beforeEach, describe, expect, it } from "vitest";

import { useMonitoringStore, type CallSnapshot } from "@/stores/monitoring";
import type { EngineEvent } from "@/types/engineEvent";

function base(call_record_id: number): {
  schema_version: number;
  message_id: string;
  created_at: string;
  call_record_id: number;
} {
  return {
    schema_version: 1,
    message_id: `msg-${call_record_id}`,
    created_at: "2026-05-08T00:00:00Z",
    call_record_id,
  };
}

describe("monitoring store", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it("creates a snapshot on call_started and updates status", () => {
    const store = useMonitoringStore();
    const ev1: EngineEvent = {
      ...base(1),
      type: "call_started",
      started_at: "2026-05-08T00:00:01Z",
    };
    const ev2: EngineEvent = {
      ...base(1),
      type: "status_changed",
      status: "in_call",
      reason: null,
    };
    store.handleEvent(ev1);
    store.handleEvent(ev2);
    const snap = store.calls.get(1) as CallSnapshot;
    expect(snap.started_at).toBe("2026-05-08T00:00:01Z");
    expect(snap.status).toBe("in_call");
  });

  it("routes asr_partial / asr_final correctly", () => {
    const store = useMonitoringStore();
    store.handleEvent({
      ...base(2),
      type: "asr_partial",
      text: "你",
      timestamp_ms: 100,
    });
    store.handleEvent({
      ...base(2),
      type: "asr_final",
      text: "你好",
      timestamp_ms: 200,
    });
    const snap = store.calls.get(2) as CallSnapshot;
    expect(snap.asr_final).toBe("你好");
    expect(snap.asr_partial).toBe("");
    expect(snap.last_ts_ms).toBe(200);
  });

  it("marks ended_at on call_ended and applies status=end", () => {
    const store = useMonitoringStore();
    store.handleEvent({
      ...base(3),
      type: "call_started",
      started_at: "2026-05-08T00:00:01Z",
    });
    store.handleEvent({
      ...base(3),
      type: "call_ended",
      hangup_cause: "user_hangup",
      ended_at: "2026-05-08T00:00:30Z",
    });
    const snap = store.calls.get(3) as CallSnapshot;
    expect(snap.status).toBe("end");
    expect(snap.ended_at).toBe("2026-05-08T00:00:30Z");
    expect(snap.hangup_cause).toBe("user_hangup");
  });

  it("caps the cache at 16 by evicting the oldest ended call", () => {
    const store = useMonitoringStore();
    // Fill 17 ended calls — 8 active would be excluded from eviction by
    // design, but the test exercises the LRU branch. We tag every call as
    // ended so the eviction logic engages.
    for (let i = 1; i <= 17; i++) {
      store.handleEvent({
        ...base(i),
        type: "call_ended",
        hangup_cause: "test",
        ended_at: `2026-05-08T00:00:${String(i).padStart(2, "0")}Z`,
      });
    }
    expect(store.calls.size).toBe(16);
    // The oldest ended call (id=1, ended_at min) should have been evicted.
    expect(store.calls.has(1)).toBe(false);
    expect(store.calls.has(17)).toBe(true);
  });
});
