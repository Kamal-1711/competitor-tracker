/**
 * Processes pending crawl jobs from the database.
 * Run with: npx tsx scripts/run-crawl-worker.ts
 * Requires: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY in env.
 */

import { createClient } from "@supabase/supabase-js";
import { crawlCompetitor } from "../crawler/crawlCompetitor";

function getEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env: ${name}`);
  return v;
}

async function main() {
  const supabaseUrl = getEnv("NEXT_PUBLIC_SUPABASE_URL");
  const serviceKey = getEnv("SUPABASE_SERVICE_ROLE_KEY");
  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: jobs, error } = await supabase
    .from("crawl_jobs")
    .select("id, competitor_id")
    .eq("status", "pending")
    .order("created_at", { ascending: true })
    .limit(1);

  if (error) {
    console.error("Failed to fetch pending jobs:", error);
    process.exit(1);
  }

  if (!jobs?.length) {
    console.log("No pending crawl jobs.");
    return;
  }

  const job = jobs[0];
  const { data: competitor, error: compError } = await supabase
    .from("competitors")
    .select("id, url")
    .eq("id", job.competitor_id)
    .single();

  if (compError || !competitor?.url) {
    console.error("Competitor not found for job", job.id);
    await supabase
      .from("crawl_jobs")
      .update({
        status: "failed",
        completed_at: new Date().toISOString(),
        error_message: "Competitor not found or missing URL",
      })
      .eq("id", job.id);
    return;
  }

  console.log(`Processing job ${job.id} for competitor ${competitor.id}`);

  const result = await crawlCompetitor({
    competitorId: competitor.id,
    competitorUrl: competitor.url,
    existingCrawlJobId: job.id,
  });

  console.log(
    `Job ${job.id} finished: ${result.status}, pages: ${result.pages.length}, errors: ${result.errors.length}`
  );
  if (result.errors.length) {
    console.error("Crawl errors:", result.errors);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
