import apiClient from "@/api/client";
import type { EdgeDeviceStatusList } from "@/types/device";

// v1.0: cloud admin 只看 edge fleet liveness。GET /api/devices 不存在
// (后端只有 GET /api/edge-devices/status)；SIM 卡 list cloud 端不暴露
// (edge 自治)。SimCardList view 不再发请求，直接渲染说明 banner。
export const edgeDevicesApi = {
  status: () =>
    apiClient
      .get<EdgeDeviceStatusList>("/edge-devices/status")
      .then((r) => r.data),
};
