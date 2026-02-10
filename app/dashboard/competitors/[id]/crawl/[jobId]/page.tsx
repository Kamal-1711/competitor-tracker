import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getOrCreateWorkspaceId } from "../../../actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface CrawlResultsPageProps {
  params: Promise<{ id: string; jobId: string }>;
}

function formatDuration(startIso: string | null, endIso: string | null): string {
  if (!startIso || !endIso) return "—";
  const ms = new Date(endIso).getTime() - new Date(startIso).getTime();
  if (ms < 1000) return `${ms}ms`;
  const secs = Math.round(ms / 1000);
  if (secs < 60) return `${secs}s`;
  const mins = Math.floor(secs / 60);
  const remainSecs = secs % 60;
  return `${mins}m ${remainSecs}s`;
}

function formatTimestamp(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function StatusBadge({ status }: { status: string }) {
  if (status === "completed") return <Badge variant="default">Tracking active</Badge>;
  if (status === "failed") return <Badge variant="destructive">Failed</Badge>;
  if (status === "running") return <Badge variant="secondary">Running...</Badge>;
  if (status === "pending") return <Badge variant="outline">Queued</Badge>;
  return <Badge variant="secondary">{status}</Badge>;
}

export default async function CrawlResultsPage({ params }: CrawlResultsPageProps) {
  const { id: competitorId, jobId } = await params;

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

  // Verify competitor belongs to workspace
  const { data: competitor } = await supabase
    .from("competitors")
    .select("id, name, url, workspace_id")
    .eq("id", competitorId)
    .eq("workspace_id", workspaceId)
    .single();

  if (!competitor) notFound();

  // Fetch crawl job
  const { data: job } = await supabase
    .from("crawl_jobs")
    .select("id, status, started_at, completed_at, error_message, created_at, source")
    .eq("id", jobId)
    .eq("competitor_id", competitorId)
    .single();

  if (!job) notFound();

  // Fetch snapshots for this crawl job
  const { data: snapshots } = await supabase
    .from("snapshots")
    .select("id, url, page_type, title, http_status, screenshot_url, version_number, created_at")
    .eq("crawl_job_id", jobId)
    .order("created_at", { ascending: true });

  const pages = snapshots ?? [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Link href="/dashboard/competitors" className="hover:underline">
            Competitors
          </Link>
          <span>/</span>
          <span>{competitor.name || competitor.url}</span>
          <span>/</span>
          <span>Check Results</span>
        </div>
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold tracking-tight">Check Results</h1>
          <StatusBadge status={job.status} />
        </div>
      </div>

      {/* Job Summary Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Check Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm sm:grid-cols-4">
            <div>
              <dt className="text-muted-foreground">Competitor</dt>
              <dd className="font-medium">{competitor.name || competitor.url}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Status</dt>
              <dd><StatusBadge status={job.status} /></dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Started</dt>
              <dd className="font-medium">{formatTimestamp(job.started_at)}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Duration</dt>
              <dd className="font-medium">{formatDuration(job.started_at, job.completed_at)}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Pages checked</dt>
              <dd className="font-medium">{pages.length}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Source</dt>
              <dd className="font-medium capitalize">{job.source ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Last checked</dt>
              <dd className="font-medium">{formatTimestamp(job.completed_at)}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Job ID</dt>
              <dd className="font-mono text-xs text-muted-foreground">{job.id}</dd>
            </div>
          </dl>
          {job.error_message && (
            <div className="mt-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
              <strong>Error:</strong> {job.error_message}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pages / Snapshots */}
      {pages.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            {job.status === "running" || job.status === "pending"
              ? "Check is still in progress. Refresh to see results."
              : "No pages were captured during this check."}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Pages checked ({pages.length})</h2>
          <div className="grid gap-4 md:grid-cols-2">
            {pages.map((page) => (
              <Card key={page.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <CardTitle className="text-sm font-medium leading-tight">
                        {page.title || page.url}
                      </CardTitle>
                      <a
                        href={page.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-1 block truncate text-xs text-muted-foreground hover:underline"
                      >
                        {page.url}
                      </a>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <Badge variant="outline" className="text-xs capitalize">
                        {page.page_type}
                      </Badge>
                      {page.http_status && (
                        <Badge
                          variant={page.http_status >= 200 && page.http_status < 400 ? "default" : "destructive"}
                          className="text-xs"
                        >
                          {page.http_status}
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {page.screenshot_url ? (
                    <a href={page.screenshot_url} target="_blank" rel="noopener noreferrer">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={page.screenshot_url}
                        alt={`Screenshot of ${page.title || page.url}`}
                        className="w-full rounded-md border shadow-sm transition-opacity hover:opacity-90"
                        loading="lazy"
                      />
                    </a>
                  ) : (
                    <div className="flex h-40 items-center justify-center rounded-md border bg-muted text-sm text-muted-foreground">
                      No screenshot available
                    </div>
                  )}
                  <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                    <span>Version {page.version_number}</span>
                    <span>{formatTimestamp(page.created_at)}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3">
        <Button asChild variant="outline">
          <Link href="/dashboard/competitors">Back to Competitors</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/dashboard/changes">View Competitive Intelligence</Link>
        </Button>
      </div>
    </div>
  );
}
