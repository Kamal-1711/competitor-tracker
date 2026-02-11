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
  deriveFocusSignals,
  deriveKeySignals,
  deriveServiceInsights,
  deriveStrategicConsiderations,
  deriveWhatToWatchNext,
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
import { CompetitiveStateSection } from "@/components/insights/competitive-state-section";
import { FocusSignalsSection } from "@/components/insights/focus-signals-section";
import { KeySignalsSection } from "@/components/insights/key-signals-section";
import { CompanyBaselineSection } from "@/components/insights/company-baseline-section";
import { CompetitiveSnapshotSection } from "@/components/insights/competitive-snapshot-section";
import { SearchPositioningSection } from "@/components/insights/search-positioning-section";
import { ServiceIntelligenceSection } from "@/components/insights/service-intelligence-section";
import { WebpageDerivedSignalsSection } from "@/components/insights/webpage-derived-signals-section";
import { StrengthsRisksSection } from "@/components/insights/strengths-risks-section";
import { StrategicImplicationsSection } from "@/components/insights/strategic-implications-section";
import { WhatToWatchSection } from "@/components/insights/what-to-watch-section";

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
  const focusSignals = deriveFocusSignals({
    trackedPageTypes: uniquePageTypes,
    insightsLast30d: insightsLast30d as InsightLike[],
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

  const keySignals = deriveKeySignals({
    status: competitiveState.status,
    insightsLast30d: insightsLast30d as InsightLike[],
  });
  const watchNextItems = deriveWhatToWatchNext({
    status: competitiveState.status,
    keySignals,
  });
  const serviceInsights = deriveServiceInsights(serviceSnapshot);
  const serviceConsiderations = deriveStrategicConsiderations(serviceSnapshot);
  const serviceOverview = {
    totalServices: serviceSnapshot?.section_count ?? 0,
    primaryFocus: serviceSnapshot?.primary_focus ?? "Not enough signal yet",
    industries: serviceSnapshot?.industries ?? [],
  };
  const serviceEvidenceHeadings = latestServicesSnapshot?.h2_headings ?? [];

  // Baseline profile wiring
  const baselineSnapshots = (baselineSnapshotsResult.data ?? []) as Array<
    {
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
    }
  >;

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
    confidence: intelligence.confidence.level,
  }));

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Link href="/insights" className="hover:underline">
            Insights
          </Link>
          <span>/</span>
          <span>{competitor.name || competitor.url}</span>
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">
          {competitor.name || competitor.url}
        </h1>
      </div>

      <CompanyBaselineSection
        biographySummary={baselineProfile.biography_summary}
        coreOfferings={baselineProfile.offering_profile.core_offerings}
        offeringStructureSummary={baselineProfile.offering_structure_summary}
        targetMarketSummary={baselineProfile.target_market_summary}
        valuePropositionSummary={baselineProfile.value_proposition_summary}
        trustProfileSummary={baselineProfile.trust_profile_summary}
      />

      <CompetitiveSnapshotSection snapshot={snapshot} />

      <SearchPositioningSection seo={seoIntelligence} />

      <CompetitiveStateSection
        competitorName={competitor.name || competitor.url}
        status={competitiveState.status}
        trackingConfidence={competitiveState.trackingConfidence}
        competitivePosture={competitiveState.competitivePosture}
        summary={competitiveState.summary}
      />

      <FocusSignalsSection
        primaryFocusAreas={focusSignals.primaryFocusAreas}
        secondarySignals={focusSignals.secondarySignals}
        interpretation={focusSignals.interpretation}
      />

      <KeySignalsSection signals={keySignals} />

      <WebpageDerivedSignalsSection
        messaging={messagingSignals}
        gtm={gtmSignals}
        pricingNarrative={pricingNarrative}
        capabilityFocus={capabilityFocus}
      />

      <ServiceIntelligenceSection
        overview={serviceOverview}
        derivedSignals={
          isServicePageBlocked
            ? [
                "Service/offerings page is protected by bot mitigation (Cloudflare). We can’t extract structured service data from automated crawls right now.",
              ]
            : serviceInsights
        }
        strategicConsiderations={
          isServicePageBlocked
            ? [
                `If this competitor is high-priority, run a manual crawl from a real browser session or use an authenticated data source for Crunchbase.`,
              ]
            : serviceConsiderations
        }
        evidenceHeadings={serviceEvidenceHeadings}
      />

      <StrengthsRisksSection
        strengths={narrativeStrengths}
        risks={narrativeRisks}
        confidence={intelligence.confidence.level}
      />

      <StrategicImplicationsSection implications={strategicNarrative} />

      <WhatToWatchSection items={watchNextItems} />

      <div className="space-y-3">
        <h2 className="text-base font-medium text-muted-foreground">Evidence (Recent Changes)</h2>
        {recentChanges.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="pt-6 text-sm text-muted-foreground">
              No changes detected in the last crawl. This suggests short-term strategic stability.
            </CardContent>
          </Card>
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
                      <p className="text-sm text-muted-foreground">
                        Detected: {formatDate(change.created_at)}
                      </p>
                    </CardHeader>
                    <CardContent className="text-sm">
                      <Collapsible>
                        <CollapsibleTrigger>View screenshots</CollapsibleTrigger>
                        <CollapsibleContent className="grid gap-4 sm:grid-cols-2">
                          <div className="space-y-2">
                            <p className="text-xs text-muted-foreground">Before</p>
                            {beforeUrl ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={beforeUrl}
                                alt="Before snapshot"
                                className="w-full rounded border bg-muted/10 object-contain"
                              />
                            ) : (
                              <div className="rounded border bg-muted/10 p-4 text-xs text-muted-foreground">
                                No screenshot
                              </div>
                            )}
                          </div>
                          <div className="space-y-2">
                            <p className="text-xs text-muted-foreground">After</p>
                            {afterUrl ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={afterUrl}
                                alt="After snapshot"
                                className="w-full rounded border bg-muted/10 object-contain"
                              />
                            ) : (
                              <div className="rounded border bg-muted/10 p-4 text-xs text-muted-foreground">
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
      </div>
    </div>
  );
}
