export type AppointmentStatus = "pending" | "confirmed" | "completed" | "cancelled";

export type AppointmentAction = "confirm" | "complete" | "cancel";

export interface Appointment {
  id: number;
  lead_id: number;
  created_from_call_id: number | null;
  appointment_time: string;
  status: AppointmentStatus;
  store_address: string;
  directions: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
  lead_name: string | null;
  lead_phone: string | null;
}

export interface AppointmentCreate {
  lead_id: number;
  appointment_time: string;
  store_address: string;
  directions: string;
  notes?: string | null;
  created_from_call_id?: number | null;
}

export interface AppointmentUpdate {
  appointment_time?: string;
  store_address?: string;
  directions?: string;
  notes?: string | null;
}

export interface AppointmentListParams {
  status?: AppointmentStatus;
  lead_id?: number;
  time_from?: string;
  time_to?: string;
  page?: number;
  page_size?: number;
}
