import { defineStore } from "pinia";
import { ref } from "vue";

import { leadsApi } from "@/api/leads";
import type { Lead, LeadListParams } from "@/types/lead";

export const useLeadsStore = defineStore("leads", () => {
  const items = ref<Lead[]>([]);
  const loading = ref(false);
  const params = ref<LeadListParams>({ limit: 50, offset: 0 });

  async function fetchAll(): Promise<void> {
    loading.value = true;
    try {
      items.value = await leadsApi.list(params.value);
    } finally {
      loading.value = false;
    }
  }

  return { items, loading, params, fetchAll };
});
