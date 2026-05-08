import apiClient from "@/api/client";
import type {
  AnalyticsByCampaign,
  AnalyticsOverview,
  TimeSeriesPoint,
} from "@/types/analytics";

export const analyticsApi = {
  overview: () =>
    apiClient.get<AnalyticsOverview>("/analytics/overview").then((r) => r.data),
  byCampaign: () =>
    apiClient
      .get<AnalyticsByCampaign[]>("/analytics/by_campaign")
      .then((r) => r.data),
  timeseries: (days = 7) =>
    apiClient
      .get<TimeSeriesPoint[]>("/analytics/timeseries", { params: { days } })
      .then((r) => r.data),
};
