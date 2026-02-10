import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getOrCreateWorkspaceId } from "../competitors/actions";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/empty-state";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChangeFeedList } from "../changes/change-feed-list";
import { ChangeFeedItem } from "../changes/page";

export default async function PricingPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const workspaceId = await getOrCreateWorkspaceId();
  if (!workspaceId) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-12">
        <p className="text-muted-foreground">You must be signed in to view pricing changes.</p>
        <Button asChild>
          <Link href="/login">Sign in</Link>
        </Button>
      </div>
    );
  }

  const supabase = await createClient();

  const params = await searchParams;
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

  // Fetch latest pricing page snapshots for each competitor
  const { data: pricingSnapshots } = competitorIds.length
    ? await supabase
        .from("snapshots")
        .select(
          `
          id,
          competitor_id,
          page_type,
          url,
          screenshot_url,
          created_at,
          competitors(id, name, url)
        `
        )
        .in("competitor_id", competitorIds)
        .eq("page_type", "pricing")
        .order("created_at", { ascending: false })
        .limit(1000)
    : { data: [] };

  // Group latest pricing snapshot by competitor
  const latestPricingByCompetitor = new Map<
    string,
    {
      url: string;
      screenshotUrl: string | null;
      createdAt: string;
      competitorName: string;
    }
  >();
  for (const snapshot of pricingSnapshots ?? []) {
    if (!latestPricingByCompetitor.has(snapshot.competitor_id)) {
      const comp = Array.isArray(snapshot.competitors) ? snapshot.competitors[0] : snapshot.competitors;
      latestPricingByCompetitor.set(snapshot.competitor_id, {
        url: snapshot.url,
        screenshotUrl: snapshot.screenshot_url,
        createdAt: snapshot.created_at,
        competitorName: comp?.name ?? comp?.url ?? "Unknown",
      });
    }
  }

  if (competitorIds.length === 0) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold tracking-tight">Pricing Changes</h1>
        <EmptyState
          title="No competitors yet"
          description="Add competitors on the Competitors page and run an update check. We’ll show pricing strategy shifts here once sites are checked."
        />
      </div>
    );
  }

  // Fetch changes with category "Pricing & Offers"
  const { data: changes = [], count: totalCount } = await supabase
    .from("changes")
    .select(
      `
      id,
      created_at,
      page_url,
      page_type,
      change_type,
      category,
      summary,
      details,
      competitor_id,
      competitors(name, url),
      before_snapshot:snapshots!before_snapshot_id(screenshot_url),
      after_snapshot:snapshots!after_snapshot_id(screenshot_url)
    `,
      { count: "exact" }
    )
    .in("competitor_id", competitorIds)
    .eq("category", "Pricing & Offers")
    .order("created_at", { ascending: false })
    .range(offset, offset + PAGE_SIZE - 1);

  const totalPages = totalCount != null ? Math.max(1, Math.ceil(totalCount / PAGE_SIZE)) : 1;
  const hasNextPage = page < totalPages;
  const hasPrevPage = page > 1;
  
  const changesList = changes ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Pricing Changes</h1>
      </div>

      {/* Current Pricing Snapshot Cards */}
      {latestPricingByCompetitor.size > 0 && (
        <div>
          <h2 className="mb-4 text-lg font-semibold">Current Pricing Pages</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {competitors.map((competitor) => {
              const pricingData = latestPricingByCompetitor.get(competitor.id);
              if (!pricingData) return null;

              return (
                <Card key={competitor.id}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <CardTitle className="text-sm font-medium leading-tight">
                          {pricingData.competitorName}
                        </CardTitle>
                        <a
                          href={pricingData.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-1 block truncate text-xs text-blue-600 hover:underline"
                        >
                          View pricing page →
                        </a>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        Pricing
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {pricingData.screenshotUrl ? (
                      <a
                        href={pricingData.screenshotUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={pricingData.screenshotUrl}
                          alt={`Pricing page of ${pricingData.competitorName}`}
                          className="w-full rounded-md border shadow-sm transition-opacity hover:opacity-90"
                          loading="lazy"
                        />
                      </a>
                    ) : (
                      <div className="flex h-40 items-center justify-center rounded-md border bg-muted text-sm text-muted-foreground">
                        No screenshot available
                      </div>
                    )}
                    <p className="text-xs text-muted-foreground">
                      Last captured: {new Date(pricingData.createdAt).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Pricing Changes Feed */}
      <div>
        <h2 className="mb-4 text-lg font-semibold">Pricing Changes Detected</h2>
        {changesList.length === 0 && page === 1 ? (
          <EmptyState
            title="No pricing changes detected"
            description="We haven't detected any pricing or offer changes for your competitors yet."
          />
        ) : (
          <ChangeFeedList
            changes={changesList as ChangeFeedItem[]}
            page={page}
            totalPages={totalPages}
            totalCount={totalCount ?? 0}
            pageSize={PAGE_SIZE}
            hasPrevPage={hasPrevPage}
            hasNextPage={hasNextPage}
            hasActiveFilters={false}
          />
        )}
      </div>
    </div>
  );
}
