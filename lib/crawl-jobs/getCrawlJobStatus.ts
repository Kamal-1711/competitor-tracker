import { createClient as createServerClient } from "@/lib/supabase/server";

export interface CrawlJobStatus {
  id: string;
  competitor_id: string;
  status: "pending" | "running" | "completed" | "failed";
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
  error_message: string | null;
}

/**
 * Fetch crawl job status and details
 */
export async function getCrawlJobStatus(jobId: string): Promise<CrawlJobStatus | null> {
  const supabase = await createServerClient();

  const { data, error } = await supabase
    .from("crawl_jobs")
    .select("id, competitor_id, status, created_at, started_at, completed_at, error_message")
    .eq("id", jobId)
    .single();

  if (error) {
    console.error("Failed to fetch crawl job:", error);
    return null;
  }

  return data as CrawlJobStatus;
}

/**
 * Check if a competitor has a recent running or pending crawl job
 */
export async function hasRecentCrawlJob(
  competitorId: string,
  withinMinutes: number = 5
): Promise<boolean> {
  const supabase = await createServerClient();
  const threshold = new Date(Date.now() - withinMinutes * 60 * 1000).toISOString();

  const { data, error } = await supabase
    .from("crawl_jobs")
    .select("id")
    .eq("competitor_id", competitorId)
    .gte("created_at", threshold)
    .in("status", ["pending", "running"])
    .limit(1)
    .single();

  if (error && error.code !== "PGRST116") {
    // PGRST116 is "not found" which is expected
    console.error("Error checking recent crawl jobs:", error);
  }

  return !!data;
}
