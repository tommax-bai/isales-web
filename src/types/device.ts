export type DeviceStatus =
  | "unknown"
  | "detected"
  | "registered"
  | "idle"
  | "dialing"
  | "in_call"
  | "offline"
  | "flagged";

export interface Device {
  id: number;
  imei: string;
  model: string | null;
  port: string | null;
  status: DeviceStatus;
  signal_strength: number | null;
  last_call_at: string | null;
}

export type SimStatus = "active" | "suspended" | "arrears" | "flagged";

export interface SimCard {
  id: number;
  iccid: string;
  imsi: string | null;
  phone_number: string | null;
  carrier: string | null;
  plan: string | null;
  balance_cny: number | null;
  status: SimStatus;
}
