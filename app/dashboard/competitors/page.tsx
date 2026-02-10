import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { addCompetitor, getOrCreateWorkspaceId } from "./actions";
import { AddCompetitorDialog } from "./add-competitor-dialog";
import { CompetitorsTable } from "./competitors-table";
import { Button } from "@/components/ui/button";

export default async function CompetitorsPage() {
  const workspaceId = await getOrCreateWorkspaceId();
  if (!workspaceId) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-12">
        <p className="text-muted-foreground">You must be signed in to view competitors.</p>
        <Button asChild>
          <Link href="/login">Sign in</Link>
        </Button>
      </div>
    );
  }

  const supabase = await createClient();

  const { data: competitorsData } = await supabase
    .from("competitors")
    .select("id, name, url, last_crawled_at, crawl_frequency, created_at, updated_at")
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: false });

  const competitors = competitorsData ?? [];

  const competitorIds = competitors.map((c) => c.id);

  const { data: jobsData } = competitorIds.length
    ? await supabase
        .from("crawl_jobs")
        .select("id, competitor_id, status, created_at, started_at, completed_at, error_message")
        .in("competitor_id", competitorIds)
        .order("created_at", { ascending: false })
        .limit(500)
    : { data: [] as any[] };

  const latestJobByCompetitor = new Map<
    string,
    {
      id: string;
      competitor_id: string;
      status: string;
      created_at: string;
      started_at: string | null;
      completed_at: string | null;
      error_message: string | null;
    }
  >();

  for (const job of jobsData ?? []) {
    if (!latestJobByCompetitor.has(job.competitor_id)) {
      latestJobByCompetitor.set(job.competitor_id, job);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Competitors</h1>
        <AddCompetitorDialog addCompetitor={addCompetitor} />
      </div>
      <CompetitorsTable
        competitors={competitors}
        latestJobs={Object.fromEntries(latestJobByCompetitor.entries())}
      />
    </div>
  );
}
