import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getOrCreateWorkspaceId } from "./competitors/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PAGE_TAXONOMY, type PageType } from "@/lib/PAGE_TAXONOMY";

function timeAgo(date: string | Date) {
  const seconds = Math.floor((new Date().getTime() - new Date(date).getTime()) / 1000);
  let interval = seconds / 31536000;
  if (interval > 1) return Math.floor(interval) + "y ago";
  interval = seconds / 2592000;
  if (interval > 1) return Math.floor(interval) + "mo ago";
  interval = seconds / 86400;
  if (interval > 1) return Math.floor(interval) + "d ago";
  interval = seconds / 3600;
  if (interval > 1) return Math.floor(interval) + "h ago";
  interval = seconds / 60;
  if (interval > 1) return Math.floor(interval) + "m ago";
  return Math.floor(seconds) + "s ago";
}

export default async function DashboardPage() {
  const workspaceId = await getOrCreateWorkspaceId();
  if (!workspaceId) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-12">
        <p className="text-muted-foreground">You must be signed in to view the dashboard.</p>
        <Button asChild>
          <Link href="/login">Sign in</Link>
        </Button>
      </div>
    );
  }

  const supabase = await createClient();

  const { data: competitorsData } = await supabase
    .from("competitors")
    .select("id, name, url")
    .eq("workspace_id", workspaceId);

  const competitors = competitorsData ?? [];
  const competitorIds = competitors.map((r) => r.id);
  const compMap = new Map(competitors.map((c) => [c.id, c]));

  const now = new Date();
  const sevenDaysAgo = new Date(now);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const { data: recentInsights } =
    competitorIds.length > 0
      ? await supabase
          .from("insights")
          .select("id, competitor_id, page_type, insight_text, created_at")
          .in("competitor_id", competitorIds)
          .order("created_at", { ascending: false })
          .limit(500)
      : { data: [] };

  const insightsList = recentInsights ?? [];
  const insights7d = insightsList.filter((insight) => new Date(insight.created_at) >= sevenDaysAgo);

  function pageTypeToFocusArea(pageType: PageType): string {
    if (pageType === PAGE_TAXONOMY.PRICING) return "Pricing";
    if (
      pageType === PAGE_TAXONOMY.PRODUCT_OR_SERVICES ||
      pageType === PAGE_TAXONOMY.USE_CASES_OR_INDUSTRIES
    ) {
      return "Services";
    }
    return "Messaging";
  }

  function getMarketMovementLabel(totalInsights7d: number, activeCompetitors7d: number): "Stable" | "Moderate" | "Active" {
    if (totalInsights7d >= 10 || activeCompetitors7d >= 4) return "Active";
    if (totalInsights7d >= 4 || activeCompetitors7d >= 2) return "Moderate";
    return "Stable";
  }

  const perCompetitorCounts = new Map<string, number>();
  for (const insight of insights7d) {
    perCompetitorCounts.set(
      insight.competitor_id,
      (perCompetitorCounts.get(insight.competitor_id) ?? 0) + 1
    );
  }

  let mostActiveCompetitorName = "No active competitor";
  let mostActiveCount = 0;
  for (const [competitorId, count] of perCompetitorCounts.entries()) {
    if (count > mostActiveCount) {
      mostActiveCount = count;
      const comp = compMap.get(competitorId);
      mostActiveCompetitorName = comp?.name ?? comp?.url ?? "Unknown competitor";
    }
  }

  const focusAreaCounts = new Map<string, number>();
  for (const insight of insights7d) {
    const focusArea = pageTypeToFocusArea(insight.page_type as PageType);
    focusAreaCounts.set(focusArea, (focusAreaCounts.get(focusArea) ?? 0) + 1);
  }
  const topFocusAreaEntry = [...focusAreaCounts.entries()].sort((a, b) => b[1] - a[1])[0];
  const topFocusArea = topFocusAreaEntry?.[0] ?? "No clear focus";
  const topFocusAreaCount = topFocusAreaEntry?.[1] ?? 0;

  const activeCompetitors7d = perCompetitorCounts.size;
  const marketMovement = getMarketMovementLabel(insights7d.length, activeCompetitors7d);
  const latestInsight = insightsList[0] ?? null;
  const latestInsightCompetitor = latestInsight ? compMap.get(latestInsight.competitor_id) : null;
  const recentActivity = insightsList.slice(0, 7);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground mt-1">
          Overview of your competitor tracking workspace.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Most Active Competitor</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-lg font-semibold">{mostActiveCompetitorName}</div>
            <p className="text-xs text-muted-foreground">
              {mostActiveCount > 0
                ? `${mostActiveCount} strategic updates in last 7 days`
                : "No strategic updates in last 7 days"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Primary Focus Area</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-lg font-semibold">{topFocusArea}</div>
            <p className="text-xs text-muted-foreground">
              {topFocusAreaCount > 0 ? `${topFocusAreaCount} strategic updates this week` : "No concentrated movement detected"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Market Movement</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-lg font-semibold">{marketMovement}</div>
            <p className="text-xs text-muted-foreground">
              {insights7d.length} strategic updates across {activeCompetitors7d} competitors
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Recent Strategic Update</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm font-semibold">
              {latestInsight?.insight_text ?? "No strategic updates detected yet."}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {latestInsight
                ? `${latestInsightCompetitor?.name ?? latestInsightCompetitor?.url ?? "Unknown"} · ${timeAgo(latestInsight.created_at)}`
                : "Waiting for first strategic update"}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Recent Strategic Updates</h2>
            <Button asChild variant="outline" size="sm">
                <Link href="/dashboard/changes">View Full Competitive Intelligence</Link>
            </Button>
        </div>

        {recentActivity.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              No strategic updates detected yet.
            </CardContent>
          </Card>
        ) : (
          <div className="rounded-md border">
            <div className="grid grid-cols-12 gap-4 border-b bg-muted/50 p-4 text-sm font-medium text-muted-foreground">
                <div className="col-span-3">Competitor</div>
                <div className="col-span-3">Focus area</div>
                <div className="col-span-4">Strategic update</div>
                <div className="col-span-2 text-right">Time</div>
            </div>
            <div className="divide-y">
            {recentActivity.map((insight) => {
              const comp = compMap.get(insight.competitor_id);
              const compName = comp?.name ?? comp?.url ?? "Unknown";
              const focusArea = pageTypeToFocusArea(insight.page_type as PageType);

              return (
                <div key={insight.id} className="grid grid-cols-12 gap-4 p-4 text-sm items-center hover:bg-muted/50 transition-colors">
                  <div className="col-span-3 font-medium truncate" title={compName}>
                    {compName}
                  </div>
                  <div className="col-span-3">
                    <Badge variant="secondary" className="font-normal truncate block w-fit max-w-full">
                        {focusArea}
                    </Badge>
                  </div>
                  <div className="col-span-4 truncate text-muted-foreground" title={insight.insight_text}>
                    {insight.insight_text}
                  </div>
                  <div className="col-span-2 text-right text-muted-foreground">
                    {timeAgo(insight.created_at)}
                  </div>
                </div>
              );
            })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
