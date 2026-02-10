import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { PAGE_TAXONOMY, type PageType } from "@/lib/PAGE_TAXONOMY";

type SnapshotSignalRow = {
  page_type: PageType;
  page_title: string | null;
  h1_text: string | null;
  h2_headings: string[] | null;
  primary_cta_text: string | null;
  secondary_cta_text: string | null;
  nav_labels: string[] | null;
  captured_at: string | null;
};

function getRequiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing environment variable: ${name}`);
  return value;
}

function createSupabaseAdminClient(): SupabaseClient {
  const supabaseUrl = getRequiredEnv("NEXT_PUBLIC_SUPABASE_URL");
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY || getRequiredEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");

  return createClient(supabaseUrl, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function normalizeTextParts(parts: Array<string | null | undefined>): string {
  return parts
    .filter((p): p is string => Boolean(p && p.trim()))
    .join(" ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function countOccurrences(haystack: string, keywords: string[]): number {
  let count = 0;
  for (const keyword of keywords) {
    if (!keyword) continue;
    const re = new RegExp(`\\b${keyword.replace(/[.*+?^${}()|[\\]\\\\]/g, "\\$&")}\\b`, "gi");
    const matches = haystack.match(re);
    if (matches) count += matches.length;
  }
  return count;
}

function deriveHomepageMessagingTheme(snapshot: SnapshotSignalRow): string | null {
  const text = normalizeTextParts([snapshot.h1_text, ...(snapshot.h2_headings ?? [])]);
  if (!text) return null;

  const themeGroups: Array<{ theme: string; keywords: string[] }> = [
    { theme: "collaboration", keywords: ["collaboration", "collaborate", "team", "teams", "together"] },
    { theme: "productivity", keywords: ["productivity", "efficient", "efficiency", "faster", "workflow", "workflows"] },
    { theme: "security", keywords: ["security", "secure", "compliance", "trust", "governance"] },
    { theme: "scale", keywords: ["scale", "scalable", "scalability", "global", "performance"] },
    { theme: "automation", keywords: ["automation", "automate", "automated", "streamline"] },
    { theme: "enterprise", keywords: ["enterprise", "enterprises", "organization", "org", "admins"] },
  ];

  let best: { theme: string; score: number } | null = null;
  for (const group of themeGroups) {
    const score = countOccurrences(text, group.keywords);
    if (!best || score > best.score) best = { theme: group.theme, score };
  }

  if (!best || best.score <= 0) return null;
  return best.theme;
}

function deriveGtmMotion(primaryCta: string | null, secondaryCta: string | null): string | null {
  const p = (primaryCta ?? "").toLowerCase();
  const s = (secondaryCta ?? "").toLowerCase();

  const isSalesLed = (t: string) => /(contact sales|talk to sales|book demo|request demo)/i.test(t);
  const isSelfServe = (t: string) => /(get started|free trial|start free|sign up|signup)/i.test(t);

  const primarySales = isSalesLed(p);
  const primarySelf = isSelfServe(p);
  const secondarySales = isSalesLed(s);
  const secondarySelf = isSelfServe(s);

  if ((primarySales && secondarySelf) || (primarySelf && secondarySales)) return "a hybrid";
  if (primarySales) return "a sales-led";
  if (primarySelf) return "a self-serve";
  if (secondarySales && !secondarySelf) return "a sales-led";
  if (secondarySelf && !secondarySales) return "a self-serve";
  return null;
}

function derivePricingNarrative(snapshot: SnapshotSignalRow): string | null {
  const text = normalizeTextParts([snapshot.h1_text, snapshot.page_title, ...(snapshot.h2_headings ?? [])]);
  if (!text) return null;

  const hasEnterprise = /\benterprise\b/i.test(text);
  const hasCustom = /\bcustom\b/i.test(text);
  const hasFreeOrTrial = /\bfree\b/i.test(text) || /\btrial\b/i.test(text);

  if (hasEnterprise) return "Enterprise positioning emphasized.";
  if (hasCustom) return "Sales-driven monetization signaled via custom packaging.";
  if (hasFreeOrTrial) return "Growth-led pricing motion signaled via free or trial language.";
  return null;
}

function deriveCapabilityTheme(snapshot: SnapshotSignalRow): string | null {
  const text = normalizeTextParts([snapshot.h1_text, ...(snapshot.h2_headings ?? [])]);
  if (!text) return null;

  const groups: Array<{ theme: string; keywords: string[] }> = [
    { theme: "automation", keywords: ["automation", "automate", "workflow", "workflows", "streamline"] },
    { theme: "integrations", keywords: ["integration", "integrations", "connect", "connectors", "api"] },
    { theme: "analytics", keywords: ["analytics", "insights", "reporting", "dashboard", "metrics"] },
    { theme: "security", keywords: ["security", "secure", "compliance", "governance"] },
  ];

  let best: { theme: string; score: number } | null = null;
  for (const group of groups) {
    const score = countOccurrences(text, group.keywords);
    if (!best || score > best.score) best = { theme: group.theme, score };
  }

  if (!best || best.score <= 0) return null;
  return best.theme;
}

async function hasRecentWebpageSignalInsight(params: {
  supabase: SupabaseClient;
  competitorId: string;
  pageType: PageType;
  insightText: string;
}): Promise<boolean> {
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await params.supabase
    .from("insights")
    .select("id")
    .eq("competitor_id", params.competitorId)
    .eq("page_type", params.pageType)
    .eq("insight_type", "webpage_signal")
    .eq("insight_text", params.insightText)
    .gte("created_at", since)
    .limit(1)
    .maybeSingle();

  if (error) return false;
  return Boolean(data?.id);
}

export async function persistWebpageSignalInsights(params: {
  competitorId: string;
}): Promise<void> {
  const supabase = createSupabaseAdminClient();

  const { data, error } = await supabase
    .from("snapshots")
    .select(
      "page_type, page_title, h1_text, h2_headings, primary_cta_text, secondary_cta_text, nav_labels, captured_at"
    )
    .eq("competitor_id", params.competitorId)
    .order("captured_at", { ascending: false })
    .limit(60);

  // If schema isn't upgraded yet, don't fail the crawl.
  if (error) return;

  const rows = (data ?? []) as SnapshotSignalRow[];
  const latestByType = new Map<PageType, SnapshotSignalRow>();
  for (const row of rows) {
    if (!latestByType.has(row.page_type)) latestByType.set(row.page_type, row);
  }

  const inserts: Array<{
    competitor_id: string;
    page_type: PageType;
    insight_type: "webpage_signal";
    insight_text: string;
    confidence: "High";
    related_change_ids: string[];
  }> = [];

  const homepage = latestByType.get(PAGE_TAXONOMY.HOMEPAGE);
  if (homepage) {
    const theme = deriveHomepageMessagingTheme(homepage);
    if (theme) {
      const text = `Homepage messaging emphasizes ${theme}.`;
      const exists = await hasRecentWebpageSignalInsight({
        supabase,
        competitorId: params.competitorId,
        pageType: PAGE_TAXONOMY.HOMEPAGE,
        insightText: text,
      });
      if (!exists) {
        inserts.push({
          competitor_id: params.competitorId,
          page_type: PAGE_TAXONOMY.HOMEPAGE,
          insight_type: "webpage_signal",
          insight_text: text,
          confidence: "High",
          related_change_ids: [],
        });
      }
    }

    const motion = deriveGtmMotion(homepage.primary_cta_text, homepage.secondary_cta_text);
    if (motion) {
      const text = `Primary CTA suggests ${motion} go-to-market strategy.`;
      const exists = await hasRecentWebpageSignalInsight({
        supabase,
        competitorId: params.competitorId,
        pageType: PAGE_TAXONOMY.HOMEPAGE,
        insightText: text,
      });
      if (!exists) {
        inserts.push({
          competitor_id: params.competitorId,
          page_type: PAGE_TAXONOMY.HOMEPAGE,
          insight_type: "webpage_signal",
          insight_text: text,
          confidence: "High",
          related_change_ids: [],
        });
      }
    }
  }

  const pricing = latestByType.get(PAGE_TAXONOMY.PRICING);
  if (pricing) {
    const narrative = derivePricingNarrative(pricing);
    if (narrative) {
      const text = `Pricing narrative: ${narrative}`;
      const exists = await hasRecentWebpageSignalInsight({
        supabase,
        competitorId: params.competitorId,
        pageType: PAGE_TAXONOMY.PRICING,
        insightText: text,
      });
      if (!exists) {
        inserts.push({
          competitor_id: params.competitorId,
          page_type: PAGE_TAXONOMY.PRICING,
          insight_type: "webpage_signal",
          insight_text: text,
          confidence: "High",
          related_change_ids: [],
        });
      }
    }
  }

  const capabilitySource =
    latestByType.get(PAGE_TAXONOMY.PRODUCT_OR_SERVICES) ??
    latestByType.get(PAGE_TAXONOMY.USE_CASES_OR_INDUSTRIES);
  if (capabilitySource) {
    const theme = deriveCapabilityTheme(capabilitySource);
    if (theme) {
      const text = `Product capabilities emphasize ${theme}.`;
      const exists = await hasRecentWebpageSignalInsight({
        supabase,
        competitorId: params.competitorId,
        pageType: capabilitySource.page_type,
        insightText: text,
      });
      if (!exists) {
        inserts.push({
          competitor_id: params.competitorId,
          page_type: capabilitySource.page_type,
          insight_type: "webpage_signal",
          insight_text: text,
          confidence: "High",
          related_change_ids: [],
        });
      }
    }
  }

  if (inserts.length === 0) return;
  await supabase.from("insights").insert(inserts);
}

