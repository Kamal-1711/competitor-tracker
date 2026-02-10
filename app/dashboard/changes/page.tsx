import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getOrCreateWorkspaceId } from "../competitors/actions";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/empty-state";
import { ChangeFeedFilters } from "./change-feed-filters";
import { CrawlButton } from "./crawl-button";
import { InsightFeedList, type InsightFeedItem } from "./insight-feed-list";

export type ChangeCategory =
  | "Positioning & Messaging"
  | "Pricing & Offers"
  | "Product / Services"
  | "Trust & Credibility"
  | "Navigation / Structure";

export interface ChangeFeedItem {
  id: string;
  created_at: string;
  page_url: string;
  page_type: string;
  change_type: string;
  category: ChangeCategory | null;
  summary: string;
  details: Record<string, unknown>;
  competitor_id: string;
  competitors: { name: string | null; url: string } | { name: string | null; url: string }[] | null;
  before_snapshot: { screenshot_url: string | null } | { screenshot_url: string | null }[] | null;
  after_snapshot: { screenshot_url: string | null } | { screenshot_url: string | null }[] | null;
}

interface InsightRow {
  id: string;
  competitor_id: string;
  page_type: string;
  insight_text: string;
  related_change_ids: string[];
  created_at: string;
  competitors: { name: string | null; url: string } | { name: string | null; url: string }[] | null;
}

interface RelatedChangeRow {
  id: string;
  before_snapshot: { screenshot_url: string | null } | { screenshot_url: string | null }[] | null;
  after_snapshot: { screenshot_url: string | null } | { screenshot_url: string | null }[] | null;
}

function pickCompetitor(row: InsightRow): { name: string | null; url: string } | null {
  if (!row.competitors) return null;
  return Array.isArray(row.competitors) ? row.competitors[0] ?? null : row.competitors;
}

function pickScreenshotUrl(
  snapshot: RelatedChangeRow["before_snapshot"] | RelatedChangeRow["after_snapshot"]
): string | null {
  if (!snapshot) return null;
  const record = Array.isArray(snapshot) ? snapshot[0] : snapshot;
  return record?.screenshot_url ?? null;
}

export default async function ChangesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const workspaceId = await getOrCreateWorkspaceId();
  if (!workspaceId) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-12">
        <p className="text-muted-foreground">You must be signed in to view changes.</p>
        <Button asChild>
          <Link href="/login">Sign in</Link>
        </Button>
      </div>
    );
  }

  const supabase = await createClient();

  const params = await searchParams;
  const competitorId = typeof params.competitor === "string" ? params.competitor : undefined;
  const category = typeof params.category === "string" ? params.category : undefined;
  const fromDate = typeof params.from === "string" ? params.from : undefined;
  const toDate = typeof params.to === "string" ? params.to : undefined;
  const pageParam = typeof params.page === "string" ? params.page : "1";
  const page = Math.max(1, parseInt(pageParam, 10) || 1);
  const PAGE_SIZE = 20;
  const offset = (page - 1) * PAGE_SIZE;

  const { data: competitorsData } = await supabase
    .from("competitors")
    .select("id, name, url")
    .eq("workspace_id", workspaceId)
    .order("name");

  const competitors = competitorsData ?? [];
  const competitorIds = competitors.map((c) => c.id);
  if (competitorIds.length === 0) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold tracking-tight">Competitive Intelligence</h1>
        <EmptyState
          title="You’re not tracking any competitors yet."
          description="Add competitors on the Competitors page and run a check. Strategic updates will appear here."
        />
      </div>
    );
  }

  let baseQuery = supabase
    .from("insights")
    .select(
      `
      id,
      created_at,
      page_type,
      insight_text,
      related_change_ids,
      competitor_id,
      competitors(name, url)
    `,
      { count: "exact" }
    )
    .in("competitor_id", competitorIds)
    .order("created_at", { ascending: false });

  if (competitorId) baseQuery = baseQuery.eq("competitor_id", competitorId);
  if (category) baseQuery = baseQuery.eq("page_type", category);
  if (fromDate) baseQuery = baseQuery.gte("created_at", `${fromDate}T00:00:00.000Z`);
  if (toDate) baseQuery = baseQuery.lte("created_at", `${toDate}T23:59:59.999Z`);

  const { data: insightsRows = [], count: totalCount } = await baseQuery.range(offset, offset + PAGE_SIZE - 1);
  const insightRows = (insightsRows ?? []) as InsightRow[];

  const relatedChangeIds = Array.from(
    new Set(insightRows.flatMap((insight) => insight.related_change_ids ?? []))
  );

  const relatedChangesMap = new Map<string, RelatedChangeRow>();
  if (relatedChangeIds.length > 0) {
    const { data: relatedChanges } = await supabase
      .from("changes")
      .select(
        `
        id,
        before_snapshot:snapshots!before_snapshot_id(screenshot_url),
        after_snapshot:snapshots!after_snapshot_id(screenshot_url)
      `
      )
      .in("id", relatedChangeIds);

    for (const row of (relatedChanges ?? []) as RelatedChangeRow[]) {
      relatedChangesMap.set(row.id, row);
    }
  }

  const insights: InsightFeedItem[] = insightRows.map((insight) => {
    const competitor = pickCompetitor(insight);
    const competitorName = competitor?.name ?? competitor?.url ?? "Unknown competitor";
    const firstRelatedChangeId = insight.related_change_ids?.[0] ?? null;
    const relatedChange = firstRelatedChangeId ? relatedChangesMap.get(firstRelatedChangeId) : undefined;

    return {
      id: insight.id,
      competitorName,
      competitorUrl: competitor?.url ?? null,
      pageType: insight.page_type,
      insightText: insight.insight_text,
      createdAt: insight.created_at,
      beforeScreenshotUrl: relatedChange ? pickScreenshotUrl(relatedChange.before_snapshot) : null,
      afterScreenshotUrl: relatedChange ? pickScreenshotUrl(relatedChange.after_snapshot) : null,
    };
  });

  const totalPages = totalCount != null ? Math.max(1, Math.ceil(totalCount / PAGE_SIZE)) : 1;
  const hasNextPage = page < totalPages;
  const hasPrevPage = page > 1;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Competitive Intelligence</h1>
        <CrawlButton competitors={competitors} />
      </div>
      <ChangeFeedFilters
        competitors={competitors}
        currentCompetitorId={competitorId}
        currentCategory={category}
        currentFrom={fromDate}
        currentTo={toDate}
      />
      <InsightFeedList
        insights={insights}
        page={page}
        totalPages={totalPages}
        totalCount={totalCount ?? 0}
        pageSize={PAGE_SIZE}
        hasPrevPage={hasPrevPage}
        hasNextPage={hasNextPage}
        hasActiveFilters={!!(competitorId || category || fromDate || toDate)}
      />
    </div>
  );
}
