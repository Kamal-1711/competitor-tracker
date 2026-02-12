import { createClient } from "@/lib/supabase/server";
import { getOrCreateWorkspaceId } from "@/app/dashboard/competitors/actions";
import { EmptyState } from "@/components/empty-state";
import { MarketSnapshot } from "@/components/insights/market-snapshot";
import { AggregatedInsights } from "@/components/insights/aggregated-insights";
import { InsightCard } from "@/components/insights/insight-card";
import { generateObservationalInsights } from "@/lib/insights/generateObservationalInsights";
import { PAGE_TAXONOMY, type PageType } from "@/lib/PAGE_TAXONOMY";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import Link from "next/link";

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

  const { data: competitors } = await supabase
    .from("competitors")
    .select("id, name")
    .eq("workspace_id", workspaceId);

  if (!competitors || competitors.length === 0) {
    return (
      <EmptyState
        title="No competitors tracked"
        description="Add your first competitor to start generating strategic insights."
      >
        <Button asChild>
          <Link href="/dashboard/competitors">Add Competitor</Link>
        </Button>
      </EmptyState>
    );
  }

  const competitorIds = competitors.map((c) => c.id);

  // Fetch all monitored page types for these competitors
  const { data: monitoredPages } = await supabase
    .from("pages")
    .select("competitor_id, page_type")
    .in("competitor_id", competitorIds);

  const compPageTypesMap = new Map<string, PageType[]>();
  monitoredPages?.forEach(p => {
    const types = compPageTypesMap.get(p.competitor_id) || [];
    types.push(p.page_type as PageType);
    compPageTypesMap.set(p.competitor_id, types);
  });
  const competitorNameMap = new Map(competitors.map((c) => [c.id, c.name]));

  // Get recent insights (last 14 days)
  const fourteenDaysAgo = new Date();
  fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

  const { data: insights } = await supabase
    .from("insights")
    .select("*")
    .in("competitor_id", competitorIds)
    .gte("created_at", fourteenDaysAgo.toISOString())
    .order("created_at", { ascending: false });

  // Aggregated Stats
  const totalInsights14d = insights?.length || 0;
  const competitorInsightCounts = new Map<string, number>();
  const categoryInsightCounts = new Map<string, number>();
  const activeCompetitorIds = new Set<string>();

  insights?.forEach((insight) => {
    competitorInsightCounts.set(
      insight.competitor_id,
      (competitorInsightCounts.get(insight.competitor_id) || 0) + 1
    );
    categoryInsightCounts.set(
      insight.insight_type,
      (categoryInsightCounts.get(insight.insight_type) || 0) + 1
    );
    activeCompetitorIds.add(insight.competitor_id);
  });

  const mostActiveEntry = Array.from(competitorInsightCounts.entries()).sort((a, b) => b[1] - a[1])[0];
  const mostActiveCompetitor = mostActiveEntry
    ? competitorNameMap.get(mostActiveEntry[0]) ?? "Unknown"
    : "No active competitor";
  const mostActiveCount = mostActiveEntry?.[1] ?? 0;

  const mostChangedEntry = Array.from(categoryInsightCounts.entries()).sort((a, b) => b[1] - a[1])[0];
  const mostChangedArea = mostChangedEntry?.[0]
    ? mostChangedEntry[0].replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())
    : "No major changes";
  const mostChangedAreaCount = mostChangedEntry?.[1] ?? 0;

  const marketActivityLevel =
    totalInsights14d > 15 ? "Active" : totalInsights14d > 5 ? "Moderate" : "Stable";

  const totalPagesMonitored = competitors.reduce(
    (acc, c) => acc + (compPageTypesMap.get(c.id)?.length || 0),
    0
  );

  return (
    <div className="space-y-8 pb-12">
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-semibold tracking-tight">Strategic Intelligence Feed</h1>
          <Badge variant="secondary" className="bg-purple-500/10 text-purple-600 border-purple-500/20">Alpha</Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          Aggregated competitive insights across your tracked landscape.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-4">
        <div className="lg:col-span-1">
          <MarketSnapshot
            competitorsTracked={competitors.length}
            activeCompetitors={activeCompetitorIds.size}
            pagesMonitored={totalPagesMonitored}
            latestCrawlLabel={insights?.[0] ? new Date(insights[0].created_at).toLocaleDateString() : "No data"}
          />
        </div>
        <div className="lg:col-span-3">
          <AggregatedInsights
            mostActiveCompetitor={mostActiveCompetitor}
            mostActiveCount={mostActiveCount}
            mostChangedArea={mostChangedArea}
            mostChangedAreaCount={mostChangedAreaCount}
            marketActivityLevel={marketActivityLevel}
            totalInsights14d={totalInsights14d}
          />
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold tracking-tight">Competitive Landscape Analysis</h2>
          <Link href="/dashboard/changes" className="text-sm text-primary hover:underline font-medium">
            View All raw changes →
          </Link>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {competitors.map((comp) => {
            const compInsights = insights?.filter((i) => i.competitor_id === comp.id) || [];
            const observational = generateObservationalInsights({
              pageTypes: compPageTypesMap.get(comp.id) || [],
              pageTypesWithInsights: compInsights.map((i) => i.page_type as PageType),
              hasAnyInsights: compInsights.length > 0,
            });

            return (
              <InsightCard
                key={comp.id}
                competitorName={comp.name}
                statusLabel={compInsights.length > 0 ? "Strategic Shift Detected" : "Monitoring Stable"}
                observations={observational.slice(0, 3).map(o => o.text)}
                recentInsight={compInsights[0]?.insight_text || "Continuous monitoring active across primary page types."}
                href={`/insights/${comp.id}`}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}
