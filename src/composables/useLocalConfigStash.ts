/**
 * useLocalConfigStash — localStorage-backed JSON store for config views
 * whose backend endpoints aren't HTTP-exposed yet (role_config /
 * prompt_version / filler_set / filler_phrase / provider_credential).
 *
 * Design.md Open Q §2 notes these as a deferred follow-up. This composable
 * lets the redesigned config views ship with a working UI today — the user
 * can author the configs and the JSON survives a page reload. When the
 * backend endpoints land, the views' fetch/save functions swap to apiClient
 * calls without UI changes.
 */

import { ref, watch, type Ref } from "vue";

const PREFIX = "isales-config:";

export function useLocalConfigStash<T>(key: string, defaultValue: () => T): Ref<T> {
  const full = PREFIX + key;
  const initial = (() => {
    try {
      const raw = localStorage.getItem(full);
      if (!raw) return defaultValue();
      return JSON.parse(raw) as T;
    } catch {
      return defaultValue();
    }
  })();

  const state = ref(initial) as Ref<T>;

  watch(
    state,
    (v) => {
      try {
        localStorage.setItem(full, JSON.stringify(v));
      } catch {
        // localStorage may be unavailable in private mode; swallow.
      }
    },
    { deep: true },
  );

  return state;
}
