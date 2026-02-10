import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { changeDetectionError } from "@/lib/log/crawl";
import type { DetectedChange, PageType, ChangeType } from "./detectChanges";
import type { ChangeCategory } from "./classifyChange";

export interface PersistChangesInput {
  competitorId: string;
  pageId: string;
  beforeSnapshotId: string;
  afterSnapshotId: string;
  pageUrl: string;
  pageType: PageType;
  changes: DetectedChange[];
}

export interface PersistChangesResult {
  changeIds: string[];
}

function getRequiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing environment variable: ${name}`);
  return value;
}

function createSupabaseAdminClient(): SupabaseClient {
  const supabaseUrl = getRequiredEnv("NEXT_PUBLIC_SUPABASE_URL");
  const serviceKey = getRequiredEnv("SUPABASE_SERVICE_ROLE_KEY");
  return createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function toDbRow(input: PersistChangesInput, change: DetectedChange) {
  return {
    competitor_id: input.competitorId,
    page_id: input.pageId,
    before_snapshot_id: input.beforeSnapshotId,
    after_snapshot_id: input.afterSnapshotId,
    page_url: input.pageUrl,
    page_type: input.pageType,
    change_type: change.changeType as ChangeType,
    category: (change.category ?? "Navigation / Structure") as ChangeCategory,
    summary: change.summary,
    details: {
      before: change.before ?? null,
      after: change.after ?? null,
      ...change.details,
    },
  };
}

/**
 * Persist detected changes into `public.changes`.
 * Uses Supabase service role (server-side only).
 * Logs and rethrows on failure so callers can degrade gracefully.
 */
export async function persistChanges(input: PersistChangesInput): Promise<PersistChangesResult> {
  if (input.changes.length === 0) return { changeIds: [] };

  const supabase = createSupabaseAdminClient();
  const rows = input.changes.map((c) => toDbRow(input, c));

  const { data, error } = await supabase.from("changes").insert(rows).select("id");
  if (error) {
    changeDetectionError({
      pageUrl: input.pageUrl,
      pageType: input.pageType,
      competitorId: input.competitorId,
      message: "Failed to persist changes",
      cause: error.message,
    });
    throw new Error(`Failed to persist changes: ${error.message}`);
  }

  return {
    changeIds: (data ?? []).map((row) => String((row as { id: string }).id)),
  };
}

