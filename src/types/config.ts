// per-campaign 配置 DTO —— 对齐 isales-api 的 role_config / prompt_version
// 端点（web-admin-campaign-workflow §2）。
import type { RoleKind } from "@/types/campaign";

export type { GenerationStatus, RoleKind } from "@/types/campaign";

// ---- role_config ----------------------------------------------------------

export interface RoleConfig {
  id: number;
  campaign_id: number;
  kind: RoleKind;
  // Routing label for referee/restructure/persona rows (referenced by
  // routing_rules). null for main/extractor (not routable).
  label: string | null;
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
  label?: string | null;
  model: string;
  current_prompt_version_id?: number | null;
  temperature: number;
  top_p: number;
  ext_params?: Record<string, unknown>;
  enabled: boolean;
}

export interface RoleConfigUpdate {
  label?: string | null;
  model?: string;
  current_prompt_version_id?: number | null;
  temperature?: number;
  top_p?: number;
  ext_params?: Record<string, unknown>;
  enabled?: boolean;
}

// ---- prompt_version -------------------------------------------------------

export type PromptScopeType =
  | "main"
  | "referee"
  | "extractor"
  | "restructure"
  | "persona";

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
