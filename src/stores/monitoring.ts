import { defineStore } from "pinia";
import { computed, reactive, ref } from "vue";

import type { EngineEvent } from "@/types/engineEvent";

export interface CallSnapshot {
  call_record_id: number;
  status: string;
  started_at: string | null;
  ended_at: string | null;
  hangup_cause: string | null;
  asr_partial: string;
  asr_final: string;
  last_ts_ms: number;
}

export const useMonitoringStore = defineStore("monitoring", () => {
  const calls = reactive<Map<number, CallSnapshot>>(new Map());
  const connected = ref(false);

  function handleEvent(event: EngineEvent): void {
    const id = event.call_record_id;
    const existing = calls.get(id);
    const snap: CallSnapshot = existing ?? {
      call_record_id: id,
      status: "init",
      started_at: null,
      ended_at: null,
      hangup_cause: null,
      asr_partial: "",
      asr_final: "",
      last_ts_ms: 0,
    };

    switch (event.type) {
      case "status_changed":
        snap.status = event.status;
        break;
      case "asr_partial":
        snap.asr_partial = event.text;
        snap.last_ts_ms = event.timestamp_ms;
        break;
      case "asr_final":
        snap.asr_final = event.text;
        snap.asr_partial = "";
        snap.last_ts_ms = event.timestamp_ms;
        break;
      case "call_started":
        snap.started_at = event.started_at;
        break;
      case "call_ended":
        snap.ended_at = event.ended_at;
        snap.hangup_cause = event.hangup_cause;
        snap.status = "end";
        break;
      case "transcript_appended":
        // Cheap progress signal; no UI surface beyond updating last_ts_ms.
        snap.last_ts_ms = event.ts;
        break;
      default: {
        const exhaustive: never = event;
        console.warn("ws:unknown_event_type", exhaustive);
      }
    }

    calls.set(id, snap);

    // Cap to 16 cards (8 active + 8 ended) so the DOM stays small.
    if (calls.size > 16) {
      const oldest = [...calls.values()]
        .filter((c) => c.ended_at !== null)
        .sort((a, b) => (a.ended_at ?? "").localeCompare(b.ended_at ?? ""))[0];
      if (oldest) calls.delete(oldest.call_record_id);
    }
  }

  function setConnected(value: boolean): void {
    connected.value = value;
  }

  function reset(): void {
    calls.clear();
    connected.value = false;
  }

  const sortedCalls = computed(() =>
    [...calls.values()].sort(
      (a, b) =>
        (a.ended_at ? 1 : 0) - (b.ended_at ? 1 : 0) ||
        (b.started_at ?? "").localeCompare(a.started_at ?? ""),
    ),
  );

  return { calls, connected, sortedCalls, handleEvent, setConnected, reset };
});
