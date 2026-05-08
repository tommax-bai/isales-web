export interface AnalyticsOverview {
  total_calls: number;
  answered: number;
  goal_achieved: number;
  avg_duration_s: number;
  active_calls: number;
}

export interface AnalyticsByCampaign {
  campaign_id: number;
  campaign_name: string;
  total_calls: number;
  answered: number;
  goal_achieved: number;
  avg_duration_s: number;
}

export interface TimeSeriesPoint {
  date: string;
  total_calls: number;
  answered: number;
  goal_achieved: number;
}
