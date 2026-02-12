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

type ImpactLevel = "Minor" | "Moderate" | "Strategic";

function deriveImpactLevel(change: DetectedChange): ImpactLevel {
  // Pricing text-level shifts and CTA text changes are usually moderate impact.
  if (change.changeType === "cta_text_change") {
    return "Moderate";
  }

  if (change.changeType === "text_change" && change.pageType === "pricing") {
    return "Moderate";
  }

  // Structural navigation tweaks and generic block adds/removals default to minor.
  if (change.changeType === "nav_change") {
    return "Minor";
  }

  // homepage / positioning or services structural changes are often strategic.
  if (
    (change.pageType === "homepage" || change.category === "Positioning & Messaging") &&
    (change.changeType === "text_change" || change.changeType === "element_added" || change.changeType === "element_removed")
  ) {
    return "Strategic";
  }

  if (
    change.category === "Product / Services" &&
    (change.changeType === "element_added" || change.changeType === "element_removed")
  ) {
    return "Strategic";
  }

  // Trust & Credibility additions (e.g. logos, case studies) sit between minor and strategic.
  if (change.category === "Trust & Credibility" && change.changeType === "element_added") {
    return "Moderate";
  }

  return "Minor";
}

function deriveInterpretation(change: DetectedChange, impact: ImpactLevel): string {
  const base =
    change.category === "Positioning & Messaging"
      ? "Positioning or messaging has shifted on a monitored surface."
      : change.category === "Pricing & Offers"
      ? "Pricing or packaging signals have been adjusted."
      : change.category === "Product / Services"
      ? "Service or offering structure appears to be evolving."
      : change.category === "Trust & Credibility"
      ? "Customer proof or trust signals have been updated."
      : "Site structure or navigation has been adjusted.";

  if (impact === "Strategic") {
    return `${base} This reads as a strategic-level change rather than a routine edit.`;
  }

  if (impact === "Moderate") {
    return `${base} This may influence near-term funnel or evaluation pathways.`;
  }

  return `${base} Current signal suggests a contained, incremental adjustment.`;
}

function deriveSuggestedAction(change: DetectedChange, impact: ImpactLevel): string {
  if (change.category === "Pricing & Offers") {
    return impact === "Strategic"
      ? "Review pricing surfaces in detail and monitor for follow-on adjustments in upcoming crawls."
      : "Keep an eye on pricing pages for additional tweaks before treating this as a pattern.";
  }

  if (change.category === "Positioning & Messaging") {
    return impact === "Strategic"
      ? "Track homepage and key messaging pages for additional narrative shifts over the next few crawls."
      : "Monitor whether this messaging change stabilizes or is followed by further experimentation.";
  }

  if (change.category === "Product / Services") {
    return "Monitor services and solution pages for further additions or consolidation that clarify the offer map.";
  }

  if (change.category === "Trust & Credibility") {
    return "Watch for additional proof assets and ensure they align with the segments you care most about.";
  }

  // Navigation / Structure
  return impact === "Strategic"
    ? "Confirm that navigation still reflects core buyer journeys and watch for additional IA changes."
    : "Keep monitoring navigation structure; escalate only if a pattern of structural change emerges.";
}

function getRequiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing environment variable: ${name}`);
  return value;
}

function createSupabaseAdminClient(): SupabaseClient {
  const supabaseUrl = getRequiredEnv("NEXT_PUBLIC_SUPABASE_URL");
  // Prefer service role key; fall back to anon key (works when RLS is disabled)
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    getRequiredEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  return createClient(supabaseUrl, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function toDbRow(input: PersistChangesInput, change: DetectedChange) {
  const impactLevel = deriveImpactLevel(change);
  const strategicInterpretation = deriveInterpretation(change, impactLevel);
  const suggestedMonitoringAction = deriveSuggestedAction(change, impactLevel);

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
    impact_level: impactLevel,
    strategic_interpretation: strategicInterpretation,
    suggested_monitoring_action: suggestedMonitoringAction,
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

