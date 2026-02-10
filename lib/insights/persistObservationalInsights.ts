import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { PageType } from "@/lib/PAGE_TAXONOMY";

function getRequiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing environment variable: ${name}`);
  return value;
}

function createSupabaseAdminClient(): SupabaseClient {
  const supabaseUrl = getRequiredEnv("NEXT_PUBLIC_SUPABASE_URL");
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    getRequiredEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");

  return createClient(supabaseUrl, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function toObservationText(pageType: PageType): string {
  switch (pageType) {
    case "homepage":
      return "Homepage is actively monitored.";
    case "pricing":
      return "Pricing page detected and tracked.";
    case "product_or_services":
      return "Services pages under continuous observation.";
    case "use_cases_or_industries":
      return "Use-case and industry pages are actively monitored.";
    case "case_studies_or_customers":
      return "Case studies and customer proof pages are tracked.";
    case "navigation":
      return "Navigation structure is actively monitored.";
    case "cta_elements":
      return "Primary CTA elements are actively monitored.";
    default:
      return "Page is actively monitored; no changes detected.";
  }
}

async function hasRecentObservationalInsight(
  supabase: SupabaseClient,
  competitorId: string,
  pageType: PageType,
  insightText: string
): Promise<boolean> {
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const { data, error } = await supabase
    .from("insights")
    .select("id")
    .eq("competitor_id", competitorId)
    .eq("page_type", pageType)
    .eq("insight_type", "observational")
    .eq("insight_text", insightText)
    .gte("created_at", since)
    .limit(1)
    .maybeSingle();

  if (error) return false;
  return Boolean(data?.id);
}

export async function persistObservationalInsights(params: {
  competitorId: string;
  pageTypes: PageType[];
}): Promise<void> {
  const uniquePageTypes = Array.from(new Set(params.pageTypes));
  if (uniquePageTypes.length === 0) return;

  const supabase = createSupabaseAdminClient();
  const rows: Array<{
    competitor_id: string;
    page_type: PageType;
    insight_type: "observational";
    insight_text: string;
    confidence: "High";
    related_change_ids: string[];
  }> = [];

  for (const pageType of uniquePageTypes) {
    const insightText = toObservationText(pageType);
    const exists = await hasRecentObservationalInsight(
      supabase,
      params.competitorId,
      pageType,
      insightText
    );
    if (!exists) {
      rows.push({
        competitor_id: params.competitorId,
        page_type: pageType,
        insight_type: "observational",
        insight_text: insightText,
        confidence: "High",
        related_change_ids: [],
      });
    }
  }

  if (rows.length === 0) return;

  const { error } = await supabase.from("insights").insert(rows);
  if (error) {
    throw new Error(`Failed to persist observational insights: ${error.message}`);
  }
}
