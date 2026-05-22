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
  | "transferred"
  | "appointed"
  | "visited"
  | "lost";

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
  created_at: string;
  updated_at: string;
}

/**
 * 字段必须与 isales-common `schemas/lead.py` 对齐 —— 后端 schema 是
 * `extra="forbid"`，多传一个字段就会 422。
 *
 * LeadCreate 不接受 `status`（新建固定为模型默认的 `new`）。
 * LeadUpdate 不接受 `campaign_id`（线索归属的 campaign 不可改）。
 */
export interface LeadCreate {
  campaign_id: number;
  phone: string;
  name?: string | null;
  source?: string | null;
  custom_data?: Record<string, unknown>;
}

export interface LeadUpdate {
  phone?: string;
  name?: string | null;
  source?: string | null;
  custom_data?: Record<string, unknown>;
  status?: LeadStatus;
  next_call_at?: string | null;
}

export interface LeadListParams {
  campaign_id?: number;
  status?: LeadStatus;
  search?: string;
  page?: number;
  page_size?: number;
}

export interface LeadImportSummary {
  imported: number;
  skipped: number;
  errors: { row: number; reason: string }[];
}
