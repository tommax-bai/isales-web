export interface LoginResponse {
  access_token: string;
  token_type: string;
}

export interface CurrentUser {
  sub: string;
  role: string;
  // Backend includes additional JWT claims; we keep the index signature
  // permissive so future fields don't break TypeScript.
  [key: string]: unknown;
}
