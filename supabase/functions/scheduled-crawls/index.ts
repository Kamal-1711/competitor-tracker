import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

interface ScheduledCrawlConfig {
  crawlJobId: string;
}

async function runScheduledCrawls() {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error("Missing Supabase environment variables");
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  // Find competitors that need crawling based on frequency and last_crawled_at
  const dailyThreshold = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const weeklyThreshold = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const { data: competitors, error: queryError } = await supabase
    .from("competitors")
    .select("id, workspace_id, url, name, crawl_frequency, last_crawled_at")
    .or(
      `and(crawl_frequency.eq.daily,or(last_crawled_at.is.null,last_crawled_at.lt.${dailyThreshold})),and(crawl_frequency.eq.weekly,or(last_crawled_at.is.null,last_crawled_at.lt.${weeklyThreshold}))`
    );

  if (queryError) {
    throw new Error(`Failed to fetch competitors: ${queryError.message}`);
  }

  if (!competitors || competitors.length === 0) {
    return {
      ok: true,
      message: "No competitors need crawling",
      jobsCreated: 0,
    };
  }

  const createdJobs = [];

  for (const competitor of competitors) {
    try {
      const { data: jobId, error: enqueueError } = await supabase.rpc(
        "enqueue_crawl_job",
        {
          p_competitor_id: competitor.id,
          p_source: "scheduled",
        }
      );

      if (enqueueError) {
        console.error(
          `Failed to enqueue job for competitor ${competitor.id}:`,
          enqueueError
        );
        continue;
      }

      if (jobId) {
        createdJobs.push(jobId);
      }
    } catch (error) {
      console.error(`Error processing competitor ${competitor.id}:`, error);
    }
  }

  return {
    ok: true,
    message: `Scheduled crawl cycle completed`,
    jobsCreated: createdJobs.length,
    jobIds: createdJobs,
  };
}

serve(async (req) => {
  // This function is triggered by Supabase's cron scheduler
  // It can also be manually called via HTTP for testing

  try {
    const result = await runScheduledCrawls();
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in scheduled-crawls:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
});
