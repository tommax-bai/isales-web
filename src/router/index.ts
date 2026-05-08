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
          component: () => import("@/views/PlaceholderView.vue"),
          meta: { title: "数据看板" },
        },
        {
          path: "campaigns",
          name: "campaigns",
          component: () => import("@/views/Campaigns/CampaignList.vue"),
          meta: { title: "任务管理" },
        },
      ],
    },
    {
      path: "/:pathMatch(.*)*",
      name: "not-found",
      component: () => import("@/views/PlaceholderView.vue"),
      meta: { title: "404", public: true },
    },
  ],
});

router.beforeEach(async (to: RouteLocationNormalized) => {
  // The auth store import is lazy: at module-init Pinia isn't ready yet.
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
