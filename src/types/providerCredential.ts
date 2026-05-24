// Spec: provider-credential capability。后端只返 masked_value (前 4 + 8*
// + 后 4)，永不暴露明文。前端持 plaintext_value 仅 POST 上送一次，存进
// reactive form 后清空，不写 localStorage。
export interface ProviderCredentialRead {
  id: number;
  provider_id: string;
  field_name: string;
  masked_value: string;
  updated_by: string | null;
  updated_at: string;
}

export interface ProviderCredentialUpsert {
  provider_id: string;
  field_name: string;
  plaintext_value: string;
}
