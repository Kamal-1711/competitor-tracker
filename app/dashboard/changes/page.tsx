import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getOrCreateWorkspaceId } from "../competitors/actions";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/empty-state";
import { ChangeFeedFilters } from "./change-feed-filters";
import { CrawlButton } from "./crawl-button";
import { type StrategicSignalItem } from "./strategic-signal-stream-list";
import { ChangeFeedRealtime } from "./change-feed-realtime";
import { WeeklyStrategicSummary, type MovementSignal } from "./weekly-strategic-summary";

export type ChangeCategory =
  | "Positioning & Messaging"
  | "Pricing & Offers"
  | "Product / Services"
  | "Trust & Credibility"
  | "Navigation / Structure";

interface ChangeRow {
  id: string;
  competitor_id: string;
  page_type: string;
  created_at: string;
  page_url: string;
  change_type: string;
  category: ChangeCategory;
  summary: string;
  impact_level: "Minor" | "Moderate" | "Strategic" | null;
  strategic_interpretation: string | null;
  suggested_monitoring_action: string | null;
  competitors: { name: string | null; url: string } | { name: string | null; url: string }[] | null;
  before_snapshot: { screenshot_url: string | null } | { screenshot_url: string | null }[] | null;
  after_snapshot: { screenshot_url: string | null } | { screenshot_url: string | null }[] | null;
}

function pickCompetitor(row: ChangeRow): { name: string | null; url: string } | null {
  if (!row.competitors) return null;
  return Array.isArray(row.competitors) ? row.competitors[0] ?? null : row.competitors;
}

function pickScreenshotUrl(
  snapshot: ChangeRow["before_snapshot"] | ChangeRow["after_snapshot"]
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
  const focus = typeof params.focus === "string" ? params.focus : undefined;
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

  let changesQuery = supabase
    .from("changes")
    .select(
      `
      id,
      competitor_id,
      page_type,
      page_url,
      change_type,
      category,
      summary,
      impact_level,
      strategic_interpretation,
      suggested_monitoring_action,
      created_at,
      competitors(name, url),
      before_snapshot:snapshots!before_snapshot_id(screenshot_url),
      after_snapshot:snapshots!after_snapshot_id(screenshot_url)
    `,
      { count: "exact" }
    )
    .in("competitor_id", competitorIds)
    .order("created_at", { ascending: false });

  if (competitorId) changesQuery = changesQuery.eq("competitor_id", competitorId);
  if (fromDate) changesQuery = changesQuery.gte("created_at", `${fromDate}T00:00:00.000Z`);
  if (toDate) changesQuery = changesQuery.lte("created_at", `${toDate}T23:59:59.999Z`);

  // Map focus filters to change categories / page types.
  if (focus === "messaging") {
    changesQuery = changesQuery.eq("category", "Positioning & Messaging");
  } else if (focus === "pricing") {
    changesQuery = changesQuery.eq("category", "Pricing & Offers");
  } else if (focus === "services") {
    changesQuery = changesQuery.eq("category", "Product / Services");
  } else if (focus === "seo") {
    // Approximate SEO/content by use-case/industry pages.
    changesQuery = changesQuery.eq("page_type", "use_cases_or_industries");
  } else if (focus === "structural") {
    changesQuery = changesQuery.in("category", ["Navigation / Structure", "Trust & Credibility"]);
  }

  const { data: changeRows = [], count: totalCount } = await changesQuery.range(
    offset,
    offset + PAGE_SIZE - 1
  );
  const changes = (changeRows ?? []) as ChangeRow[];

  // Weekly summary over last 7 days for current filters (except pagination).
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const sevenDaysAgoIso = sevenDaysAgo.toISOString();

  let weeklyQuery = supabase
    .from("changes")
    .select("id, category, created_at", { count: "exact" })
    .in("competitor_id", competitorIds)
    .gte("created_at", sevenDaysAgoIso);

  if (competitorId) weeklyQuery = weeklyQuery.eq("competitor_id", competitorId);
  if (focus === "messaging") {
    weeklyQuery = weeklyQuery.eq("category", "Positioning & Messaging");
  } else if (focus === "pricing") {
    weeklyQuery = weeklyQuery.eq("category", "Pricing & Offers");
  } else if (focus === "services") {
    weeklyQuery = weeklyQuery.eq("category", "Product / Services");
  } else if (focus === "seo") {
    weeklyQuery = weeklyQuery.eq("page_type", "use_cases_or_industries");
  } else if (focus === "structural") {
    weeklyQuery = weeklyQuery.in("category", ["Navigation / Structure", "Trust & Credibility"]);
  }

  const { data: weeklyRows = [], count: weeklyCount } = await weeklyQuery;
  const weeklyTotal = weeklyCount ?? (weeklyRows?.length ?? 0);
  const categoryCounts: Record<string, number> = {};
  for (const row of weeklyRows ?? []) {
    const key = (row as { category?: string }).category ?? "Unclassified";
    categoryCounts[key] = (categoryCounts[key] ?? 0) + 1;
  }

  let movementSignal: MovementSignal = "Stable";
  if (weeklyTotal >= 10) movementSignal = "Active";
  else if (weeklyTotal >= 3) movementSignal = "Moderate";

  const signals: StrategicSignalItem[] = changes.map((change) => {
    const competitor = pickCompetitor(change);
    const competitorName = competitor?.name ?? competitor?.url ?? "Unknown competitor";
    const dateLabel = new Date(change.created_at).toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });

    return {
      id: change.id,
      createdAt: change.created_at,
      dateLabel,
      competitorName,
      pageUrl: change.page_url,
      pageType: change.page_type,
      category: change.category ?? "Navigation / Structure",
      changeType: change.change_type,
      summary: change.summary,
      impactLevel: (change.impact_level as StrategicSignalItem["impactLevel"]) ?? null,
      strategicInterpretation: change.strategic_interpretation,
      suggestedMonitoringAction: change.suggested_monitoring_action,
      beforeScreenshotUrl: pickScreenshotUrl(change.before_snapshot),
      afterScreenshotUrl: pickScreenshotUrl(change.after_snapshot),
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
        currentFocus={focus}
        currentFrom={fromDate}
        currentTo={toDate}
      />
      <WeeklyStrategicSummary
        totalChanges={weeklyTotal}
        categoryCounts={categoryCounts}
        movementSignal={movementSignal}
      />
      <ChangeFeedRealtime
        workspaceId={workspaceId}
        initialItems={signals}
        page={page}
        totalPages={totalPages}
        totalCount={totalCount ?? 0}
        pageSize={PAGE_SIZE}
        hasPrevPage={hasPrevPage}
        hasNextPage={hasNextPage}
        hasActiveFilters={!!(competitorId || focus || fromDate || toDate)}
      />
    </div>
  );
}
