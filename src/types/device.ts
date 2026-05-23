// v1.0 cloud-edge 架构下 cloud admin 只看 edge fleet liveness（edge 通过
// cloud-edge gRPC 心跳上报 Device 行），不持 imei / usb_port / signal_strength
// 等本机字段。后端 endpoint 是 GET /api/edge-devices/status (EdgeDeviceStatusList)，
// 不是 GET /api/devices (该端点不存在)。

export type DeviceStatus = string;

export interface EdgeDeviceStatus {
  id: number;
  name: string;
  status: DeviceStatus;
  last_seen_at: string | null;
  online: boolean;
}

export interface EdgeDeviceStatusList {
  threshold_seconds: number;
  online_count: number;
  offline_count: number;
  items: EdgeDeviceStatus[];
}

// SIM 卡在 v1.0 cloud-edge 架构下由 edge 自治，cloud 不暴露 list 端点；
// SimCardList view 仅展示一个说明 banner。保留类型壳以供未来 (C2 multi-
// tenant edge_device 表落地时) 重新对接。
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
