import { createRouter, createWebHistory, type RouteLocationNormalized } from "vue-router";

import DefaultLayout from "@/components/Layout/DefaultLayout.vue";

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
      redirect: { name: "dashboard" },
      children: [
        {
          path: "dashboard",
          name: "dashboard",
          component: () => import("@/views/DashboardView.vue"),
          meta: { title: "数据看板" },
        },
        {
          path: "campaigns",
          name: "campaigns",
          component: () => import("@/views/Campaigns/CampaignList.vue"),
          meta: { title: "任务管理" },
        },
        {
          path: "campaigns/:id/edit",
          name: "campaign-edit",
          component: () => import("@/views/Campaigns/CampaignEdit.vue"),
          meta: { title: "编辑任务" },
        },
        {
          path: "leads",
          name: "leads",
          component: () => import("@/views/Leads/LeadList.vue"),
          meta: { title: "线索管理" },
        },
        {
          path: "voice-models",
          name: "voice-models",
          component: () => import("@/views/VoiceModels/VoiceModelList.vue"),
          meta: { title: "音色管理" },
        },
        {
          path: "devices",
          name: "devices",
          component: () => import("@/views/Devices/DeviceList.vue"),
          meta: { title: "设备管理" },
        },
        {
          path: "sim-cards",
          name: "sim-cards",
          component: () => import("@/views/SimCards/SimCardList.vue"),
          meta: { title: "SIM 卡" },
        },
        {
          path: "monitor/:campaign_id",
          name: "monitor",
          component: () => import("@/views/Monitor/MonitorView.vue"),
          meta: { title: "通话监控" },
        },
        {
          path: "calls",
          name: "calls",
          component: () => import("@/views/Calls/CallList.vue"),
          meta: { title: "通话记录" },
        },
        {
          path: "calls/:id",
          name: "call-detail",
          component: () => import("@/views/Calls/CallDetail.vue"),
          meta: { title: "通话详情" },
        },
        {
          path: "callback-configs",
          name: "callback-configs",
          component: () => import("@/views/Callbacks/CallbackConfigList.vue"),
          meta: { title: "回调配置" },
        },
        {
          path: "callback-configs/:id",
          name: "callback-config-edit",
          component: () => import("@/views/Callbacks/CallbackConfigEdit.vue"),
          meta: { title: "回调编辑" },
        },
        {
          path: "callback-logs",
          name: "callback-logs",
          component: () => import("@/views/Callbacks/CallbackLogList.vue"),
          meta: { title: "回调记录" },
        },
        {
          path: "handoff-tasks",
          name: "handoff-tasks",
          component: () => import("@/views/HandoffTasks/HandoffTaskList.vue"),
          meta: { title: "转人工任务" },
        },
        {
          path: "holidays",
          name: "holidays",
          component: () => import("@/views/Holidays/HolidayList.vue"),
          meta: { title: "节假日" },
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
  const { useAuthStore } = await import("@/stores/auth");
  const auth = useAuthStore();
  const isPublic = to.meta.public === true;

  if (!isPublic && !auth.isAuthenticated) {
    return { name: "login", query: { redirect: to.fullPath } };
  }
  if (to.name === "login" && auth.isAuthenticated) {
    return { name: "dashboard" };
  }
  return true;
});

export default router;
