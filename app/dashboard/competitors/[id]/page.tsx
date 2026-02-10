import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getOrCreateWorkspaceId } from "../actions";
import { CompetitorDetailClient } from "./competitor-detail-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { InsightFeedList, type InsightFeedItem } from "../../changes/insight-feed-list";
import { PAGE_TAXONOMY, type PageType } from "@/lib/PAGE_TAXONOMY";

interface CompetitorDetailPageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

function timeAgo(date: string | null): string {
  if (!date) return "Never";
  const now = new Date();
  const past = new Date(date);
  const msPerMinute = 60 * 1000;
  const msPerHour = msPerMinute * 60;
  const msPerDay = msPerHour * 24;
  const msPerMonth = msPerDay * 30;
  const msPerYear = msPerDay * 365;

  const elapsed = now.getTime() - past.getTime();

  if (elapsed < msPerMinute) {
    return "Just now";
  } else if (elapsed < msPerHour) {
    const minutes = Math.round(elapsed / msPerMinute);
    return `${minutes} minute${minutes !== 1 ? "s" : ""} ago`;
  } else if (elapsed < msPerDay) {
    const hours = Math.round(elapsed / msPerHour);
    return `${hours} hour${hours !== 1 ? "s" : ""} ago`;
  } else if (elapsed < msPerMonth) {
    const days = Math.round(elapsed / msPerDay);
    return `${days} day${days !== 1 ? "s" : ""} ago`;
  } else if (elapsed < msPerYear) {
    const months = Math.round(elapsed / msPerMonth);
    return `${months} month${months !== 1 ? "s" : ""} ago`;
  } else {
    const years = Math.round(elapsed / msPerYear);
    return `${years} year${years !== 1 ? "s" : ""} ago`;
  }
}

export default async function CompetitorDetailPage({
  params,
  searchParams,
}: CompetitorDetailPageProps) {
  const { id: competitorId } = await params;
  const searchParamsValue = await searchParams;

  const workspaceId = await getOrCreateWorkspaceId();
  if (!workspaceId) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-12">
        <p className="text-muted-foreground">You must be signed in.</p>
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

  // Pagination for changes
  const pageParam = typeof searchParamsValue.page === "string" ? searchParamsValue.page : "1";
  const page = Math.max(1, parseInt(pageParam, 10) || 1);
  const PAGE_SIZE = 20;
  const offset = (page - 1) * PAGE_SIZE;

  // Calculate 30 days ago for stats
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  // Parallel data fetching
  const [pagesCountResult, insightsCountResult, insightsResult, relatedChangesResult] = await Promise.all([
    // 1. Pages tracked count
    supabase
      .from("pages")
      .select("*", { count: "exact", head: true })
      .eq("competitor_id", competitorId),
    
    // 2. Insights in last 30 days count
    supabase
      .from("insights")
      .select("*", { count: "exact", head: true })
      .eq("competitor_id", competitorId)
      .gte("created_at", thirtyDaysAgo.toISOString()),

    // 3. Recent insights feed (paginated)
    supabase
      .from("insights")
      .select(
        `
        id,
        created_at,
        page_type,
        insight_text,
        related_change_ids
      `,
        { count: "exact" }
      )
      .eq("competitor_id", competitorId)
      .order("created_at", { ascending: false })
      .range(offset, offset + PAGE_SIZE - 1),
    
    // 4. All related changes with screenshots (for insights)
    supabase
      .from("changes")
      .select(
        `
        id,
        before_snapshot:snapshots!before_snapshot_id(screenshot_url),
        after_snapshot:snapshots!after_snapshot_id(screenshot_url)
      `
      )
      .eq("competitor_id", competitorId)
      .limit(500),
  ]);

  const pagesTracked = pagesCountResult.count ?? 0;
  const insightsLast30Days = insightsCountResult.count ?? 0;
  
  const insightRows = (insightsResult.data ?? []) as Array<{
    id: string;
    created_at: string;
    page_type: PageType;
    insight_text: string;
    related_change_ids: string[];
  }>;
  const totalCount = insightsResult.count ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const hasNextPage = page < totalPages;
  const hasPrevPage = page > 1;

  // Build related changes map for screenshot lookups
  const relatedChangesMap = new Map<string, { before_screenshot_url: string | null; after_screenshot_url: string | null }>();
  const relatedChanges = (relatedChangesResult.data ?? []) as Array<{
    id: string;
    before_snapshot: { screenshot_url: string | null } | { screenshot_url: string | null }[] | null;
    after_snapshot: { screenshot_url: string | null } | { screenshot_url: string | null }[] | null;
  }>;
  for (const change of relatedChanges) {
    const pickUrl = (snap: typeof change.before_snapshot): string | null => {
      if (!snap) return null;
      const s = Array.isArray(snap) ? snap[0] : snap;
      return s?.screenshot_url ?? null;
    };
    relatedChangesMap.set(change.id, {
      before_screenshot_url: pickUrl(change.before_snapshot),
      after_screenshot_url: pickUrl(change.after_snapshot),
    });
  }

  // Transform insights to InsightFeedItem format
  const insightFeedItems: InsightFeedItem[] = insightRows.map((insight) => {
    const firstRelatedChangeId = insight.related_change_ids?.[0] ?? null;
    const relatedChange = firstRelatedChangeId ? relatedChangesMap.get(firstRelatedChangeId) : undefined;
    return {
      id: insight.id,
      competitorName: competitor.name ?? competitor.url,
      competitorUrl: competitor.url,
      pageType: insight.page_type,
      insightText: insight.insight_text,
      createdAt: insight.created_at,
      beforeScreenshotUrl: relatedChange?.before_screenshot_url ?? null,
      afterScreenshotUrl: relatedChange?.after_screenshot_url ?? null,
    };
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Link href="/dashboard/competitors" className="hover:underline">
            Competitors
          </Link>
          <span>/</span>
          <span>{competitor.name || competitor.url}</span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-2xl font-semibold tracking-tight">
            {competitor.name || competitor.url}
          </h1>
          <CompetitorDetailClient
            competitor={{
              id: competitor.id,
              name: competitor.name,
              url: competitor.url,
              crawl_frequency: competitor.crawl_frequency,
            }}
          />
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pages Tracked</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pagesTracked}</div>
            <p className="text-xs text-muted-foreground">
              Across entire site
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Last checked</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{timeAgo(competitor.last_crawled_at)}</div>
            <p className="text-xs text-muted-foreground">
              Check frequency: <span className="capitalize">{competitor.crawl_frequency}</span>
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Strategic Updates (30 days)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{insightsLast30Days}</div>
            <p className="text-xs text-muted-foreground">
              Competitive intelligence signals
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Recent strategic updates feed */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Strategic Updates Feed</h2>
            <Button asChild variant="ghost" size="sm">
                <Link href={`/dashboard/changes?competitor=${competitorId}`}>
                    View all in Competitive Intelligence →
                </Link>
            </Button>
        </div>
        
        <InsightFeedList
          insights={insightFeedItems}
          page={page}
          totalPages={totalPages}
          totalCount={totalCount}
          pageSize={PAGE_SIZE}
          hasPrevPage={hasPrevPage}
          hasNextPage={hasNextPage}
          hasActiveFilters={false}
        />
      </div>
    </div>
  );
}
