import apiClient from "@/api/client";
import type {
  AnalyticsOverview,
  AnswerRate,
  DurationDistribution,
  GoalRate,
} from "@/types/analytics";

// v1.0 后端 (isales-api/routers/analytics.py) 只暴露 3 个独立 aggregate
// 端点：/answer-rate /goal-rate /duration-distribution。没有 composite
// /overview，也没有 /by_campaign 或 /timeseries 端点。overview() 通过
// Promise.all 在前端拼出 composite shape；by-campaign / timeseries 视图
// 在后端聚合落地前不再调用。
export const analyticsApi = {
  answerRate: () =>
    apiClient.get<AnswerRate>("/analytics/answer-rate").then((r) => r.data),
  goalRate: () =>
    apiClient.get<GoalRate>("/analytics/goal-rate").then((r) => r.data),
  durationDistribution: () =>
    apiClient
      .get<DurationDistribution>("/analytics/duration-distribution")
      .then((r) => r.data),
  overview: async (): Promise<AnalyticsOverview> => {
    const [answer, goal, duration] = await Promise.all([
      apiClient
        .get<AnswerRate>("/analytics/answer-rate")
        .then((r) => r.data),
      apiClient.get<GoalRate>("/analytics/goal-rate").then((r) => r.data),
      apiClient
        .get<DurationDistribution>("/analytics/duration-distribution")
        .then((r) => r.data),
    ]);
    return { answer, goal, duration };
  },
};
