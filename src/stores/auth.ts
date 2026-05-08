import axios from "axios";
import { defineStore } from "pinia";
import { computed, ref } from "vue";

import router from "@/router";
import type { CurrentUser, LoginResponse } from "@/types/auth";

export const useAuthStore = defineStore(
  "auth",
  () => {
    const token = ref<string | null>(null);
    const username = ref<string | null>(null);
    const role = ref<string | null>(null);

    const isAuthenticated = computed(() => Boolean(token.value));

    async function login(creds: { username: string; password: string }): Promise<void> {
      // OAuth2PasswordRequestForm expects URL-encoded form, not JSON.
      const form = new URLSearchParams();
      form.set("username", creds.username);
      form.set("password", creds.password);

      const baseUrl = import.meta.env.VITE_API_BASE ?? "/api";
      const response = await axios.post<LoginResponse>(`${baseUrl}/auth/login`, form, {
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
      });

      token.value = response.data.access_token;
      username.value = creds.username;
      role.value = decodeRoleFromJwt(response.data.access_token);
    }

    function logout(): void {
      token.value = null;
      username.value = null;
      role.value = null;
      void router.push({ name: "login" });
    }

    function handleUnauthorized(): void {
      // Called by the axios response interceptor on a 401 from any endpoint.
      // We clear local state and bounce to /login; the user re-authenticates
      // and the request is left to the caller (Pinia stores typically
      // surface the error to the view).
      const wasAuthenticated = isAuthenticated.value;
      token.value = null;
      username.value = null;
      role.value = null;
      if (wasAuthenticated && router.currentRoute.value.name !== "login") {
        void router.push({ name: "login" });
      }
    }

    function setFromExternal(user: CurrentUser): void {
      // Used by /auth/me hydration calls (PR #3+); kept here to centralise
      // the assignment.
      username.value = user.sub;
      role.value = user.role;
    }

    return {
      token,
      username,
      role,
      isAuthenticated,
      login,
      logout,
      handleUnauthorized,
      setFromExternal,
    };
  },
  {
    persist: {
      key: "isales-auth",
      pick: ["token", "username", "role"],
    },
  },
);

function decodeRoleFromJwt(token: string): string | null {
  // Cheap base64url decode of the payload. We only need `role` for the
  // sidebar; production-side validation lives on the server.
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  try {
    const payload = JSON.parse(b64UrlDecode(parts[1]));
    return typeof payload?.role === "string" ? payload.role : null;
  } catch {
    return null;
  }
}

function b64UrlDecode(input: string): string {
  const padded = input.replace(/-/g, "+").replace(/_/g, "/");
  const padding = (4 - (padded.length % 4)) % 4;
  return atob(padded + "=".repeat(padding));
}
