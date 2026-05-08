// Mirrors isales_common.models.Campaign + isales_common.schemas.campaign.
// PR #3 ships only the columns the list / basic-edit form needs; later PRs
// (nested role / filler / callback configs) widen this.

export interface CampaignSummary {
  id: number;
  name: string;
  voice_id: number | null;
  concurrency: number;
  default_replies: string[];
  // Counts come from /analytics — for the basic list we read them off the
  // dedicated /analytics/by_campaign endpoint and merge client-side.
}

export interface CampaignCreate {
  name: string;
  voice_id?: number | null;
  concurrency?: number;
  default_replies?: string[];
}

export interface CampaignUpdate extends Partial<CampaignCreate> {}
