import apiClient from "@/api/client";
import type { Device, SimCard } from "@/types/device";

export const devicesApi = {
  list: () => apiClient.get<Device[]>("/devices").then((r) => r.data),
};

export const simCardsApi = {
  list: () => apiClient.get<SimCard[]>("/sim-cards").then((r) => r.data),
};
