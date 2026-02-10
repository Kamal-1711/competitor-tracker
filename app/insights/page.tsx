import { createClient } from "@/lib/supabase/server";
import { getOrCreateWorkspaceId } from "@/app/dashboard/competitors/actions";
import { EmptyState } from "@/components/empty-state";
import { MarketSnapshot } from "@/components/insights/market-snapshot";
import { AggregatedInsights } from "@/components/insights/aggregated-insights";
import { InsightCard } from "@/components/insights/insight-card";
import { generateObservationalInsights } from "@/lib/insights/generateObservationalInsights";
import { PAGE_TAXONOMY, type PageType } from "@/lib/PAGE_TAXONOMY";
import { Button } from "@/components/ui/button";
import Link from "next/link";

type CompetitorRow = {
  id: string;
  name: string | null;
  url: string;
  last_crawled_at: string | null;
  created_at: string;
};

type PageRow = {
  competitor_id: string;
  page_type: PageType;
};

type InsightRow = {
  competitor_id: string;
  page_type: PageType;
  insight_text: string;
  created_at: string;
};

function isKnownPageType(pageType: string | null | undefined): pageType is PageType {
  if (!pageType) return false;
  return (Object.values(PAGE_TAXONOMY) as string[]).includes(pageType);
}

function formatTimestamp(iso: string | null): string {
  if (!iso) return "No crawls yet";
  const d = new Date(iso);
  return d.toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" });
}

function isActiveWithin14Days(iso: string | null): boolean {
  if (!iso) return false;
  const d = new Date(iso);
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 14);
  return d >= cutoff;
}

function pageTypeToObservationLabel(pageType: PageType): string {
  switch (pageType) {
    case PAGE_TAXONOMY.HOMEPAGE:
      return "Homepage monitored";
    case PAGE_TAXONOMY.PRICING:
      return "Pricing page detected";
    case PAGE_TAXONOMY.PRODUCT_OR_SERVICES:
      return "Services page tracked";
    case PAGE_TAXONOMY.USE_CASES_OR_INDUSTRIES:
      return "Messaging pages tracked";
    case PAGE_TAXONOMY.CASE_STUDIES_OR_CUSTOMERS:
      return "Case studies detected";
    case PAGE_TAXONOMY.CTA_ELEMENTS:
      return "Conversion pages monitored";
    case PAGE_TAXONOMY.NAVIGATION:
      return "Navigation structure tracked";
    default:
      return "Pages actively monitored";
  }
}

function pageTypeToArea(pageType: PageType): "Pricing" | "Messaging" | "Services" {
  if (pageType === PAGE_TAXONOMY.PRICING) return "Pricing";
  if (pageType === PAGE_TAXONOMY.PRODUCT_OR_SERVICES) return "Services";
  return "Messaging";
}

function marketActivityLevel(totalInsights14d: number): "Stable" | "Moderate" | "Active" {
  if (totalInsights14d >= 10) return "Active";
  if (totalInsights14d >= 4) return "Moderate";
  return "Stable";
}

export default async function InsightsPage() {
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

  const { data: competitorsData } = await supabase
    .from("competitors")
    .select("id, name, url, last_crawled_at, created_at")
    .eq("workspace_id", workspaceId)
    .order("name");

  const competitors = (competitorsData ?? []) as CompetitorRow[];
  if (competitors.length === 0) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold tracking-tight">Insights</h1>
        <EmptyState
          title="No competitors tracked yet."
          description="Add competitors to start generating executive-ready insights."
        />
      </div>
    );
  }

  const competitorIds = competitors.map((competitor) => competitor.id);

  const [pagesResult, insightsResult] = await Promise.all([
    supabase.from("pages").select("competitor_id, page_type").in("competitor_id", competitorIds),
    supabase
      .from("insights")
      .select("competitor_id, page_type, insight_text, created_at")
      .in("competitor_id", competitorIds)
      .order("created_at", { ascending: false })
      .limit(500),
  ]);

  const pages = ((pagesResult.data ?? []) as PageRow[]).filter((page) => isKnownPageType(page.page_type));
  const insights = ((insightsResult.data ?? []) as InsightRow[]).filter((insight) =>
    isKnownPageType(insight.page_type)
  );

  const pagesByCompetitor = new Map<string, PageType[]>();
  for (const page of pages) {
    const list = pagesByCompetitor.get(page.competitor_id) ?? [];
    list.push(page.page_type);
    pagesByCompetitor.set(page.competitor_id, list);
  }

  const insightsByCompetitor = new Map<string, InsightRow[]>();
  for (const insight of insights) {
    const list = insightsByCompetitor.get(insight.competitor_id) ?? [];
    list.push(insight);
    insightsByCompetitor.set(insight.competitor_id, list);
  }

  const activeCompetitors = competitors.filter((competitor) =>
    isActiveWithin14Days(competitor.last_crawled_at)
  );

  const latestCrawl = competitors
    .map((competitor) => competitor.last_crawled_at)
    .filter((value): value is string => !!value)
    .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0] ?? null;

  const fourteenDaysAgo = new Date();
  fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);
  const insights14d = insights.filter((insight) => new Date(insight.created_at) >= fourteenDaysAgo);

  const competitorNameMap = new Map(competitors.map((competitor) => [competitor.id, competitor.name ?? competitor.url]));
  const competitorInsightCounts = new Map<string, number>();
  for (const insight of insights14d) {
    competitorInsightCounts.set(
      insight.competitor_id,
      (competitorInsightCounts.get(insight.competitor_id) ?? 0) + 1
    );
  }
  const mostActiveEntry = [...competitorInsightCounts.entries()].sort((a, b) => b[1] - a[1])[0];
  const mostActiveCompetitor = mostActiveEntry
    ? competitorNameMap.get(mostActiveEntry[0]) ?? "Unknown competitor"
    : "No active competitor";
  const mostActiveCount = mostActiveEntry?.[1] ?? 0;

  const areaCounts = new Map<string, number>();
  for (const insight of insights14d) {
    const area = pageTypeToArea(insight.page_type);
    areaCounts.set(area, (areaCounts.get(area) ?? 0) + 1);
  }
  const mostChangedAreaEntry = [...areaCounts.entries()].sort((a, b) => b[1] - a[1])[0];
  const mostChangedArea = mostChangedAreaEntry?.[0] ?? "No clear movement";
  const mostChangedAreaCount = mostChangedAreaEntry?.[1] ?? 0;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Insights</h1>

      <MarketSnapshot
        competitorsTracked={competitors.length}
        activeCompetitors={activeCompetitors.length}
        pagesMonitored={pages.length}
        latestCrawlLabel={formatTimestamp(latestCrawl)}
      />

      <AggregatedInsights
        mostActiveCompetitor={mostActiveCompetitor}
        mostActiveCount={mostActiveCount}
        mostChangedArea={mostChangedArea}
        mostChangedAreaCount={mostChangedAreaCount}
        marketActivityLevel={marketActivityLevel(insights14d.length)}
        totalInsights14d={insights14d.length}
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {competitors.map((competitor) => {
          const competitorName = competitor.name ?? competitor.url;
          const competitorPages = pagesByCompetitor.get(competitor.id) ?? [];
          const competitorInsights = insightsByCompetitor.get(competitor.id) ?? [];
          const latestInsight = competitorInsights[0]?.insight_text ?? null;
          const pageTypesWithInsights = competitorInsights.map((insight) => insight.page_type);
          const observationalInsights = generateObservationalInsights({
            pageTypes: competitorPages,
            pageTypesWithInsights,
            hasAnyInsights: competitorInsights.length > 0,
          });

          const statusLabel = competitor.last_crawled_at
            ? isActiveWithin14Days(competitor.last_crawled_at)
              ? "Actively Tracked"
              : "Stable"
            : "Not checked yet";

          const observationLabels = Array.from(new Set(competitorPages)).map(pageTypeToObservationLabel);
          const keyObservations = observationLabels.length > 0 ? observationLabels.slice(0, 3) : [];
          const recentInsight = latestInsight ?? observationalInsights[0]?.text ?? "No strategic changes detected so far.";

          return (
            <InsightCard
              key={competitor.id}
              competitorName={competitorName}
              statusLabel={statusLabel}
              observations={keyObservations}
              recentInsight={recentInsight}
              href={`/insights/${competitor.id}`}
            />
          );
        })}
      </div>
    </div>
  );
}
