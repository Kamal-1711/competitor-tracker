import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { DetectedChange } from "@/lib/change-detection/detectChanges";
import { getSocketServer } from "./socketServer";

let supabaseAdmin: SupabaseClient | null = null;
const workspaceByCompetitor = new Map<string, string | null>();

function getRequiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing environment variable: ${name}`);
  }
  return value;
}

function getSupabaseAdminClient(): SupabaseClient {
  if (supabaseAdmin) return supabaseAdmin;
  const supabaseUrl = getRequiredEnv("NEXT_PUBLIC_SUPABASE_URL");
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || getRequiredEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  supabaseAdmin = createClient(supabaseUrl, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return supabaseAdmin;
}

async function getWorkspaceIdForCompetitor(competitorId: string): Promise<string | null> {
  if (workspaceByCompetitor.has(competitorId)) {
    return workspaceByCompetitor.get(competitorId) ?? null;
  }

  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("competitors")
    .select("workspace_id")
    .eq("id", competitorId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to resolve workspace for competitor ${competitorId}: ${error.message}`);
  }

  const workspaceId = (data as { workspace_id?: string | null } | null)?.workspace_id ?? null;
  workspaceByCompetitor.set(competitorId, workspaceId);
  return workspaceId;
}

export async function emitCrawlCompleted(params: { competitorId: string }) {
  try {
    const io = getSocketServer();
    if (!io) return;

    const workspaceId = await getWorkspaceIdForCompetitor(params.competitorId);
    if (!workspaceId) return;

    io.to(workspaceId).emit("crawl_completed", {
      competitorId: params.competitorId,
      timestamp: new Date(),
      message: "Crawl completed successfully",
    });
  } catch (error) {
    console.error("Socket emit failed", error);
  }
}

export async function emitHighImpactChange(params: {
  competitorId: string;
  detectedChanges: DetectedChange[];
}) {
  try {
    const io = getSocketServer();
    if (!io || params.detectedChanges.length === 0) return;

    const workspaceId = await getWorkspaceIdForCompetitor(params.competitorId);
    if (!workspaceId) return;

    io.to(workspaceId).emit("high_impact_change", {
      competitorId: params.competitorId,
      changeSummary: params.detectedChanges.map((change) => change.summary),
      severity: "high",
    });
  } catch (error) {
    console.error("Socket emit failed", error);
  }
}

export async function emitBlogNewPost(params: {
  competitorId: string;
  postTitle: string;
  url: string;
}) {
  try {
    const io = getSocketServer();
    if (!io) return;

    const workspaceId = await getWorkspaceIdForCompetitor(params.competitorId);
    if (!workspaceId) return;

    io.to(workspaceId).emit("blog_new_post", {
      competitorId: params.competitorId,
      postTitle: params.postTitle,
      url: params.url,
      timestamp: new Date(),
    });
  } catch (error) {
    console.error("Socket emit failed", error);
  }
}
