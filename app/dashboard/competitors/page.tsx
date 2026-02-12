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

  // First attempt: select logo_url as well (for logo display in the table).
  // If the column is missing (e.g. migration not yet applied in some env),
  // fall back to a schema-compatible select so we never silently return "no competitors".
  const {
    data: competitorsWithLogo,
    error: competitorsWithLogoError,
  } = await supabase
    .from("competitors")
    .select("id, name, url, logo_url, last_crawled_at, crawl_frequency, created_at, updated_at")
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: false });

  let competitorsData = competitorsWithLogo ?? [];

  if (competitorsWithLogoError) {
    const message = String(competitorsWithLogoError.message || competitorsWithLogoError);
    const isMissingLogoColumn =
      message.includes("logo_url") &&
      (message.toLowerCase().includes("does not exist") ||
        message.includes("Could not find the 'logo_url' column"));

    if (isMissingLogoColumn) {
      // Fallback: query without logo_url so the page still works and competitors are visible.
      const { data: fallbackData, error: fallbackError } = await supabase
        .from("competitors")
        .select("id, name, url, last_crawled_at, crawl_frequency, created_at, updated_at")
        .eq("workspace_id", workspaceId)
        .order("created_at", { ascending: false });

      if (fallbackError) {
        console.error("Failed to load competitors (fallback without logo_url):", fallbackError);
        throw new Error("Unable to load competitors. Please try again.");
      }

      competitorsData = fallbackData ?? [];
    } else {
      console.error("Failed to load competitors:", competitorsWithLogoError);
      throw new Error("Unable to load competitors. Please try again.");
    }
  }

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
