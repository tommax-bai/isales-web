import { defineStore } from "pinia";
import { ref } from "vue";

import { campaignsApi } from "@/api/campaigns";
import type {
  CampaignCreate,
  CampaignSummary,
  CampaignUpdate,
} from "@/types/campaign";

export const useCampaignsStore = defineStore("campaigns", () => {
  const items = ref<CampaignSummary[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);

  async function fetchAll(): Promise<void> {
    loading.value = true;
    error.value = null;
    try {
      items.value = await campaignsApi.list();
    } catch (err: unknown) {
      error.value = "加载任务列表失败";
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function create(body: CampaignCreate): Promise<CampaignSummary> {
    const created = await campaignsApi.create(body);
    items.value = [created, ...items.value];
    return created;
  }

  async function update(id: number, body: CampaignUpdate): Promise<CampaignSummary> {
    const updated = await campaignsApi.update(id, body);
    items.value = items.value.map((c) => (c.id === id ? updated : c));
    return updated;
  }

  async function remove(id: number): Promise<void> {
    await campaignsApi.remove(id);
    items.value = items.value.filter((c) => c.id !== id);
  }

  async function start(id: number): Promise<void> {
    await campaignsApi.start(id);
  }

  async function pause(id: number): Promise<void> {
    await campaignsApi.pause(id);
  }

  return { items, loading, error, fetchAll, create, update, remove, start, pause };
});
