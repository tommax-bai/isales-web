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
          // 数据看板由运营区升为客户顶级入口（web-admin-one-role-ia-consolidation §1.2）。
          // 复用 DashboardView 组件；旧 /operations/dashboard 路由在 Batch 3 删除。
          path: "dashboard",
          name: "dashboard",
          component: () => import("@/views/DashboardView.vue"),
          meta: { title: "数据看板" },
        },
        {
          path: "config/model-providers",
          name: "config-model-providers",
          component: () => import("@/views/Config/ModelProviderConfig.vue"),
          meta: { title: "模型厂商" },
        },

        // ---- 低频/折叠区 view（one-role IA §3：运营区解散，移到干净路径）-----
        {
          path: "monitor/:campaign_id",
          name: "monitor",
          component: () => import("@/views/Monitor/MonitorView.vue"),
          meta: { title: "通话监控" },
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
        {
          path: "devices",
          name: "devices",
          component: () => import("@/views/Devices/DeviceList.vue"),
          meta: { title: "设备在线" },
        },
        {
          path: "voice-models",
          name: "voice-models",
          component: () => import("@/views/VoiceModels/VoiceModelList.vue"),
          meta: { title: "音色目录" },
        },
        {
          path: "callback-configs/:id",
          name: "callback-config-edit",
          component: () => import("@/views/Callbacks/CallbackConfigEdit.vue"),
          meta: { title: "回调编辑" },
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
  // 鉴权守卫。运营区已解散（one-role IA §3）：旧 /operations/* 链接不再重定向，
  // 直接走 not-found；保留的低频 view 已在干净路径（/handoff-tasks 等）。
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
