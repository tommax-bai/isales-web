// Mirrors isales_common.schemas.messages.engine_event.EngineEvent
// (discriminated union on `type`).

export interface EngineEventBase {
  schema_version: number;
  message_id: string;
  created_at: string;
  call_record_id: number;
}

export interface StatusChangedEvent extends EngineEventBase {
  type: "status_changed";
  status: string;
  reason: string | null;
}
export interface ASRPartialEvent extends EngineEventBase {
  type: "asr_partial";
  text: string;
  timestamp_ms: number;
}
export interface ASRFinalEvent extends EngineEventBase {
  type: "asr_final";
  text: string;
  timestamp_ms: number;
}
export interface TranscriptAppendedEvent extends EngineEventBase {
  type: "transcript_appended";
  event_type: string;
  ts: number;
}
export interface CallStartedEvent extends EngineEventBase {
  type: "call_started";
  started_at: string;
}
export interface CallEndedEvent extends EngineEventBase {
  type: "call_ended";
  hangup_cause: string;
  ended_at: string;
}

export type EngineEvent =
  | StatusChangedEvent
  | ASRPartialEvent
  | ASRFinalEvent
  | TranscriptAppendedEvent
  | CallStartedEvent
  | CallEndedEvent;
