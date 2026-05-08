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

export interface RoleCandidate {
  parsed_json: unknown;
  parse_failed: boolean;
  raw_text: string;
  tokens_used: number | null;
  duration_ms: number | null;
  role_config_id?: number;
}

export interface JudgeResult {
  judge_id: number;
  candidate_index: number;
  passed: boolean;
  reason: string | null;
}

export interface PipelineTraceTurn {
  turn_id: number;
  user_input: string;
  role_candidates: RoleCandidate[];
  judge_results: JudgeResult[];
  polish_input: string | null;
  polish_output: string | null;
  final_selected_candidate_index: number | null;
  ts: number | null;
}

export interface PipelineTrace {
  call_id: number;
  turns: PipelineTraceTurn[];
}
