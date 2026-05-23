// shape 对齐 isales-api/routers/analytics.py 三个真实端点：
// /answer-rate → AnswerRate { total, answered, rate }
// /goal-rate → GoalRate { total_calls, goal_achieved, rate }
// /duration-distribution → DurationDistribution { total, buckets: [...] }
// 没有 /overview /by_campaign /timeseries 端点，对应类型已删除。

export interface AnswerRate {
  total: number;
  answered: number;
  rate: number;
}

export interface GoalRate {
  total_calls: number;
  goal_achieved: number;
  rate: number;
}

export interface DurationBucket {
  label: string;
  lower_seconds: number;
  upper_seconds: number | null;
  count: number;
}

export interface DurationDistribution {
  total: number;
  buckets: DurationBucket[];
}

export interface AnalyticsOverview {
  answer: AnswerRate;
  goal: GoalRate;
  duration: DurationDistribution;
}
