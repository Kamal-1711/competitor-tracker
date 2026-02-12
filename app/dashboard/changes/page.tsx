import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getOrCreateWorkspaceId } from "../competitors/actions";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/empty-state";
import { ChangeFeedFilters } from "./change-feed-filters";
import { CrawlButton } from "./crawl-button";
import { MovementSummaryBar } from "./movement-summary-bar";
import { MovementList, type StrategicMovement } from "./movement-list";
import { ChangeFeedPagination } from "./change-feed-pagination";

export default async function ChangesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const workspaceId = await getOrCreateWorkspaceId();
  if (!workspaceId) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-12">
        <p className="text-muted-foreground">You must be signed in to view strategic movements.</p>
        <Button asChild>
          <Link href="/login">Sign in</Link>
        </Button>
      </div>
    );
  }

  const supabase = await createClient();

  const params = await searchParams;
  const page = typeof params.page === "string" ? parseInt(params.page) : 1;
  const limit = 10;
  const offset = (page - 1) * limit;

  // 1. Fetch Strategic Movements (Aggregated Changes)
  let query = supabase
    .from("strategic_movements")
    .select(`
      *,
      competitors (
        name,
        url
      )
    `)
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: false });

  // Apply filters if present
  if (typeof params.competitor === "string" && params.competitor !== "all") {
    query = query.eq("competitor_id", params.competitor);
  }
  if (typeof params.category === "string" && params.category !== "all") {
    query = query.eq("movement_category", params.category);
  }
  if (typeof params.impact === "string" && params.impact !== "all") {
    query = query.eq("impact_level", params.impact.toUpperCase());
  }

  const { data: movementsData, count } = await query
    .range(offset, offset + limit - 1)
    .returns<StrategicMovement[]>();

  const movements = movementsData ?? [];

  // 2. Fetch Aggregated Statistics for the header (Last 7 days)
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const { data: statsData } = await supabase
    .from("strategic_movements")
    .select("impact_level, competitors(name)")
    .eq("workspace_id", workspaceId)
    .gte("created_at", sevenDaysAgo.toISOString());

  const highImpactCount = (statsData as any[] || []).filter(m => m.impact_level === "HIGH").length;
  const mediumImpactCount = (statsData as any[] || []).filter(m => m.impact_level === "MEDIUM").length;
  const lowImpactCount = (statsData as any[] || []).filter(m => m.impact_level === "LOW").length;

  // Calculate most active competitor from stats
  const compCounts: Record<string, number> = {};
  (statsData as any[] || []).forEach(s => {
    const competitor = s.competitors;
    const compObj = Array.isArray(competitor) ? competitor[0] : competitor;
    const name = compObj?.name || "Unknown";
    compCounts[name] = (compCounts[name] || 0) + 1;
  });
  const mostActive = Object.entries(compCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || "";

  // 3. Metadata for filters
  const { data: competitors } = await supabase
    .from("competitors")
    .select("id, name, url")
    .eq("workspace_id", workspaceId);

  return (
    <div className="space-y-8 pb-12">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">Strategic Intelligence Feed</h1>
          <p className="text-muted-foreground">
            AI-detected competitive movements and strategic shifts.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <CrawlButton competitors={competitors ?? []} />
        </div>
      </div>

      <MovementSummaryBar
        total7Days={(statsData as any[] || []).length}
        highImpact={highImpactCount}
        mediumImpact={mediumImpactCount}
        lowImpact={lowImpactCount}
        mostActiveCompetitor={mostActive}
      />

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Live Analysis</h2>
          <ChangeFeedFilters competitors={competitors ?? []} />
        </div>

        {movements.length === 0 ? (
          <EmptyState
            title="No movements detected"
            description="Our AI has not detected any significant strategic shifts in the selected period."
          />
        ) : (
          <div className="space-y-6">
            <MovementList movements={movements} />
            <ChangeFeedPagination
              page={page}
              totalPages={Math.ceil((count || 0) / limit)}
              totalCount={count || 0}
              pageSize={limit}
              hasPrevPage={page > 1}
              hasNextPage={page < Math.ceil((count || 0) / limit)}
            />
          </div>
        )}
      </div>
    </div>
  );
}
