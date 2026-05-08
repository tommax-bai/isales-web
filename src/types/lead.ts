export type LeadStatus =
  | "new"
  | "queued"
  | "calling"
  | "retrying"
  | "following_up"
  | "completed"
  | "failed"
  | "follow_up_exhausted"
  | "do_not_call"
  | "transferred";

export interface Lead {
  id: number;
  campaign_id: number;
  name: string | null;
  phone: string;
  source: string | null;
  custom_data: Record<string, unknown>;
  status: LeadStatus;
  retry_count: number;
  follow_up_count: number;
  next_call_at: string | null;
  last_hangup_cause: string | null;
}

export interface LeadCreate {
  campaign_id: number;
  phone: string;
  name?: string | null;
  source?: string | null;
  custom_data?: Record<string, unknown>;
  status?: LeadStatus;
}

export interface LeadUpdate extends Partial<LeadCreate> {}

export interface LeadListParams {
  campaign_id?: number;
  status?: LeadStatus;
  search?: string;
  limit?: number;
  offset?: number;
}

export interface LeadImportSummary {
  imported: number;
  skipped: number;
  errors: { row: number; reason: string }[];
}
