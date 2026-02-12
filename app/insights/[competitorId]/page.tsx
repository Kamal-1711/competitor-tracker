import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getOrCreateWorkspaceId } from "@/app/dashboard/competitors/actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { PAGE_TAXONOMY, type PageType } from "@/lib/PAGE_TAXONOMY";
import {
  deriveCompetitiveState,
  deriveServiceInsights,
  deriveStrategicConsiderations,
  type ChangeLike,
  type InsightLike,
  type ServiceSnapshot,
} from "@/lib/insights/competitiveStateLogic";
import {
  buildRawSignals,
  runIntelligenceEngine,
  type RawSignalsInput,
  BaselineProfile,
  StrategicModel,
  type StrategicRawSignals,
  type SnapshotSignal,
  buildCompetitiveSnapshot,
  SearchIntelligence,
  type SEOPageData,
} from "@/lib/intelligence-engine";
import { InsightsRealtimeListener } from "./insights-realtime-listener";
import { InsightsLiveSignalIndicator } from "./live-signal-indicator";

type PageRow = {
  page_type: PageType;
};

type InsightRow = {
  id: string;
  created_at: string;
  page_type: PageType;
  insight_type: string;
  insight_text: string;
  confidence: "High" | "Medium" | null;
  related_change_ids: string[];
};

type ChangeRow = {
  id: string;
  created_at: string;
  page_url: string;
  page_type: string;
  summary: string;
  change_type?: string | null;
  category?: string | null;
  before_snapshot: { screenshot_url: string | null } | { screenshot_url: string | null }[] | null;
  after_snapshot: { screenshot_url: string | null } | { screenshot_url: string | null }[] | null;
};

type ServiceSnapshotRow = {
  page_type: PageType;
  url: string;
  http_status: number | null;
  title: string | null;
  h2_headings: string[] | null;
  structured_content: ServiceSnapshot | null;
  captured_at: string | null;
};

type SeoSnapshotRow = {
  competitor_id: string;
  url: string;
  title: string | null;
  h1_text: string | null;
  h2_headings: string[] | null;
  h3_headings: string[] | null;
  nav_labels: string[] | null;
  structured_content: {
    search_seo?: {
      meta_description?: string;
      slug?: string;
      anchors?: string[];
      image_alt_text?: string[];
      word_count?: number;
    };
  } | null;
  captured_at: string | null;
};

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

function pickScreenshotUrl(
  snapshot: ChangeRow["before_snapshot"] | ChangeRow["after_snapshot"]
): string | null {
  if (!snapshot) return null;
  const record = Array.isArray(snapshot) ? snapshot[0] : snapshot;
  return record?.screenshot_url ?? null;
}

export default async function InsightDetailPage({
  params,
}: {
  params: Promise<{ competitorId: string }>;
}) {
  const { competitorId } = await params;
  const workspaceId = await getOrCreateWorkspaceId();

  if (!workspaceId) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-12">
        <p className="text-muted-foreground">You must be signed in to view insights.</p>
        <Button asChild>
          <Link href="/login">Sign in</Link>
        </Button>
      </div>
    );
  }

  const supabase = await createClient();

  const { data: competitor } = await supabase
    .from("competitors")
    .select("id, name, url, crawl_frequency, last_crawled_at, created_at")
    .eq("id", competitorId)
    .eq("workspace_id", workspaceId)
    .single();

  if (!competitor) notFound();

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const thirtyDaysAgoIso = thirtyDaysAgo.toISOString();

  const [pagesResult, insightsResult, recentChangesResult, changesLast30DaysResult, serviceSnapshotResult, baselineSnapshotsResult, seoSnapshotsResult, peerSeoSnapshotsResult, seoHistoryResult] =
    await Promise.all([
    supabase.from("pages").select("page_type").eq("competitor_id", competitorId),
    supabase
      .from("insights")
      .select("id, created_at, page_type, insight_type, insight_text, confidence, related_change_ids")
      .eq("competitor_id", competitorId)
      .order("created_at", { ascending: false })
      .limit(200),
    supabase
      .from("changes")
      .select(
        `
        id,
        created_at,
        page_url,
        page_type,
        change_type,
        summary,
        category,
        before_snapshot:snapshots!before_snapshot_id(screenshot_url),
        after_snapshot:snapshots!after_snapshot_id(screenshot_url)
      `
      )
      .eq("competitor_id", competitorId)
      .order("created_at", { ascending: false })
      .limit(5),
    supabase
      .from("changes")
      .select("created_at, page_type, category")
      .eq("competitor_id", competitorId)
      .gte("created_at", thirtyDaysAgoIso),
      supabase
        .from("snapshots")
        .select("page_type, url, http_status, title, h2_headings, structured_content, captured_at")
        .eq("competitor_id", competitorId)
        .in("page_type", [PAGE_TAXONOMY.SERVICES, PAGE_TAXONOMY.PRODUCT_OR_SERVICES])
        .order("captured_at", { ascending: false })
        .limit(5),
      supabase
        .from("snapshots")
        .select("page_type, url, http_status, title, h1_text, h2_headings, h3_headings, list_items, nav_labels, structured_content, captured_at")
        .eq("competitor_id", competitorId)
        .in("page_type", [
          PAGE_TAXONOMY.HOMEPAGE,
          PAGE_TAXONOMY.SERVICES,
          PAGE_TAXONOMY.CASE_STUDIES_OR_CUSTOMERS,
          PAGE_TAXONOMY.PRODUCT_OR_SERVICES,
          PAGE_TAXONOMY.PRICING,
        ])
        .order("captured_at", { ascending: false })
        .limit(40),
      supabase
        .from("snapshots")
        .select("competitor_id, url, title, h1_text, h2_headings, h3_headings, nav_labels, structured_content, captured_at")
        .eq("competitor_id", competitorId)
        .order("captured_at", { ascending: false })
        .limit(200),
      supabase
        .from("snapshots")
        .select("competitor_id, url, title, h1_text, h2_headings, h3_headings, nav_labels, structured_content, captured_at")
        .neq("competitor_id", competitorId)
        .order("captured_at", { ascending: false })
        .limit(400),
      supabase
        .from("seo_snapshots")
        .select("captured_at, seo_dimensions")
        .eq("competitor_id", competitorId)
        .order("captured_at", { ascending: false })
        .limit(3),
    ]);

  const pages = (pagesResult.data ?? []) as PageRow[];
  const insights = (insightsResult.data ?? []) as InsightRow[];
  const recentChanges = (recentChangesResult.data ?? []) as ChangeRow[];
  const changesLast30d = (changesLast30DaysResult.data ?? []) as ChangeLike[];
  const serviceSnapshots = (serviceSnapshotResult.data ?? []) as ServiceSnapshotRow[];
  const seoSnapshots = (seoSnapshotsResult.data ?? []) as SeoSnapshotRow[];
  const peerSeoSnapshots = (peerSeoSnapshotsResult.data ?? []) as SeoSnapshotRow[];
  const seoHistory = (seoHistoryResult.data ?? []) as Array<{
    captured_at: string;
    seo_dimensions: {
      topic_concentration: number;
      vertical_seo_focus: number;
      funnel_coverage_balance: number;
      content_investment_intensity: number;
      enterprise_seo_orientation: number;
      seo_momentum: number;
    };
  }>;
  const latestServicesSnapshot =
    serviceSnapshots.find((row) => row.page_type === PAGE_TAXONOMY.SERVICES) ?? serviceSnapshots[0] ?? null;
  const serviceSnapshot = (latestServicesSnapshot?.structured_content ?? null) as ServiceSnapshot | null;
  const isServicePageBlocked =
    latestServicesSnapshot?.page_type === PAGE_TAXONOMY.SERVICES &&
    (latestServicesSnapshot.http_status === 401 ||
      latestServicesSnapshot.http_status === 403) &&
    (latestServicesSnapshot.title ?? "").toLowerCase().includes("just a moment");

  const pageTypes = pages
    .map((page) => page.page_type)
    .filter((pageType): pageType is PageType =>
      (Object.values(PAGE_TAXONOMY) as string[]).includes(pageType as string)
    );
  const uniquePageTypes = Array.from(new Set(pageTypes));
  const insightsLast30d = insights.filter((insight) => new Date(insight.created_at) >= thirtyDaysAgo);
  const competitiveState = deriveCompetitiveState({
    changesLast30dCount: changesLast30d.length,
    trackedPageTypes: uniquePageTypes,
    insightsLast30d: insightsLast30d as InsightLike[],
    changesLast30d,
  });

  const webpageSignals = insights.filter((insight) => insight.insight_type === "webpage_signal");
  const messagingSignalsRaw = webpageSignals
    .filter((i) => i.page_type === PAGE_TAXONOMY.HOMEPAGE)
    .map((i) => i.insight_text)
    .filter((t) => t.toLowerCase().includes("homepage messaging emphasizes"))
    .slice(0, 2);
  const gtmSignalsRaw = webpageSignals
    .filter((i) => i.page_type === PAGE_TAXONOMY.HOMEPAGE)
    .map((i) => i.insight_text)
    .filter((t) => t.toLowerCase().includes("primary cta suggests"))
    .slice(0, 2);
  const pricingNarrativeRaw = webpageSignals
    .filter((i) => i.page_type === PAGE_TAXONOMY.PRICING)
    .map((i) => i.insight_text)
    .slice(0, 2);
  const capabilityFocusRaw = webpageSignals
    .filter(
      (i) =>
        i.page_type === PAGE_TAXONOMY.PRODUCT_OR_SERVICES ||
        i.page_type === PAGE_TAXONOMY.USE_CASES_OR_INDUSTRIES
    )
    .map((i) => i.insight_text)
    .filter((t) => t.toLowerCase().includes("product capabilities emphasize"))
    .slice(0, 2);

  const messagingSignals =
    messagingSignalsRaw.length > 0
      ? messagingSignalsRaw
      : uniquePageTypes.includes(PAGE_TAXONOMY.HOMEPAGE)
      ? ["Messaging emphasis is derived from homepage headlines and section themes."]
      : ["Messaging emphasis will populate as the homepage is detected and tracked."];

  const gtmSignals =
    gtmSignalsRaw.length > 0
      ? gtmSignalsRaw
      : uniquePageTypes.includes(PAGE_TAXONOMY.HOMEPAGE)
      ? ["Go-to-market motion is inferred from primary and secondary homepage CTAs."]
      : ["Go-to-market signals will populate once homepage CTAs are captured."];

  const pricingNarrative =
    pricingNarrativeRaw.length > 0
      ? pricingNarrativeRaw
      : uniquePageTypes.includes(PAGE_TAXONOMY.PRICING)
      ? ["Pricing narrative is derived from tier labels and repeated pricing language."]
      : ["Pricing narrative signals will populate if a pricing page is detected."];

  const capabilityFocus =
    capabilityFocusRaw.length > 0
      ? capabilityFocusRaw
      : uniquePageTypes.some(
          (t) => t === PAGE_TAXONOMY.PRODUCT_OR_SERVICES || t === PAGE_TAXONOMY.USE_CASES_OR_INDUSTRIES
        )
      ? ["Capability focus is derived from repeated product and services section headings."]
      : ["Capability focus signals will populate as product/services pages are detected."];

  const serviceInsights = deriveServiceInsights(serviceSnapshot);
  const serviceConsiderations = deriveStrategicConsiderations(serviceSnapshot);
  const serviceOverview = {
    totalServices: serviceSnapshot?.section_count ?? 0,
    primaryFocus: serviceSnapshot?.primary_focus ?? "Not enough signal yet",
    industries: serviceSnapshot?.industries ?? [],
  };
  const serviceEvidenceHeadings = latestServicesSnapshot?.h2_headings ?? [];

  // Baseline profile wiring
  const baselineSnapshots = (baselineSnapshotsResult.data ?? []) as Array<{
    page_type: PageType;
    url: string;
    http_status: number | null;
    title: string | null;
    h1_text: string | null;
    h2_headings: string[] | null;
    h3_headings: string[] | null;
    list_items: string[] | null;
    nav_labels: string[] | null;
    structured_content: unknown;
    captured_at: string | null;
  }>;

  function latestSnapshotOf(pageType: PageType): SnapshotSignal | null {
    const snapshot = baselineSnapshots.find((s) => s.page_type === pageType);
    return snapshot ?? null;
  }

  const homepageSnapshot = latestSnapshotOf(PAGE_TAXONOMY.HOMEPAGE);
  const servicesSnapshot = latestSnapshotOf(PAGE_TAXONOMY.SERVICES);
  const caseStudiesSnapshot = latestSnapshotOf(PAGE_TAXONOMY.CASE_STUDIES_OR_CUSTOMERS);
  const pricingSnapshot = latestSnapshotOf(PAGE_TAXONOMY.PRICING);

  const aboutLikePage =
    baselineSnapshots.find((s) =>
      /about|company|who-we-are/i.test(s.url ?? "") || /about/i.test(s.title ?? "")
    ) ?? null;

  const navSnapshot = homepageSnapshot;

  const baselineInput: BaselineProfile.BaselineInput = {
    competitorId,
    homepage: homepageSnapshot,
    aboutLikePage,
    servicesPage: servicesSnapshot,
    navSnapshot,
    caseStudiesPage: caseStudiesSnapshot,
  };
  const baselineResult = BaselineProfile.runBaselineProfile(baselineInput);
  const baselineProfile = baselineResult.profile;

  // Strategic model raw signals
  const serviceCount =
    serviceSnapshot?.section_count ??
    baselineProfile.offering_profile.offering_count ??
    0;
  const industriesDetected =
    serviceSnapshot?.industries ??
    baselineProfile.offering_profile.industries ??
    [];

  const enterpriseKeywords =
    serviceSnapshot?.enterprise_keywords_count ?? 0;
  const trustIndicators = baselineProfile.trust_profile.trust_indicators;

  const pricingText = [
    pricingSnapshot?.h1_text,
    ...(pricingSnapshot?.h2_headings ?? []),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  const pricingTransparent = /[\d₹$]/.test(pricingText);
  const multipleTiersDetected =
    (pricingSnapshot?.h2_headings?.length ?? 0) >= 3;
  const enterpriseTierDetected = /enterprise/.test(pricingText);

  const structuralTraitShiftsDetected = changesLast30d.some(
    (c) =>
      c.category === "Navigation / Structure" ||
      c.category === "Pricing & Offers"
  );

  const strategicRaw: StrategicRawSignals = {
    competitorId,
    strategicTerms: serviceSnapshot?.strategic_keywords_count ?? 0,
    executionTerms: serviceSnapshot?.execution_keywords_count ?? 0,
    lifecycleTerms: serviceSnapshot?.lifecycle_keywords_count ?? 0,
    serviceCount,
    industriesDetected,
    enterpriseKeywords,
    caseStudiesPresent: trustIndicators.case_studies_present,
    certificationsCount: trustIndicators.certifications_detected.length,
    pricingTransparent,
    multipleTiersDetected,
    enterpriseTierDetected,
    recentChangeCount30d: changesLast30d.length,
    structuralTraitShiftsDetected,
  };

  const strategicModel = StrategicModel.runStrategicModel({ raw: strategicRaw });

  const snapshot = buildCompetitiveSnapshot({
    competitorId,
    dimensions: strategicModel.dimensionsResult.dimensions,
    comparisonData: {
      overlappingHighDimensions: [],
      overallPressureLevel: strategicModel.pressure.overallPressureLevel,
    },
    evolutionData: strategicModel.trajectory,
  });

  // SEO / Search Positioning Intelligence
  const isSeoPath = (url: string): boolean =>
    /\/(blog|resources|insights|knowledge|case-studies?|guides)(\/|$)/i.test(url);

  const toSeoPage = (row: SeoSnapshotRow): SEOPageData => {
    const searchSeo = row.structured_content?.search_seo;
    const derivedWordCount =
      [row.h1_text ?? "", ...(row.h2_headings ?? []), ...(row.h3_headings ?? []), ...(searchSeo?.anchors ?? [])]
        .join(" ")
        .split(/\s+/)
        .filter(Boolean).length;
    return {
      url: row.url ?? "",
      h1: row.h1_text ?? "",
      h2: row.h2_headings ?? [],
      h3: row.h3_headings ?? [],
      meta_title: row.title ?? "",
      meta_description: searchSeo?.meta_description,
      word_count: searchSeo?.word_count ?? derivedWordCount,
      published_at: row.captured_at ? new Date(row.captured_at) : undefined,
      anchor_text: searchSeo?.anchors ?? row.nav_labels ?? [],
      slug: searchSeo?.slug,
      image_alt_text: searchSeo?.image_alt_text ?? [],
    };
  };

  const seoPages: SEOPageData[] = seoSnapshots
    .filter((s) => isSeoPath(s.url ?? ""))
    .map(toSeoPage);

  const targetSeoPages: SEOPageData[] = peerSeoSnapshots
    .filter((s) => isSeoPath(s.url ?? ""))
    .map(toSeoPage);

  const seoIntelligence = SearchIntelligence.buildSeoIntelligence({
    competitorId,
    pages: seoPages,
    targetPages: targetSeoPages,
    previousSnapshots: seoHistory.map((row) => ({
      captured_at: row.captured_at,
      dimensions: row.seo_dimensions,
    })),
  });

  // Deterministic Competitive Intelligence Engine wiring
  const rawSignalsInput: RawSignalsInput = {
    competitorId,
    trackedPageTypes: uniquePageTypes,
    changesLast30dCount: changesLast30d.length,
    latestByPageType:
      latestServicesSnapshot && latestServicesSnapshot.page_type === PAGE_TAXONOMY.SERVICES
        ? {
            [PAGE_TAXONOMY.SERVICES]: {
              url: latestServicesSnapshot.url,
              http_status: latestServicesSnapshot.http_status,
              title: latestServicesSnapshot.title,
              h2_headings: latestServicesSnapshot.h2_headings,
              structured_content: latestServicesSnapshot.structured_content,
            },
          }
        : {},
    webpageSignalInsights: webpageSignals.map((i) => ({
      page_type: i.page_type,
      insight_type: "webpage_signal",
      insight_text: i.insight_text,
      created_at: i.created_at,
    })),
  };
  const intelligenceRaw = buildRawSignals(rawSignalsInput);
  const intelligence = runIntelligenceEngine(intelligenceRaw);

  const narrativeStrengths = intelligence.narrative.strengths.map((s) => s.text);
  const narrativeRisks = intelligence.narrative.risks.map((r) => r.text);
  const strategicNarrative = intelligence.narrative.strategicImplications.map((i) => ({
    text: i.text,
  }));

  const domainLabel = (() => {
    try {
      const hostname = new URL(competitor.url).hostname;
      return hostname.replace(/^www\./i, "") || competitor.url;
    } catch {
      return competitor.url;
    }
  })();

  const lastAnalyzedIso =
    competitor.last_crawled_at ??
    latestServicesSnapshot?.captured_at ??
    seoHistory[seoHistory.length - 1]?.captured_at ??
    null;
  const lastAnalyzedLabel = formatDate(lastAnalyzedIso);

  const homepageBaseline =
    baselineSnapshots.find((s) => s.page_type === PAGE_TAXONOMY.HOMEPAGE) ?? null;
  const homepageLogoUrl =
    homepageBaseline && homepageBaseline.structured_content
      ? ((homepageBaseline.structured_content as any).brand?.logo_url as string | undefined) ?? null
      : null;

  const hasRecentChanges = recentChanges.length > 0;

  const strengthSignals = narrativeStrengths.slice(0, 4);
  const riskSignals = narrativeRisks.slice(0, 4);

  // Derive most impactful signal from top strength or risk
  const mostImpactfulSignal = (() => {
    if (strengthSignals.length > 0 && riskSignals.length > 0) {
      const strength = strengthSignals[0];
      const risk = riskSignals[0];
      // Create a concise synthesis
      if (strength.toLowerCase().includes("credibility") && risk.toLowerCase().includes("conversion")) {
        return "Enterprise credibility signals are strong, but conversion urgency appears weak.";
      }
      if (strength.toLowerCase().includes("positioning") && risk.toLowerCase().includes("monetization")) {
        return "Positioning coherence is evident, but monetization clarity needs improvement.";
      }
      if (strength.toLowerCase().includes("operational") && risk.toLowerCase().includes("focus")) {
        return "Operational depth is present, but market focus lacks clear articulation.";
      }
      return `${strength.replace(/^(Positioning appears|Public-facing positioning|Service structure|Offering breadth|Monetization signals|Market focus|Credibility surfaces|Change cadence|Recent activity)/, "").trim()}, but ${risk.toLowerCase().replace(/^(positioning signals|service structure|monetization posture|vertical focus|proof surfaces|low visible change)/, "").trim()}.`;
    }
    if (strengthSignals.length > 0) {
      return strengthSignals[0];
    }
    if (riskSignals.length > 0) {
      return riskSignals[0];
    }
    return null;
  })();

  // Quantify strategic movement
  const pricingChanges = changesLast30d.filter((c) => c.category === "Pricing & Offers").length;
  const messagingChanges = changesLast30d.filter((c) => c.category === "Positioning & Messaging").length;
  const serviceChanges = changesLast30d.filter(
    (c) => c.category === "Product / Services" || c.change_type === "element_added" || c.change_type === "element_removed"
  ).length;
  const ctaChanges = changesLast30d.filter((c) => c.change_type === "cta_text_change").length;

  // Derive status for snapshot
  const statusLabel =
    changesLast30d.length === 0
      ? "Stable"
      : changesLast30d.length >= 5
      ? "Active Shift"
      : "Expansion Detected";

  // Derive movement summary
  const movementSummary =
    changesLast30d.length === 0
      ? "No pricing, service, or messaging shifts detected in latest cycle."
      : pricingChanges > 0 || messagingChanges > 0 || serviceChanges > 0
      ? `${pricingChanges > 0 ? `Pricing tier updated. ` : ""}${messagingChanges > 0 ? `Headline language modified. ` : ""}${serviceChanges > 0 ? `${serviceChanges} new service entries. ` : ""}`
      : "Structural navigation adjustments only.";

  // Derive dominant theme
  const dominantTheme =
    baselineProfile.value_proposition_summary ||
    (serviceSnapshot?.primary_focus === "Strategic"
      ? "Strategic transformation positioning with enterprise service depth."
      : serviceSnapshot?.primary_focus === "Execution"
      ? "Operational depth with execution-oriented delivery capabilities."
      : serviceOverview.industries.length > 0
      ? `Operational depth with vertical focus across ${serviceOverview.industries.slice(0, 2).join(" and ")}.`
      : "Operational depth with enterprise service positioning.");

  // Service intelligence interpretation
  const portfolioBreadth =
    serviceOverview.totalServices === 0
      ? "Not Signaled"
      : serviceOverview.totalServices <= 3
      ? "Narrow"
      : serviceOverview.totalServices <= 6
      ? "Moderate"
      : "Broad";

  const verticalFocus =
    serviceOverview.industries.length === 0
      ? "Not Signaled"
      : serviceOverview.industries.length === 1
      ? "Clear"
      : serviceOverview.industries.length <= 3
      ? "Clear"
      : "Diffuse";

  const advisoryBias =
    serviceSnapshot?.primary_focus === "Strategic"
      ? "Advisory-heavy"
      : serviceSnapshot?.primary_focus === "Execution"
      ? "Operational-heavy"
      : "Balanced";

  // SEO trend detection (simple comparison)
  const seoTopKeywords = seoIntelligence.dominantKeywords.slice(0, 5);
  const seoEmergingKeywords = seoIntelligence.domainKeywordProfile
    .filter((k) => k.page_count <= 2 && k.appearance_in_h1 > 0)
    .slice(0, 5)
    .map((k) => k.keyword);

  // Competitive implication derivation
  const competitiveImplications: string[] = [];
  if (pricingChanges === 0 && changesLast30d.length === 0) {
    competitiveImplications.push("Expect stable pricing competition");
  }
  if (messagingChanges === 0 && strengthSignals.some((s) => s.toLowerCase().includes("positioning"))) {
    competitiveImplications.push("Differentiation opportunity in messaging clarity");
  }
  if (changesLast30d.length < 3) {
    competitiveImplications.push("Low short-term repositioning risk");
  }
  if (snapshot.competitive_risk_level === "Low") {
    competitiveImplications.push("Limited direct competitive pressure in current positioning");
  }

  return (
    <div className="space-y-8">
      <InsightsRealtimeListener workspaceId={workspaceId} />
      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Link href="/insights" className="hover:underline">
            Insights
          </Link>
          <span>/</span>
          <span>{competitor.name || domainLabel}</span>
        </div>
        <div className="flex items-center gap-3">
          {homepageLogoUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={homepageLogoUrl}
              alt={`${domainLabel} logo`}
              className="h-8 w-8 rounded border bg-muted object-contain"
            />
          )}
          <h1 className="text-2xl font-semibold tracking-tight">
            {competitor.name || domainLabel}
          </h1>
          <InsightsLiveSignalIndicator competitorId={competitorId} />
        </div>
        <p className="text-sm text-muted-foreground">
          <span className="mr-4">Competitor: {domainLabel}</span>
          <span className="mr-4">Last Analyzed: {lastAnalyzedLabel}</span>
          <span>Monitoring Status: {competitiveState.status}</span>
        </p>
      </div>

      {/* Section 1 — Strategic Snapshot */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold tracking-tight">Strategic Snapshot</h2>
        <Card className="border-2">
          <CardContent className="space-y-2 py-6 text-base">
            <p>
              <span className="font-semibold">Status:</span> {statusLabel}
            </p>
            <p>
              <span className="font-semibold">Movement:</span> {movementSummary}
            </p>
            <p>
              <span className="font-semibold">Risk Exposure:</span> {snapshot.competitive_risk_level === "Low" ? "Low" : snapshot.competitive_risk_level === "Moderate" ? "Moderate" : "Elevated"} competitive acceleration observed.
            </p>
            <p>
              <span className="font-semibold">Dominant Theme:</span> {dominantTheme}
            </p>
          </CardContent>
        </Card>
      </section>

      <hr className="border-border/60" />

      {/* Section 2 — Strategic Movement */}
      <section id="insights-pricing" className="space-y-4">
        <h2 className="text-base font-medium tracking-tight">Strategic Movement (Last 30 Days)</h2>
        <Card>
          <CardContent className="py-6 text-sm">
            <div className="space-y-1 font-mono">
              <p>Pricing changes: {pricingChanges}</p>
              <p>Messaging shifts: {messagingChanges}</p>
              <p>Service additions/removals: {serviceChanges}</p>
              <p>CTA modifications: {ctaChanges}</p>
            </div>
            {changesLast30d.length > 0 && (
              <div className="mt-4 space-y-1 text-sm text-muted-foreground">
                {pricingChanges > 0 && <p>+{pricingChanges} pricing tier update{pricingChanges > 1 ? "s" : ""}</p>}
                {messagingChanges > 0 && <p>Headline language modified</p>}
                {serviceChanges > 0 && <p>+{serviceChanges} new service entr{serviceChanges > 1 ? "ies" : "y"}</p>}
                {ctaChanges > 0 && <p>+{ctaChanges} CTA modification{ctaChanges > 1 ? "s" : ""}</p>}
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      <hr className="border-border/60" />

      {/* Section 3 — Competitive Strength & Risk */}
      <section className="space-y-4">
        <h2 className="text-base font-medium tracking-tight">Competitive Strength & Risk</h2>
        <Card>
          <CardContent className="space-y-4 py-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <p className="text-sm font-medium">Strength Signals</p>
                <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                  {strengthSignals.length > 0 ? (
                    strengthSignals.map((text) => <li key={text}>• {text}</li>)
                  ) : (
                    <li>• Strength signals will appear as more strategic surfaces are crawled.</li>
                  )}
                </ul>
              </div>
              <div>
                <p className="text-sm font-medium">Risk Signals</p>
                <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                  {riskSignals.length > 0 ? (
                    riskSignals.map((text) => <li key={text}>• {text}</li>)
                  ) : (
                    <li>• Risk signals will appear as more strategic surfaces are crawled.</li>
                  )}
                </ul>
              </div>
            </div>
            {mostImpactfulSignal && (
              <div className="mt-4 border-t pt-4">
                <p className="text-sm font-semibold">Most Impactful Signal:</p>
                <p className="mt-1 text-sm text-muted-foreground">{mostImpactfulSignal}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      <hr className="border-border/60" />

      {/* Section 4 — Competitive Implication */}
      <section className="space-y-4">
        <h2 className="text-base font-medium tracking-tight">Competitive Implication</h2>
        <Card>
          <CardContent className="py-6 text-sm">
            <p className="font-medium mb-2">If competing in this space:</p>
            <ul className="space-y-1 text-muted-foreground">
              {competitiveImplications.length > 0 ? (
                competitiveImplications.map((impl, idx) => (
                  <li key={idx}>• {impl}</li>
                ))
              ) : (
                <li>• Monitor for emerging competitive signals as tracking coverage expands.</li>
              )}
            </ul>
          </CardContent>
        </Card>
      </section>

      <hr className="border-border/60" />

      {/* Section 5 — Service Intelligence */}
      <section id="insights-services" className="space-y-4">
        <h2 className="text-base font-medium tracking-tight">Service Intelligence</h2>
        <Card>
          <CardContent className="space-y-4 py-6">
            <div className="space-y-2 text-sm">
              <p className="font-medium">Service Intelligence Summary</p>
              <div className="space-y-1 text-muted-foreground">
                <p>Portfolio Breadth: {portfolioBreadth}</p>
                <p>Vertical Focus: {verticalFocus}</p>
                <p>Advisory vs Operational Bias: {advisoryBias}</p>
              </div>
            </div>
            <Collapsible defaultOpen={false}>
              <CollapsibleTrigger className="text-sm font-medium underline-offset-4 hover:underline">
                Raw Service Evidence
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-3 space-y-3">
                <div className="grid gap-4 text-sm text-muted-foreground md:grid-cols-2">
                  <div>
                    <p className="font-medium text-foreground">Service Structure</p>
                    <ul className="mt-1 space-y-1">
                      {baselineProfile.offering_profile.core_offerings.length > 0 ? (
                        baselineProfile.offering_profile.core_offerings.map((offering) => (
                          <li key={offering}>• {offering}</li>
                        ))
                      ) : (
                        <li>• Service structure will clarify as more services pages are captured.</li>
                      )}
                    </ul>
                  </div>
                  <div>
                    <p className="font-medium text-foreground">Industry Coverage</p>
                    <ul className="mt-1 space-y-1">
                      {serviceOverview.industries.length > 0 ? (
                        serviceOverview.industries.map((industry) => (
                          <li key={industry}>• {industry}</li>
                        ))
                      ) : (
                        <li>• Industry coverage lacks clear signals.</li>
                      )}
                    </ul>
                    {serviceEvidenceHeadings.length > 0 && (
                      <div className="mt-3">
                        <p className="font-medium text-foreground">Service Page Headings</p>
                        <ul className="mt-1 space-y-1">
                          {serviceEvidenceHeadings.slice(0, 8).map((heading) => (
                            <li key={heading}>• {heading}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              </CollapsibleContent>
            </Collapsible>
          </CardContent>
        </Card>
      </section>

      <hr className="border-border/60" />

      {/* Section 6 — SEO Intelligence (Collapsible) */}
      <section id="insights-seo" className="space-y-3">
        <Collapsible defaultOpen={false}>
          <CollapsibleTrigger className="text-base font-medium">SEO Intelligence</CollapsibleTrigger>
          <CollapsibleContent className="space-y-4 mt-4">
            <Card>
              <CardContent className="space-y-3 py-6 text-sm text-muted-foreground">
                <div>
                  <p className="font-medium text-foreground">Top 5 Core Terms</p>
                  <ul className="mt-1 space-y-1">
                    {seoTopKeywords.length > 0 ? (
                      seoTopKeywords.map((keyword) => <li key={keyword}>• {keyword}</li>)
                    ) : (
                      <li>• Core terms will populate as SEO content is captured.</li>
                    )}
                  </ul>
                </div>
                <div>
                  <p className="font-medium text-foreground">Emerging Terms</p>
                  <ul className="mt-1 space-y-1">
                    {seoEmergingKeywords.length > 0 ? (
                      seoEmergingKeywords.map((keyword) => <li key={keyword}>• {keyword}</li>)
                    ) : (
                      <li>• Emerging terms will appear as content depth increases.</li>
                    )}
                  </ul>
                </div>
                <div>
                  <p className="font-medium text-foreground">Funnel Coverage</p>
                  <p className="mt-1">{seoIntelligence.snapshot.funnel_strategy}</p>
                </div>
              </CardContent>
            </Card>
          </CollapsibleContent>
        </Collapsible>
      </section>

      <hr className="border-border/60" />

      {/* Section 7 — Historical Timeline (Collapsible) */}
      <section id="insights-positioning" className="space-y-3">
        <Collapsible defaultOpen={false}>
          <CollapsibleTrigger className="text-base font-medium">Historical Signal Timeline</CollapsibleTrigger>
          <CollapsibleContent className="mt-4">
            <Card>
              <CardContent className="space-y-2 py-6 text-sm text-muted-foreground">
                {changesLast30d.length === 0 ? (
                  <p>No structural movement detected in the last 30 days.</p>
                ) : (
                  <ul className="space-y-1">
                    {changesLast30d
                      .slice()
                      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
                      .map((change) => (
                        <li key={`${change.created_at}-${change.page_type}-${change.category}`}>
                          {formatDate(change.created_at)} — {change.category ?? "Change"} on{" "}
                          {change.page_type}
                        </li>
                      ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </CollapsibleContent>
        </Collapsible>
      </section>

      <hr className="border-border/60" />

      {/* Section 8 — Raw Structural Change Log (Collapsed by default) */}
      <section className="space-y-3">
        <Collapsible defaultOpen={false}>
          <CollapsibleTrigger className="text-base font-medium">Raw Structural Change Log</CollapsibleTrigger>
          <CollapsibleContent className="mt-4">
            <Card>
              <CardContent className="space-y-3 py-6 text-sm">
                {recentChanges.length === 0 ? (
                  <p className="text-muted-foreground">
                    No structural changes detected in recent crawl.
                  </p>
                ) : (
                  <ul className="space-y-4">
                    {recentChanges.map((change) => {
                      const beforeUrl = pickScreenshotUrl(change.before_snapshot);
                      const afterUrl = pickScreenshotUrl(change.after_snapshot);
                      return (
                        <li key={change.id}>
                          <Card className="border-dashed">
                            <CardHeader className="pb-2">
                              <CardTitle className="text-sm font-medium">{change.summary}</CardTitle>
                              <p className="text-xs text-muted-foreground">
                                Detected: {formatDate(change.created_at)}
                              </p>
                            </CardHeader>
                            <CardContent className="text-xs">
                              <Collapsible>
                                <CollapsibleTrigger>View screenshots</CollapsibleTrigger>
                                <CollapsibleContent className="grid gap-4 pt-3 sm:grid-cols-2">
                                  <div className="space-y-2">
                                    <p className="text-[10px] uppercase text-muted-foreground">Before</p>
                                    {beforeUrl ? (
                                      // eslint-disable-next-line @next/next/no-img-element
                                      <img
                                        src={beforeUrl}
                                        alt="Before snapshot"
                                        className="w-full rounded border bg-muted/10 object-contain"
                                      />
                                    ) : (
                                      <div className="rounded border bg-muted/10 p-4 text-[10px] text-muted-foreground">
                                        No screenshot
                                      </div>
                                    )}
                                  </div>
                                  <div className="space-y-2">
                                    <p className="text-[10px] uppercase text-muted-foreground">After</p>
                                    {afterUrl ? (
                                      // eslint-disable-next-line @next/next/no-img-element
                                      <img
                                        src={afterUrl}
                                        alt="After snapshot"
                                        className="w-full rounded border bg-muted/10 object-contain"
                                      />
                                    ) : (
                                      <div className="rounded border bg-muted/10 p-4 text-[10px] text-muted-foreground">
                                        No screenshot
                                      </div>
                                    )}
                                  </div>
                                </CollapsibleContent>
                              </Collapsible>
                            </CardContent>
                          </Card>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </CardContent>
            </Card>
          </CollapsibleContent>
        </Collapsible>
      </section>
    </div>
  );
}
