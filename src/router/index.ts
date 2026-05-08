import { createRouter, createWebHistory } from "vue-router";

import DefaultLayout from "@/components/Layout/DefaultLayout.vue";

// PR #1 ships the bare router skeleton + a placeholder /dashboard. Subsequent
// PRs add /campaigns, /leads, etc. and the auth guard.
const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: "/login",
      name: "login",
      component: () => import("@/views/LoginView.vue"),
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
      ],
    },
    {
      path: "/:pathMatch(.*)*",
      name: "not-found",
      component: () => import("@/views/PlaceholderView.vue"),
      meta: { title: "404" },
    },
  ],
});

export default router;
