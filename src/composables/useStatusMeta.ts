import type { AppointmentStatus } from "@/types/appointment";
import type { LeadStatus } from "@/types/lead";

type BadgeColor = "blue" | "yellow" | "green" | "purple" | "gray" | "red";

const LEAD_STATUS_META: Record<LeadStatus, { color: BadgeColor; label: string }> = {
  new: { color: "blue", label: "新线索" },
  queued: { color: "yellow", label: "待呼叫" },
  calling: { color: "yellow", label: "呼叫中" },
  retrying: { color: "yellow", label: "重试中" },
  following_up: { color: "yellow", label: "跟进中" },
  completed: { color: "green", label: "已完成" },
  failed: { color: "red", label: "失败" },
  follow_up_exhausted: { color: "red", label: "跟进耗尽" },
  do_not_call: { color: "red", label: "免打扰" },
  transferred: { color: "green", label: "已转人工" },
  appointed: { color: "purple", label: "已预约" },
  visited: { color: "gray", label: "已到店" },
  lost: { color: "red", label: "已流失" },
};

const APPOINTMENT_STATUS_META: Record<
  AppointmentStatus,
  { color: BadgeColor; label: string }
> = {
  pending: { color: "yellow", label: "待确认" },
  confirmed: { color: "blue", label: "已确认" },
  completed: { color: "green", label: "已完成" },
  cancelled: { color: "gray", label: "已取消" },
};

export function leadStatusMeta(s: LeadStatus): { color: BadgeColor; label: string } {
  return LEAD_STATUS_META[s] ?? { color: "gray", label: s };
}

export function appointmentStatusMeta(
  s: AppointmentStatus,
): { color: BadgeColor; label: string } {
  return APPOINTMENT_STATUS_META[s] ?? { color: "gray", label: s };
}
