export type CrawlFrequency = "daily" | "weekly";
export type { PageType } from "@/lib/PAGE_TAXONOMY";

export interface Competitor {
  id: string;
  workspace_id: string;
  name: string | null;
  url: string;
  last_crawled_at: string | null;
  crawl_frequency: CrawlFrequency;
  created_at: string;
  updated_at: string;
}
