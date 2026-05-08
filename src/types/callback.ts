export interface CallbackConfig {
  id: number;
  campaign_id: number;
  name: string;
  url: string;
  method: string;
  trigger: Record<string, unknown>;
  payload_template: string;
  retry_policy: Record<string, unknown>;
  timeout_seconds: number | null;
  enabled: boolean;
}

export interface CallbackLog {
  id: number;
  callback_config_id: number;
  call_record_id: number;
  status: string;
  retry_count: number;
  next_retry_at: string | null;
  request_body: string | null;
  response_status: number | null;
  error_message: string | null;
  created_at: string;
}
