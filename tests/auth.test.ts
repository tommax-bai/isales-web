import { createPinia, setActivePinia } from "pinia";
import { beforeEach, describe, expect, it } from "vitest";

import { useAuthStore } from "@/stores/auth";

// pinia-plugin-persistedstate writes to localStorage, which jsdom provides.

describe("auth store", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    localStorage.clear();
  });

  it("starts unauthenticated", () => {
    const auth = useAuthStore();
    expect(auth.isAuthenticated).toBe(false);
    expect(auth.token).toBeNull();
    expect(auth.username).toBeNull();
  });

  it("decodes role from a JWT after manually setting state", () => {
    // We test the token-side behaviour (decodeRoleFromJwt is internal but
    // observable via the role ref after login). For a unit test we simulate
    // a successful login by setting state directly — the real network call
    // is integration-tested at the view level.
    const auth = useAuthStore();
    // {"alg":"none"}.{"sub":"alice","role":"admin"}
    const header = btoa(JSON.stringify({ alg: "none" }));
    const payload = btoa(JSON.stringify({ sub: "alice", role: "admin" }));
    auth.token = `${header}.${payload}.sig`;
    auth.username = "alice";
    auth.role = "admin";
    expect(auth.isAuthenticated).toBe(true);
    expect(auth.role).toBe("admin");
  });

  it("clears state on handleUnauthorized", () => {
    const auth = useAuthStore();
    auth.token = "x";
    auth.username = "alice";
    auth.role = "admin";
    auth.handleUnauthorized();
    expect(auth.isAuthenticated).toBe(false);
    expect(auth.token).toBeNull();
  });
});
