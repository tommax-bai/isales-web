export interface CallRecordSummary {
  id: number;
  lead_id: number;
  campaign_id: number;
  caller_id: string | null;
  status: string;
  started_at: string | null;
  ended_at: string | null;
  duration: number | null;
  recording_url: string | null;
  transfer_status: string;
  transfer_reason: string | null;
}

export interface CallSummary {
  id: number;
  call_record_id: number;
  summary_text: string | null;
  extracted_fields: Record<string, unknown>;
  goal_achieved: boolean;
  goal_type: string | null;
  created_at: string;
  updated_at: string;
}

export interface TranscriptEvent {
  type: string;
  ts: number;
  [key: string]: unknown;
}

export interface CallRecordDetail extends CallRecordSummary {
  transcript: TranscriptEvent[];
  prompt_versions: Record<string, unknown>;
  extracted_fields?: Record<string, unknown>;
}

// pipeline-stream-and-referee: dual-LLM trace fields (was role_candidates /
// judge_results / polish_*).
export interface PipelineTraceTurn {
  turn_id: number;
  user_input: string | null;
  main_reply_text: string | null;
  main_duration_ms: number | null;
  main_tokens_in: number | null;
  main_tokens_out: number | null;
  main_fallback_used: boolean;
  referee_decision: string | null;
  referee_goal_type: string | null;
  referee_confidence: number | null;
  referee_duration_ms: number | null;
  first_audio_ms: number | null;
  error: string | null;
  ts: number | null;
}

export interface PipelineTrace {
  call_id: number;
  turns: PipelineTraceTurn[];
}
