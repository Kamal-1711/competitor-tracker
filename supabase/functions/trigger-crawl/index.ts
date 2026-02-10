import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

interface TriggerCrawlRequest {
  crawlJobId: string;
}

async function triggerCrawl(req: TriggerCrawlRequest) {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error("Missing Supabase environment variables");
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  // Fetch crawl job
  const { data: job, error: jobError } = await supabase
    .from("crawl_jobs")
    .select("*, competitors(id, workspace_id, url, name)")
    .eq("id", req.crawlJobId)
    .single();

  if (jobError || !job) {
    throw new Error(`Crawl job not found: ${jobError?.message}`);
  }

  try {
    // Mark job as running
    await supabase
      .from("crawl_jobs")
      .update({
        status: "running",
        started_at: new Date().toISOString(),
      })
      .eq("id", req.crawlJobId);

    // Note: In a real implementation, you would call crawlCompetitor here
    // For now, we'll simulate a successful crawl
    // import { crawlCompetitor } from "@/crawler/crawlCompetitor";
    // const result = await crawlCompetitor({
    //   competitorId: job.competitor_id,
    //   competitorUrl: job.competitors.url,
    // });

    // Simulate crawl delay
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Mark job as completed
    const completedAt = new Date().toISOString();
    await supabase
      .from("crawl_jobs")
      .update({
        status: "completed",
        completed_at: completedAt,
      })
      .eq("id", req.crawlJobId);

    // Update competitor's last_crawled_at
    await supabase
      .from("competitors")
      .update({
        last_crawled_at: completedAt,
        updated_at: completedAt,
      })
      .eq("id", job.competitor_id);

    return {
      ok: true,
      message: "Crawl completed successfully",
      jobId: req.crawlJobId,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);

    // Mark job as failed
    await supabase
      .from("crawl_jobs")
      .update({
        status: "failed",
        completed_at: new Date().toISOString(),
        error_message: errorMessage,
      })
      .eq("id", req.crawlJobId);

    throw error;
  }
}

serve(async (req) => {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body: TriggerCrawlRequest = await req.json();

    if (!body.crawlJobId) {
      return new Response(
        JSON.stringify({ error: "crawlJobId is required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const result = await triggerCrawl(body);

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in trigger-crawl:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
