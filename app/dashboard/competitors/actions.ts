"use server";

import { cookies, headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { CrawlFrequency } from "@/lib/types/competitor";

const DUMMY_AUTH_COOKIE = "ct_dummy_auth";

function getCompetitorsPath() {
  return "/dashboard/competitors";
}

/** Returns workspace id if authenticated (real user or dummy cookie), else null. */
async function requireWorkspace(): Promise<string | null> {
  return getOrCreateWorkspaceId();
}

export async function getOrCreateWorkspaceId(): Promise<string | null> {
  const cookieStore = await cookies();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const hasDummyAuth = cookieStore.get(DUMMY_AUTH_COOKIE)?.value === "1";

  // MVP: no onboarding. If there's no authenticated user (or dummy auth is used),
  // fall back to a shared workspace with `owner_id = null`.
  if (!user || hasDummyAuth) {
    let { data: workspace } = await supabase
      .from("workspaces")
      .select("id")
      .is("owner_id", null)
      .limit(1)
      .maybeSingle();

    if (!workspace) {
      const { data: created } = await supabase
        .from("workspaces")
        .insert({ name: "My Workspace", owner_id: null })
        .select("id")
        .single();
      workspace = created ?? null;
    }

    return workspace?.id ?? null;
  }

  const { data: workspace } = await supabase
    .from("workspaces")
    .select("id")
    .eq("owner_id", user.id)
    .limit(1)
    .single();

  if (workspace) return workspace.id;

  const { data: newWorkspace, error } = await supabase
    .from("workspaces")
    .insert({ name: "Default", owner_id: user.id })
    .select("id")
    .single();

  if (error || !newWorkspace) return null;
  return newWorkspace.id;
}

export type AddCompetitorResult = { ok: true } | { ok: false; error: string };

export async function addCompetitor(formData: FormData): Promise<AddCompetitorResult> {
  const url = (formData.get("url") as string)?.trim();
  if (!url) return { ok: false, error: "URL is required" };

  const crawlFrequency = (formData.get("crawl_frequency") as string)?.trim();
  const frequency: CrawlFrequency =
    crawlFrequency === "daily" || crawlFrequency === "weekly" ? crawlFrequency : "weekly";

  let parsed: URL;
  try {
    parsed = new URL(url.startsWith("http") ? url : `https://${url}`);
  } catch {
    return { ok: false, error: "Invalid URL" };
  }

  const name = parsed.hostname.replace(/^www\./, "");

  const workspaceId = await requireWorkspace();
  if (!workspaceId) return { ok: false, error: "Could not resolve workspace" };

  const supabase = await createClient();

  const { error } = await supabase.from("competitors").insert({
    workspace_id: workspaceId,
    url: parsed.origin,
    name,
    crawl_frequency: frequency,
  });

  if (error) {
    if (error.code === "23505") return { ok: false, error: "This competitor URL already exists" };
    return { ok: false, error: error.message };
  }

  revalidatePath(getCompetitorsPath());
  revalidatePath("/dashboard");
  return { ok: true };
}

export type UpdateCrawlFrequencyResult = { ok: true } | { ok: false; error: string };

export async function updateCrawlFrequency(
  competitorId: string,
  crawlFrequency: CrawlFrequency
): Promise<UpdateCrawlFrequencyResult> {
  const workspaceId = await requireWorkspace();
  if (!workspaceId) return { ok: false, error: "Not authenticated" };

  const supabase = await createClient();
  const { data: competitor } = await supabase
    .from("competitors")
    .select("id")
    .eq("id", competitorId)
    .eq("workspace_id", workspaceId)
    .single();
  if (!competitor) return { ok: false, error: "Not authorized" };

  const { error } = await supabase
    .from("competitors")
    .update({ crawl_frequency: crawlFrequency, updated_at: new Date().toISOString() })
    .eq("id", competitorId);

  if (error) return { ok: false, error: error.message };
  revalidatePath(getCompetitorsPath());
  return { ok: true };
}

export type UpdateCompetitorResult = { ok: true } | { ok: false; error: string };

export async function updateCompetitor(
  competitorId: string,
  payload: { name?: string | null; url?: string; crawl_frequency?: CrawlFrequency }
): Promise<UpdateCompetitorResult> {
  const workspaceId = await requireWorkspace();
  if (!workspaceId) return { ok: false, error: "Not authenticated" };

  const supabase = await createClient();
  const { data: competitor } = await supabase
    .from("competitors")
    .select("id, workspace_id")
    .eq("id", competitorId)
    .eq("workspace_id", workspaceId)
    .single();

  if (!competitor) return { ok: false, error: "Not authorized" };

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (payload.name !== undefined) updates.name = payload.name || null;
  if (payload.crawl_frequency !== undefined) updates.crawl_frequency = payload.crawl_frequency;
  if (payload.url !== undefined) {
    try {
      const parsed = new URL(payload.url.startsWith("http") ? payload.url : `https://${payload.url}`);
      updates.url = parsed.origin;
    } catch {
      return { ok: false, error: "Invalid URL" };
    }
  }

  const { error } = await supabase
    .from("competitors")
    .update(updates)
    .eq("id", competitorId);

  if (error) return { ok: false, error: error.message };
  revalidatePath(getCompetitorsPath());
  return { ok: true };
}

export type DeleteCompetitorResult = { ok: true } | { ok: false; error: string };

export async function deleteCompetitor(competitorId: string): Promise<DeleteCompetitorResult> {
  const workspaceId = await requireWorkspace();
  if (!workspaceId) return { ok: false, error: "Not authenticated" };

  const supabase = await createClient();
  const { data: competitor } = await supabase
    .from("competitors")
    .select("id")
    .eq("id", competitorId)
    .eq("workspace_id", workspaceId)
    .single();
  if (!competitor) return { ok: false, error: "Not authorized" };

  const { error } = await supabase.from("competitors").delete().eq("id", competitorId);

  if (error) return { ok: false, error: error.message };
  revalidatePath(getCompetitorsPath());
  return { ok: true };
}

export type TriggerCrawlResult = { ok: true; jobId: string } | { ok: false; error: string };

export type CrawlJobStatus =
  | "pending"
  | "running"
  | "completed"
  | "failed";

export type CrawlJobResult =
  | {
    ok: true;
    job: {
      id: string;
      competitor_id: string;
      status: CrawlJobStatus;
      created_at: string;
      started_at: string | null;
      completed_at: string | null;
      error_message: string | null;
    };
  }
  | { ok: false; error: string };

export async function getCrawlJob(jobId: string): Promise<CrawlJobResult> {
  const workspaceId = await requireWorkspace();
  if (!workspaceId) return { ok: false, error: "Not authenticated" };

  const supabase = await createClient();
  const { data: job, error: jobError } = await supabase
    .from("crawl_jobs")
    .select("id, competitor_id, status, created_at, started_at, completed_at, error_message")
    .eq("id", jobId)
    .single();

  if (jobError || !job) return { ok: false, error: "Crawl job not found" };

  const { data: competitor } = await supabase
    .from("competitors")
    .select("id, workspace_id")
    .eq("id", job.competitor_id)
    .eq("workspace_id", workspaceId)
    .single();

  if (!competitor) return { ok: false, error: "Not authorized" };

  return {
    ok: true,
    job: {
      id: String(job.id),
      competitor_id: String(job.competitor_id),
      status: job.status as CrawlJobStatus,
      created_at: String(job.created_at),
      started_at: job.started_at ? String(job.started_at) : null,
      completed_at: job.completed_at ? String(job.completed_at) : null,
      error_message: job.error_message ? String(job.error_message) : null,
    },
  };
}

/**
 * Trigger a crawl for a specific competitor.
 * Uses a DB-enforced enqueue function to avoid duplicate pending/running jobs.
 */
export async function triggerCrawlNow(competitorId: string): Promise<TriggerCrawlResult> {
  const workspaceId = await requireWorkspace();
  if (!workspaceId) return { ok: false, error: "Not authenticated" };

  const supabase = await createClient();
  const { data: competitor, error: compError } = await supabase
    .from("competitors")
    .select("id, workspace_id, url")
    .eq("id", competitorId)
    .eq("workspace_id", workspaceId)
    .single();

  if (compError || !competitor) {
    return { ok: false, error: "Competitor not found or not authorized" };
  }

  // Clean up stale jobs that have been pending/running for over 5 minutes
  await supabase
    .from("crawl_jobs")
    .update({
      status: "failed",
      completed_at: new Date().toISOString(),
      error_message: "Timed out (stale)",
    })
    .eq("competitor_id", competitorId)
    .in("status", ["pending", "running"])
    .lt("created_at", new Date(Date.now() - 5 * 60 * 1000).toISOString());

  const { data: jobId, error: enqueueError } = await supabase.rpc("enqueue_crawl_job", {
    p_competitor_id: competitorId,
    p_source: "manual",
  });

  if (enqueueError || !jobId) {
    return { ok: false, error: enqueueError?.message ?? "Failed to enqueue crawl job" };
  }

  // Fire-and-forget: trigger the crawl via local API route
  const headersList = await headers();
  const host = headersList.get("host") ?? "localhost:3000";
  const protocol = host.startsWith("localhost") ? "http" : "https";
  const baseUrl = `${protocol}://${host}`;
  fetch(`${baseUrl}/api/crawl`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jobId: String(jobId),
      competitorId,
      competitorUrl: competitor.url,
    }),
  }).catch((err) => {
    console.error("[triggerCrawlNow] Fire-and-forget crawl failed:", err);
  });

  revalidatePath(getCompetitorsPath());

  return { ok: true, jobId: String(jobId) };
}

export async function recoverSharedCompetitors() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not authenticated" };

  // 1. Get user workspace
  const { data: userWorkspace } = await supabase
    .from("workspaces")
    .select("id")
    .eq("owner_id", user.id)
    .single();

  if (!userWorkspace) return { ok: false, error: "User workspace not found" };

  // 2. Get shared workspace (the one with null owner)
  const { data: sharedWorkspace } = await supabase
    .from("workspaces")
    .select("id")
    .is("owner_id", null)
    .single();

  if (!sharedWorkspace || sharedWorkspace.id === userWorkspace.id) {
    return { ok: false, error: "No shared workspace found to recover from" };
  }

  // 3. Move competitors
  const { error: moveError } = await supabase
    .from("competitors")
    .update({ workspace_id: userWorkspace.id })
    .eq("workspace_id", sharedWorkspace.id);

  if (moveError) return { ok: false, error: moveError.message };

  // 4. Move related movements/insights (if they have workspace_id)
  // Some tables might link via competitor_id which doesn't change, but some might have workspace_id
  await supabase
    .from("strategic_movements")
    .update({ workspace_id: userWorkspace.id })
    .eq("workspace_id", sharedWorkspace.id);

  revalidatePath("/dashboard");
  revalidatePath("/insights");
  revalidatePath("/dashboard/competitors");

  return { ok: true };
}

