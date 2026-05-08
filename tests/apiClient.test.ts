import { createPinia, setActivePinia } from "pinia";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock the router so handleUnauthorized's router.push is observable. The
// vi.mock factory is hoisted, so the spy lives inside the factory and is
// re-exported for assertions below.
vi.mock("@/router", () => {
  const push = vi.fn();
  return {
    default: {
      currentRoute: { value: { name: "campaigns", fullPath: "/campaigns" } },
      push,
    },
  };
});

import apiClient from "@/api/client";
import router from "@/router";
import { useAuthStore } from "@/stores/auth";

const pushMock = router.push as unknown as ReturnType<typeof vi.fn>;

describe("apiClient 401 interceptor", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    pushMock.mockReset();
    localStorage.clear();
  });

  it("clears auth state and redirects to /login on 401 when previously authenticated", async () => {
    const auth = useAuthStore();
    auth.token = "stale-jwt";
    auth.username = "alice";
    auth.role = "admin";
    expect(auth.isAuthenticated).toBe(true);

    // Fire the registered response error handler synthetically; this
    // exercises the interceptor without needing a real network round-trip.
    type ResponseErrorHandler = (
      err: { response?: { status?: number } },
    ) => Promise<unknown>;
    type Handler = { rejected?: ResponseErrorHandler };
    const handlers = (
      apiClient.interceptors.response as unknown as { handlers: Handler[] }
    ).handlers;
    const rejectedHandlers = handlers
      .map((h: Handler) => h?.rejected)
      .filter((fn): fn is ResponseErrorHandler => typeof fn === "function");
    expect(rejectedHandlers.length).toBeGreaterThan(0);
    const handler = rejectedHandlers[0];

    await handler({ response: { status: 401 } }).catch(() => {});
    expect(auth.isAuthenticated).toBe(false);
    expect(pushMock).toHaveBeenCalledWith({
      name: "login",
      query: { redirect: "/campaigns" },
    });
  });
});
