// per-campaign 配置 DTO —— 对齐 isales-api 的 role_config / prompt_version /
// filler 端点（web-admin-campaign-workflow §2）。
import type { GenerationStatus, RoleKind } from "@/types/campaign";

export type { GenerationStatus, RoleKind } from "@/types/campaign";

// ---- role_config ----------------------------------------------------------

export interface RoleConfig {
  id: number;
  campaign_id: number;
  kind: RoleKind;
  model: string;
  current_prompt_version_id: number | null;
  temperature: number;
  top_p: number;
  ext_params: Record<string, unknown>;
  enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface RoleConfigCreate {
  campaign_id: number;
  kind: RoleKind;
  model: string;
  current_prompt_version_id?: number | null;
  temperature: number;
  top_p: number;
  ext_params?: Record<string, unknown>;
  enabled: boolean;
}

export interface RoleConfigUpdate {
  model?: string;
  current_prompt_version_id?: number | null;
  temperature?: number;
  top_p?: number;
  ext_params?: Record<string, unknown>;
  enabled?: boolean;
}

// ---- prompt_version -------------------------------------------------------

export type PromptScopeType = "role" | "judge" | "polish";

export interface PromptVersion {
  id: number;
  scope_type: PromptScopeType;
  scope_id: number;
  content: string;
  created_by: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface PromptVersionCreate {
  scope_type: PromptScopeType;
  scope_id: number;
  content: string;
  is_active?: boolean;
}

export interface PromptVersionUpdate {
  content?: string;
  is_active?: boolean;
}

// ---- filler_set / filler_phrase ------------------------------------------

export interface FillerSet {
  id: number;
  campaign_id: number;
  name: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface FillerSetCreate {
  campaign_id: number;
  name: string;
  sort_order?: number;
}

export interface FillerSetUpdate {
  name?: string;
  sort_order?: number;
}

export interface FillerPhrase {
  id: number;
  filler_set_id: number;
  phrase: string;
  audio_url: string | null;
  generation_status: GenerationStatus;
  created_at: string;
  updated_at: string;
}

export interface FillerPhraseCreate {
  filler_set_id: number;
  phrase: string;
  audio_url?: string | null;
}

export interface FillerPhraseUpdate {
  phrase?: string;
  audio_url?: string | null;
  generation_status?: GenerationStatus;
}
