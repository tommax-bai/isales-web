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
}
