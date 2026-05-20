import apiClient from "@/api/client";
import type {
  Appointment,
  AppointmentAction,
  AppointmentCreate,
  AppointmentListParams,
  AppointmentUpdate,
} from "@/types/appointment";
import type { PaginatedResponse } from "@/types/campaign";

export interface AppointmentListResponse {
  items: Appointment[];
  total: number | null;
}

export const appointmentsApi = {
  list: async (params: AppointmentListParams = {}): Promise<AppointmentListResponse> => {
    const r = await apiClient.get<PaginatedResponse<Appointment> | Appointment[]>(
      "/appointments",
      { params },
    );
    if (Array.isArray(r.data)) return { items: r.data, total: null };
    return { items: r.data.items, total: r.data.total };
  },
  get: (id: number) =>
    apiClient.get<Appointment>(`/appointments/${id}`).then((r) => r.data),
  create: (body: AppointmentCreate) =>
    apiClient.post<Appointment>("/appointments", body).then((r) => r.data),
  update: (id: number, body: AppointmentUpdate) =>
    apiClient.patch<Appointment>(`/appointments/${id}`, body).then((r) => r.data),
  transition: (id: number, action: AppointmentAction) =>
    apiClient
      .patch<Appointment>(`/appointments/${id}/status`, { action })
      .then((r) => r.data),
  remove: (id: number) =>
    apiClient.delete<void>(`/appointments/${id}`).then((r) => r.data),
};
