import { createClient as createServerClient } from "@/lib/supabase/server";

export type JobStatus = "pending" | "running" | "completed" | "failed";

export interface CrawlJobUpdate {
  jobId: string;
  status: JobStatus;
  startedAt?: Date;
  completedAt?: Date;
  errorMessage?: string;
}

/**
 * Update crawl job status and timestamps
 * Used by Edge Functions and server actions
 */
export async function updateCrawlJobStatus({
  jobId,
  status,
  startedAt,
  completedAt,
  errorMessage,
}: CrawlJobUpdate): Promise<void> {
  const supabase = await createServerClient();

  const updates: Record<string, unknown> = {
    status,
  };

  if (startedAt) updates.started_at = startedAt.toISOString();
  if (completedAt) updates.completed_at = completedAt.toISOString();
  if (errorMessage) updates.error_message = errorMessage;

  const { error } = await supabase
    .from("crawl_jobs")
    .update(updates)
    .eq("id", jobId);

  if (error) {
    throw new Error(`Failed to update crawl job: ${error.message}`);
  }
}

/**
 * Update competitor's last_crawled_at timestamp after successful crawl
 */
export async function updateCompetitorLastCrawled(competitorId: string): Promise<void> {
  const supabase = await createServerClient();
  const now = new Date().toISOString();

  const { error } = await supabase
    .from("competitors")
    .update({
      last_crawled_at: now,
      updated_at: now,
    })
    .eq("id", competitorId);

  if (error) {
    throw new Error(`Failed to update competitor: ${error.message}`);
  }
}
