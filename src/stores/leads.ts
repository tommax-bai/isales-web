import { defineStore } from "pinia";
import { ref } from "vue";

import { leadsApi } from "@/api/leads";
import type { Lead, LeadCreate, LeadListParams, LeadUpdate } from "@/types/lead";

export const useLeadsStore = defineStore("leads", () => {
  const items = ref<Lead[]>([]);
  const loading = ref(false);
  const total = ref<number | null>(null);
  const params = ref<LeadListParams>({ page: 1, page_size: 50 });

  async function fetchAll(): Promise<void> {
    loading.value = true;
    try {
      const result = await leadsApi.list(params.value);
      items.value = result.items;
      total.value = result.total;
    } finally {
      loading.value = false;
    }
  }

  async function update(id: number, body: LeadUpdate): Promise<Lead> {
    const updated = await leadsApi.update(id, body);
    items.value = items.value.map((l) => (l.id === id ? updated : l));
    return updated;
  }

  async function create(body: LeadCreate): Promise<Lead> {
    const created = await leadsApi.create(body);
    items.value = [created, ...items.value];
    return created;
  }

  return { items, loading, total, params, fetchAll, update, create };
});
