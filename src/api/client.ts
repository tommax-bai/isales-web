import axios, { AxiosError, type AxiosInstance } from "axios";

import router from "@/router";
import { useAuthStore } from "@/stores/auth";

const apiClient: AxiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_BASE ?? "/api",
  timeout: 30_000,
});

apiClient.interceptors.request.use((config) => {
  const auth = useAuthStore();
  if (auth.token) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${auth.token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      const auth = useAuthStore();
      const wasAuthenticated = auth.isAuthenticated;
      auth.handleUnauthorized();
      if (wasAuthenticated && router.currentRoute.value.name !== "login") {
        void router.push({
          name: "login",
          query: { redirect: router.currentRoute.value.fullPath },
        });
      }
    }
    return Promise.reject(error);
  },
);

export default apiClient;
