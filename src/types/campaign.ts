// Mirrors isales_common.models.Campaign + isales_common.schemas.campaign +
// isales_api/schemas.py (CampaignNestedCreate / CampaignNestedUpdate /
// CampaignDetailRead).

export type WeekDay = "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";

export interface TimeWindow {
  days: WeekDay[];
  start: string; // HH:MM
  end: string; // HH:MM
}

export type ExtractionFieldType = "string" | "number" | "boolean" | "datetime";

export interface ExtractionField {
  name: string;
  type: ExtractionFieldType;
  description?: string | null;
  required?: boolean;
}

export type ContinuousInterruptionStrategy = "short_reply" | "listen_only";

// engine-multi-referee-and-restructure: N parallel referees + a restructure
// (re-voice) slot, on top of the dual-LLM main / referee / extractor slots.
// engine-tools-multidialogue-gating: persona = opt-in speculative dialogue role.
export type RoleKind = "main" | "referee" | "extractor" | "restructure" | "persona";

export interface RoleConfigRead {
  id: number;
  campaign_id: number;
  kind: RoleKind;
  // Routing label for referee/restructure rows (referenced by routing_rules).
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

export interface RoleConfigNestedWrite {
  kind: RoleKind;
  label?: string | null;
  model: string;
  current_prompt_version_id?: number | null;
  temperature?: number;
  top_p?: number;
  ext_params?: Record<string, unknown>;
  enabled?: boolean;
}

// ── multi-referee routing (engine-multi-referee-and-restructure) ─────────────

export type TransitionTarget = "goal_achieved" | "transfer" | "customer_decline";
export type RestructureSource = "last_reply" | "interrupt_remaining";

export interface TransitionAction {
  type: "transition";
  to: TransitionTarget;
  goal_type?: string | null; // required iff to === "goal_achieved"
}

export interface RestructureAction {
  type: "restructure";
  source: RestructureSource;
}

// ── engine-tools-multidialogue-gating: route / tool actions + then_state ──────

// Side-effect the StatusProjector projects after a route fires.
export type ThenState =
  | "LISTENING"
  | "WRAPPING_UP"
  | "ACTIVATING"
  | "TRANSFERRING"
  | "END";

// Route to a persona label or a builtin dialogue route (closing/recovery/restructure).
export interface RoutePersonaAction {
  type: "route";
  to: string;
  then_state?: ThenState | null;
}

// Route to a lazy tool (hangup/transfer) by campaign.tools alias.
export interface RouteToolAction {
  type: "tool";
  tool: string;
  then_state?: ThenState | null;
}

// Legacy transition/restructure kept (removal-tracked shim); route/tool added.
export type RoutingAction =
  | TransitionAction
  | RestructureAction
  | RoutePersonaAction
  | RouteToolAction;

export interface RoutingRule {
  referee: string; // referee role_config.label
  match: string[]; // category values that fire this rule
  action: RoutingAction;
}

// ── campaign.tools (alias → tool config) ─────────────────────────────────────

export interface HangupToolConfig {
  type: "hangup";
  closing_phrase?: string | null;
  interrupt?: boolean;
}

// transfer carries no phrase field — single-source campaign.transfer_phrases.
export interface TransferToolConfig {
  type: "transfer";
}

export type ToolConfig = HangupToolConfig | TransferToolConfig;

export type GenerationStatus = "pending" | "running" | "succeeded" | "failed";

export interface FillerPhraseRead {
  id: number;
  filler_set_id: number;
  phrase: string;
  audio_url: string | null;
  generation_status: GenerationStatus;
  created_at: string;
  updated_at: string;
}

export interface FillerPhraseNestedWrite {
  phrase: string;
  audio_url?: string | null;
  generation_status?: GenerationStatus;
}

export interface FillerSetRead {
  id: number;
  campaign_id: number;
  name: string;
  sort_order: number;
  phrases: FillerPhraseRead[];
  created_at: string;
  updated_at: string;
}

export interface FillerSetNestedWrite {
  name: string;
  sort_order?: number;
  phrases: FillerPhraseNestedWrite[];
}

export interface CallbackConfigNestedWrite {
  name: string;
  trigger: Record<string, unknown>;
  url: string;
  method?: string;
  headers?: Record<string, string>;
  payload_template: string;
  retry_policy: Record<string, unknown>;
  timeout_seconds?: number | null;
  enabled?: boolean;
}

export interface CampaignBase {
  name: string;
  voice_id: string | null;
  default_replies: string[];
  concurrency: number;
  time_windows: TimeWindow[];
  extraction_fields: ExtractionField[];

  // multi-referee routing (engine-multi-referee-and-restructure).
  routing_rules: RoutingRule[];
  max_continuous_restructure: number;
  primary_referee_label: string | null;

  // gating + multi-persona (engine-tools-multidialogue-gating).
  tools: Record<string, ToolConfig>;
  persona_fanout_cap: number; // total speculative routes incl main, [1,3]
  referee_timeout_ms: number;
  referee_fail_open_route: string;

  max_silence_activations: number;
  silence_threshold_ms: number;
  silence_phrases: string[];
  silence_hangup_phrase: string | null;
  max_no_progress_seconds: number | null;

  // ASR EOS endpoint threshold in ms (pipeline-latency-tail § A). null falls
  // back to the engine default (400ms). Lower = AI opens its turn faster but
  // more likely to clip a hesitating caller's pause as "done".
  asr_eos_silence_ms: number | null;

  wrap_up_max_rounds: number;
  wrap_up_max_seconds: number;
  wrap_up_closing_phrases: string[];

  // Fixed-template greeting (ai-pipeline § "开场白不走管线"). null falls
  // back to the LLM-generated greeting path.
  greeting: string | null;

  // filler opt-in (pipeline-stream-and-referee). Off by default — the
  // streaming main link reaches first audio in ~500ms.
  filler_enabled: boolean;

  // filler time-gate in ms (tts-cache-and-gated-filler). null → engine
  // default 600ms: only play a filler when first audio is slow.
  filler_delay_ms: number | null;

  interruption_whitelist: string[];
  interruption_min_duration_ms: number;
  max_continuous_interruptions: number;
  continuous_interruption_strategy: ContinuousInterruptionStrategy;

  transfer_keyword_enabled: boolean;
  transfer_keywords: string[];
  transfer_intent_enabled: boolean;
  transfer_intent_threshold: number | null;
  transfer_round_enabled: boolean;
  transfer_round_threshold: number | null;
  transfer_llm_enabled: boolean;
  transfer_llm_prompt_version_id: number | null;
  transfer_phrases: string[];

  retry_intervals: number[];
  retry_max_count: number;
  follow_up_interval_days: number | null;
  follow_up_max_count: number;

  do_not_call_keywords: string[];
  do_not_call_llm_enabled: boolean;
  do_not_call_llm_prompt_version_id: number | null;

  respect_holidays: boolean;
}

export interface CampaignDetail extends CampaignBase {
  id: number;
  created_at: string;
  updated_at: string;
  role_configs: RoleConfigRead[];
  filler_sets: FillerSetRead[];
  callback_configs: unknown[];
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
}

// Slim summary the list view consumes — kept as an alias for backwards
// compatibility; in practice we now hold the full CampaignDetail rows.
export type CampaignSummary = CampaignDetail;

export interface CampaignNestedCreate extends Partial<CampaignBase> {
  name: string;
  concurrency: number;
  role_configs?: RoleConfigNestedWrite[];
  filler_sets?: FillerSetNestedWrite[];
  callback_configs?: CallbackConfigNestedWrite[];
}

export type CampaignNestedUpdate = Partial<CampaignBase> & {
  role_configs?: RoleConfigNestedWrite[];
  filler_sets?: FillerSetNestedWrite[];
  callback_configs?: CallbackConfigNestedWrite[];
};

export type CampaignCreate = CampaignNestedCreate;
export type CampaignUpdate = CampaignNestedUpdate;

export const CAMPAIGN_DEFAULTS: CampaignBase = {
  name: "",
  voice_id: null,
  default_replies: [],
  concurrency: 1,
  time_windows: [],
  extraction_fields: [],
  routing_rules: [],
  max_continuous_restructure: 2,
  primary_referee_label: null,
  tools: {},
  persona_fanout_cap: 1,
  referee_timeout_ms: 600,
  referee_fail_open_route: "main",
  max_silence_activations: 2,
  silence_threshold_ms: 3000,
  silence_phrases: [],
  silence_hangup_phrase: null,
  max_no_progress_seconds: null,
  asr_eos_silence_ms: null,
  wrap_up_max_rounds: 3,
  wrap_up_max_seconds: 60,
  wrap_up_closing_phrases: [],
  greeting: null,
  filler_enabled: false,
  filler_delay_ms: null,
  interruption_whitelist: [],
  interruption_min_duration_ms: 400,
  max_continuous_interruptions: 3,
  continuous_interruption_strategy: "short_reply",
  transfer_keyword_enabled: false,
  transfer_keywords: [],
  transfer_intent_enabled: false,
  transfer_intent_threshold: null,
  transfer_round_enabled: false,
  transfer_round_threshold: null,
  transfer_llm_enabled: false,
  transfer_llm_prompt_version_id: null,
  transfer_phrases: [],
  retry_intervals: [],
  retry_max_count: 3,
  follow_up_interval_days: null,
  follow_up_max_count: 0,
  do_not_call_keywords: [],
  do_not_call_llm_enabled: false,
  do_not_call_llm_prompt_version_id: null,
  respect_holidays: true,
};

// GET /campaigns/{id}/progress — 按 lead.status 聚合 + 启停状态。
export interface CampaignProgress {
  campaign_id: number;
  total: number;
  status_counts: Record<string, number>;
  is_active: boolean;
}
