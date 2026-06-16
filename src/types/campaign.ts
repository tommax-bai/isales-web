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

export interface TransitionAction {
  type: "transition";
  to: TransitionTarget;
  goal_type?: string | null; // required iff to === "goal_achieved"
}

// ── engine-tools-multidialogue-gating: route / tool actions + then_state ──────

// Side-effect the StatusProjector projects after a route fires.
export type ThenState =
  | "LISTENING"
  | "WRAPPING_UP"
  | "ACTIVATING"
  | "TRANSFERRING"
  | "END";

// Route to a persona label or a builtin dialogue route (closing/recovery).
// engine-auto-restructure-on-interrupt: restructure is no longer a route target.
export interface RoutePersonaAction {
  type: "route";
  to: string;
  then_state?: ThenState | null;
  // Goal label recorded when this route fires the goal-achieved `closing` route
  // (modern form of TransitionAction.goal_type). Only valid when to === "closing".
  goal_type?: string | null;
}

// Route to a lazy tool (hangup/transfer) by campaign.tools alias.
export interface RouteToolAction {
  type: "tool";
  tool: string;
  then_state?: ThenState | null;
  // Per-rule hangup closing phrase: overrides HangupToolConfig.closing_phrase so
  // one hangup tool serves many keywords with different farewells. Empty/omitted
  // → fall back to the tool's phrase; both empty → direct hangup. (§11)
  closing_phrase?: string | null;
}

// Legacy transition kept (removal-tracked shim); route/tool are modern. The
// legacy restructure action was removed (engine-auto-restructure-on-interrupt).
export type RoutingAction =
  | TransitionAction
  | RoutePersonaAction
  | RouteToolAction;

export interface RoutingRule {
  referee: string; // referee role_config.label
  match: string[]; // category values that fire this rule
  action: RoutingAction;
}

// ── campaign.interruption_rules (composable barge-in rule tree) ──────────────
// Mirrors isales-common schemas.jsonb.InterruptionRule (engine-interruption-
// rule-tree). NULL on the campaign → engine synthesizes a default tree from the
// legacy interruption_whitelist + interruption_min_duration_ms.
export interface KeywordRule {
  type: "keyword";
  values: string[];
  match: "contains" | "exact";
}
export interface LengthRule {
  type: "length";
  value: number; // min rune count (>=1)
}
export interface DurationRule {
  type: "duration";
  value_ms: number; // elapsed since user speech_start (>=0)
}
export interface RegexRule {
  type: "regex";
  pattern: string; // <=128 chars (api-enforced)
}
export interface SplitByDelimiterRule {
  type: "split_by_delimiter";
  delimiters: string[];
}
export interface NoneRule {
  type: "none";
}
export interface AndRule {
  type: "and";
  rules: InterruptionRule[];
}
export interface OrRule {
  type: "or";
  rules: InterruptionRule[];
}
export interface NotRule {
  type: "not";
  rule: InterruptionRule;
}
export type InterruptionRule =
  | KeywordRule
  | LengthRule
  | DurationRule
  | RegexRule
  | SplitByDelimiterRule
  | NoneRule
  | AndRule
  | OrRule
  | NotRule;

export type InterruptionRuleType = InterruptionRule["type"];

// Factory: a fresh, legal default node for a given type (used when the editor
// adds a node or switches a node's type — design D2).
export function makeRule(type: InterruptionRuleType): InterruptionRule {
  switch (type) {
    case "keyword":
      return { type: "keyword", values: [], match: "contains" };
    case "length":
      return { type: "length", value: 2 };
    case "duration":
      return { type: "duration", value_ms: 400 };
    case "regex":
      return { type: "regex", pattern: "" };
    case "split_by_delimiter":
      return { type: "split_by_delimiter", delimiters: [] };
    case "none":
      return { type: "none" };
    case "and":
      return { type: "and", rules: [{ type: "length", value: 2 }] };
    case "or":
      return { type: "or", rules: [{ type: "length", value: 2 }] };
    case "not":
      return { type: "not", rule: { type: "keyword", values: [], match: "exact" } };
  }
}

// Synthesize the same default tree the engine builds from legacy columns
// (isales_engine.realtime.interruption_rules.default_rule): AND( NOT
// keyword(exact, whitelist), length(>=minChars), duration(>=min_duration_ms) ).
// The keyword leaf is omitted when the whitelist is empty. minChars mirrors
// campaign.interruption_min_chars (engine default 2).
export function defaultTreeFrom(
  whitelist: string[],
  minDurationMs: number,
  minChars: number,
): InterruptionRule {
  const rules: InterruptionRule[] = [];
  if (whitelist.length > 0) {
    rules.push({
      type: "not",
      rule: { type: "keyword", values: [...whitelist], match: "exact" },
    });
  }
  rules.push({ type: "length", value: minChars });
  rules.push({ type: "duration", value_ms: minDurationMs });
  return { type: "and", rules };
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

  // gating + multi-persona (engine-tools-multidialogue-gating).
  tools: Record<string, ToolConfig>;
  persona_fanout_cap: number; // total speculative routes incl main, [1,3]
  referee_timeout_ms: number;
  referee_fail_open_route: string;

  max_silence_activations: number;
  silence_threshold_ms: number;
  silence_phrases: string[];
  silence_hangup_phrase: string | null;

  // ASR EOS endpoint threshold in ms (pipeline-latency-tail § A). null falls
  // back to the engine default (400ms). Lower = AI opens its turn faster but
  // more likely to clip a hesitating caller's pause as "done".
  asr_eos_silence_ms: number | null;

  // ambient background mix (engine-ambient-background-mix). ambient_audio: a
  // background-noise asset id; null/empty → off (outbound unchanged).
  // ambient_gain: linear mix level relative to TTS (0.1 ≈ -20dB), kept low to
  // limit echo back into the caller's mic/ASR.
  ambient_audio: string | null;
  ambient_gain: number;

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

  // filler phrases — flat per-campaign pool (filler-campaign-column), edited as
  // a semicolon-separated input like interruption_whitelist.
  filler_phrases: string[];

  // Composable barge-in rule tree; NULL → engine synthesizes from the legacy
  // whitelist + min_duration below (engine-interruption-rule-tree).
  interruption_rules: InterruptionRule | null;
  interruption_whitelist: string[];
  interruption_min_duration_ms: number;
  // Min rune count for the NULL-rule default tree's length leaf (非高级 mode).
  // Engine default 2; only read when interruption_rules is null.
  interruption_min_chars: number;
  max_continuous_interruptions: number;
  continuous_interruption_strategy: ContinuousInterruptionStrategy;
  // engine-auto-restructure-on-interrupt: when on, a barge-in by a trivial
  // interjection (with no hangup/transfer/decline rule matched) makes the AI
  // resume its cut-off line instead of replying. Off by default.
  auto_restructure_on_interrupt: boolean;

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

  respect_holidays: boolean;
}

export interface CampaignDetail extends CampaignBase {
  id: number;
  created_at: string;
  updated_at: string;
  role_configs: RoleConfigRead[];
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
  callback_configs?: CallbackConfigNestedWrite[];
}

export type CampaignNestedUpdate = Partial<CampaignBase> & {
  role_configs?: RoleConfigNestedWrite[];
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
  tools: {},
  persona_fanout_cap: 1,
  referee_timeout_ms: 600,
  referee_fail_open_route: "main",
  max_silence_activations: 2,
  silence_threshold_ms: 4000,
  silence_phrases: [],
  silence_hangup_phrase: null,
  asr_eos_silence_ms: null,
  ambient_audio: null,
  ambient_gain: 0.1,
  wrap_up_max_rounds: 3,
  wrap_up_max_seconds: 60,
  wrap_up_closing_phrases: [],
  greeting: null,
  filler_enabled: false,
  filler_delay_ms: null,
  filler_phrases: [],
  interruption_rules: null,
  interruption_whitelist: [],
  interruption_min_duration_ms: 400,
  interruption_min_chars: 2,
  max_continuous_interruptions: 3,
  continuous_interruption_strategy: "short_reply",
  auto_restructure_on_interrupt: false,
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
  respect_holidays: true,
};

// 背景环境音预设（engine-ambient-background-mix）。value = 服务端
// $ISALES_AMBIENT_DIR（默认 /opt/isales/ambient）下的 WAV 文件名；运维更新素材后
// 在此增删条目即可。空值由「启用」开关表达（关 → ambient_audio=null）。
export interface AmbientPreset {
  value: string;
  label: string;
  desc: string;
}
export const AMBIENT_PRESETS: AmbientPreset[] = [
  { value: "office.wav", label: "办公室", desc: "真实办公室环境底噪" },
];

// GET /campaigns/{id}/progress — 按 lead.status 聚合 + 启停状态。
export interface CampaignProgress {
  campaign_id: number;
  total: number;
  status_counts: Record<string, number>;
  is_active: boolean;
}
