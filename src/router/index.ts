import { createRouter, createWebHistory, type RouteLocationNormalized } from "vue-router";

import DefaultLayout from "@/components/Layout/DefaultLayout.vue";

/**
 * 旧顶级路径 → /operations 下的新路径，beforeEach 中做客户端 301 等价重定向。
 * Spec: capability `web-admin-ui` § "运营面 view 收纳" 第 2 个 scenario.
 */
const OPERATIONS_REDIRECTS: Record<string, string> = {
  "/dashboard": "/operations/dashboard",
  "/devices": "/operations/devices",
  "/sim-cards": "/operations/sim-cards",
  "/holidays": "/operations/holidays",
  "/callback-configs": "/operations/callback-configs",
  "/callback-logs": "/operations/callback-logs",
  "/handoff-tasks": "/operations/handoff-tasks",
  "/voice-models": "/operations/voice-models",
  // 模型厂商页位于客户面 /config/model-providers (顶部圆按钮入口)，
  // 但用户可能猜成 /operations/model-providers — 做一次性重定向兼容。
  "/operations/model-providers": "/config/model-providers",
};

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: "/login",
      name: "login",
      component: () => import("@/views/LoginView.vue"),
      meta: { public: true },
    },
    {
      path: "/",
      component: DefaultLayout,
      redirect: { name: "leads" },
      children: [
        // ---- 客户面 view ------------------------------------------------
        {
          path: "campaigns",
          name: "campaigns",
          component: () => import("@/views/Campaigns/CampaignWorkspace.vue"),
          meta: { title: "场景" },
        },
        {
          path: "campaigns/:id",
          name: "campaign-detail",
          component: () => import("@/views/Campaigns/CampaignDetail.vue"),
          meta: { title: "场景详情" },
        },
        {
          path: "leads",
          name: "leads",
          component: () => import("@/views/Leads/LeadList.vue"),
          meta: { title: "线索管理" },
        },
        {
          path: "calls",
          name: "calls",
          component: () => import("@/views/Calls/CallList.vue"),
          meta: { title: "外呼记录" },
        },
        {
          path: "calls/:id",
          name: "call-detail",
          component: () => import("@/views/Calls/CallDetail.vue"),
          meta: { title: "通话详情" },
        },
        {
          path: "appointments",
          name: "appointments",
          component: () => import("@/views/Appointments/AppointmentList.vue"),
          meta: { title: "预约管理" },
        },
        {
          path: "config/model-providers",
          name: "config-model-providers",
          component: () => import("@/views/Config/ModelProviderConfig.vue"),
          meta: { title: "模型厂商" },
        },

        // ---- /operations/* 9 个运营 view（view 文件不动） ---------------
        {
          path: "operations",
          name: "operations-index",
          component: () => import("@/views/Operations/OperationsIndex.vue"),
          meta: { title: "运营管理" },
        },
        {
          path: "operations/dashboard",
          name: "operations-dashboard",
          component: () => import("@/views/DashboardView.vue"),
          meta: { title: "数据看板" },
        },
        {
          path: "operations/campaigns",
          name: "operations-campaigns",
          component: () => import("@/views/Campaigns/CampaignList.vue"),
          meta: { title: "任务管理" },
        },
        {
          path: "operations/campaigns/:id/edit",
          name: "operations-campaign-edit",
          component: () => import("@/views/Campaigns/CampaignEdit.vue"),
          meta: { title: "编辑任务" },
        },
        {
          path: "operations/monitor/:campaign_id",
          name: "operations-monitor",
          component: () => import("@/views/Monitor/MonitorView.vue"),
          meta: { title: "通话监控" },
        },
        {
          path: "operations/callback-configs",
          name: "operations-callback-configs",
          component: () => import("@/views/Callbacks/CallbackConfigList.vue"),
          meta: { title: "回调配置" },
        },
        {
          path: "operations/callback-configs/:id",
          name: "operations-callback-config-edit",
          component: () => import("@/views/Callbacks/CallbackConfigEdit.vue"),
          meta: { title: "回调编辑" },
        },
        {
          path: "operations/callback-logs",
          name: "operations-callback-logs",
          component: () => import("@/views/Callbacks/CallbackLogList.vue"),
          meta: { title: "回调记录" },
        },
        {
          path: "operations/handoff-tasks",
          name: "operations-handoff-tasks",
          component: () => import("@/views/HandoffTasks/HandoffTaskList.vue"),
          meta: { title: "转人工任务" },
        },
        {
          path: "operations/holidays",
          name: "operations-holidays",
          component: () => import("@/views/Holidays/HolidayList.vue"),
          meta: { title: "节假日" },
        },
        {
          path: "operations/devices",
          name: "operations-devices",
          component: () => import("@/views/Devices/DeviceList.vue"),
          meta: { title: "设备管理" },
        },
        {
          path: "operations/sim-cards",
          name: "operations-sim-cards",
          component: () => import("@/views/SimCards/SimCardList.vue"),
          meta: { title: "SIM 卡" },
        },
        {
          path: "operations/voice-models",
          name: "operations-voice-models",
          component: () => import("@/views/VoiceModels/VoiceModelList.vue"),
          meta: { title: "音色管理" },
        },
      ],
    },
    {
      path: "/:pathMatch(.*)*",
      name: "not-found",
      component: () => import("@/views/NotFoundView.vue"),
      meta: { title: "404", public: true },
    },
  ],
});

router.beforeEach(async (to: RouteLocationNormalized) => {
  // 1. 旧顶级运营路径 → /operations/* 客户端永久重定向。
  //    仅当请求路径正好是某个旧路径或其下子段（如 /campaigns/123/edit）才转发，
  //    /monitor/:campaign_id 之类带参数的旧路径同样命中。
  for (const [oldPrefix, newPrefix] of Object.entries(OPERATIONS_REDIRECTS)) {
    if (to.path === oldPrefix || to.path.startsWith(`${oldPrefix}/`)) {
      const rewritten = to.path.replace(oldPrefix, newPrefix);
      return { path: rewritten, query: to.query, hash: to.hash, replace: true };
    }
  }
  // 旧 monitor 路径单独处理（带 campaign_id）
  if (to.path.startsWith("/monitor/")) {
    return {
      path: to.path.replace(/^\/monitor\//, "/operations/monitor/"),
      query: to.query,
      hash: to.hash,
      replace: true,
    };
  }

  // 2. 鉴权守卫（不变）
  const { useAuthStore } = await import("@/stores/auth");
  const auth = useAuthStore();
  const isPublic = to.meta.public === true;

  if (!isPublic && !auth.isAuthenticated) {
    return { name: "login", query: { redirect: to.fullPath } };
  }
  if (to.name === "login" && auth.isAuthenticated) {
    return { name: "leads" };
  }
  return true;
});

export default router;
