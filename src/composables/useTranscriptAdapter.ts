/**
 * useTranscriptAdapter — normalize call_record.transcript JSONB into
 * `{role, text, ts}[]` bubbles.
 *
 * The backend transcript schema is a discriminated union of 13 event types
 * (see isales-common/isales_common/schemas/jsonb/transcript.py). Only events
 * carrying spoken text become bubbles:
 *
 *   AI side (left, blue):  greeting | ai_reply | filler | default_reply_used
 *   Customer side (right): user_speech
 *
 * Control-plane events (interruption, silence_activation, transfer_*,
 * goal_achieved, wrap_up_*, hangup) are filtered out — they're useful for
 * detail / debug views but would clutter a bubble timeline.
 *
 * Robustness: if the input is empty or not an array, we yield []. If an
 * entry doesn't match a known type, it's skipped without throwing — this
 * keeps the UI bullet-proof against schema drift.
 */

export type BubbleRole = "ai" | "customer";

export interface TranscriptBubble {
  role: BubbleRole;
  text: string;
  ts: number;
  type: string;
}

const AI_EVENT_TYPES = new Set([
  "greeting",
  "ai_reply",
  "filler",
  "default_reply_used",
]);

const CUSTOMER_EVENT_TYPES = new Set(["user_speech"]);

function _isTextEvent(value: unknown): value is { type: string; text: string; ts: number } {
  if (value === null || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return typeof v.type === "string" && typeof v.text === "string" && typeof v.ts === "number";
}

export function useTranscriptAdapter() {
  function toBubbles(transcript: unknown): TranscriptBubble[] {
    if (!Array.isArray(transcript)) return [];
    const out: TranscriptBubble[] = [];
    for (const entry of transcript) {
      if (!_isTextEvent(entry)) continue;
      if (AI_EVENT_TYPES.has(entry.type)) {
        out.push({ role: "ai", text: entry.text, ts: entry.ts, type: entry.type });
      } else if (CUSTOMER_EVENT_TYPES.has(entry.type)) {
        out.push({ role: "customer", text: entry.text, ts: entry.ts, type: entry.type });
      }
    }
    out.sort((a, b) => a.ts - b.ts);
    return out;
  }

  function formatTimestamp(ms: number): string {
    const total = Math.floor(ms / 1000);
    const mm = Math.floor(total / 60)
      .toString()
      .padStart(2, "0");
    const ss = (total % 60).toString().padStart(2, "0");
    return `${mm}:${ss}`;
  }

  return { toBubbles, formatTimestamp };
}
