"use client";

import React, { useTransition, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EmptyState } from "@/components/empty-state";
import { updateCrawlFrequency, deleteCompetitor, triggerCrawlNow, getCrawlJob } from "./actions";
import { EditCompetitorDialog } from "./edit-competitor-dialog";
import type { CrawlFrequency } from "@/lib/types/competitor";

export type CompetitorRow = {
  id: string;
  name: string | null;
  url: string;
  last_crawled_at: string | null;
  crawl_frequency: CrawlFrequency;
  created_at: string;
  updated_at: string;
};

export type LatestJob = {
  id: string;
  competitor_id: string;
  status: string;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
  error_message: string | null;
};

const POLL_INTERVAL_MS = 2000;
const POLL_TIMEOUT_MS = 600000;

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function CrawlStatus({ lastCrawledAt }: { lastCrawledAt: string | null }) {
  if (!lastCrawledAt) {
    return <Badge variant="secondary">Not checked yet</Badge>;
  }
  return <Badge variant="default">Tracking active</Badge>;
}

function JobStatusBadge({ job }: { job: LatestJob | undefined }) {
  if (!job) return null;
  const status = job.status;
  if (status === "pending") return <Badge variant="outline">Queued</Badge>;
  if (status === "running") return <Badge variant="secondary">Running…</Badge>;
  if (status === "failed") return <Badge variant="destructive">Failed</Badge>;
  return null;
}

export function CompetitorsTable({
  competitors,
  latestJobs = {},
}: {
  competitors: CompetitorRow[];
  latestJobs?: Record<string, LatestJob>;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [crawlingJobId, setCrawlingJobId] = useState<string | null>(null);
  const [crawlingCompetitorId, setCrawlingCompetitorId] = useState<string | null>(null);
  const [editCompetitor, setEditCompetitor] = useState<CompetitorRow | null>(null);
  const [editOpen, setEditOpen] = useState(false);

  const pollUntilDone = useCallback(
    async (jobId: string, competitorId: string) => {
      const deadline = Date.now() + POLL_TIMEOUT_MS;
      while (Date.now() < deadline) {
        const result = await getCrawlJob(jobId);
        if (!result.ok) {
          setCrawlingJobId(null);
          setCrawlingCompetitorId(null);
          alert(`Update check polling error: ${result.error}`);
          router.refresh();
          return;
        }
        if (result.job.status === "completed") {
          setCrawlingJobId(null);
          setCrawlingCompetitorId(null);
          router.push(
            `/dashboard/competitors/${competitorId}/crawl/${jobId}`
          );
          return;
        }
        if (result.job.status === "failed") {
          setCrawlingJobId(null);
          setCrawlingCompetitorId(null);
          alert(
            `Update check failed: ${result.job.error_message || "Unknown error"}`
          );
          router.refresh();
          return;
        }
        await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
      }
      setCrawlingJobId(null);
      setCrawlingCompetitorId(null);
      alert("Update check timed out. Review competitor status and try again.");
      router.refresh();
    },
    [router]
  );

  function onFrequencyChange(competitorId: string, value: string) {
    startTransition(async () => {
      await updateCrawlFrequency(competitorId, value as CrawlFrequency);
    });
  }

  function onDelete(competitorId: string) {
    if (!confirm("Remove this competitor? This cannot be undone.")) return;
    startTransition(async () => {
      await deleteCompetitor(competitorId);
    });
  }

  async function onCrawlNow(competitorId: string) {
    try {
      const result = await triggerCrawlNow(competitorId);
      if (result.ok) {
        setCrawlingJobId(result.jobId);
        setCrawlingCompetitorId(competitorId);
        router.refresh();
        pollUntilDone(result.jobId, competitorId).finally(() => {
          setCrawlingJobId(null);
          setCrawlingCompetitorId(null);
        });
      } else {
        alert(`Unable to start competitor update check: ${result.error}`);
      }
    } catch (error) {
      alert("Unable to start competitor update check.");
      console.error(error);
    }
  }

  function onEdit(c: CompetitorRow) {
    setEditCompetitor(c);
    setEditOpen(true);
  }

  if (competitors.length === 0) {
    return (
      <EmptyState
        title="You’re not tracking any competitors yet."
        description="Add a website above to start tracking strategic competitor updates."
      />
    );
  }

  const hasAnyCrawl = competitors.some((c) => c.last_crawled_at != null);

  return (
    <>
      {!hasAnyCrawl && (
        <EmptyState
          title="No checks yet"
          description="Check for competitor updates below and we’ll surface strategic updates here and in Competitive Intelligence."
          className="mb-6"
        />
      )}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>URL</TableHead>
              <TableHead>Check frequency</TableHead>
              <TableHead>Last checked</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[260px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {competitors.map((c) => {
              return (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">
                    <Link
                      href={`/dashboard/competitors/${c.id}`}
                      className="hover:underline"
                    >
                      {c.name || c.url}
                    </Link>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    <a
                      href={c.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:underline"
                    >
                      {c.url}
                    </a>
                  </TableCell>
                    <TableCell>
                      <Select
                        value={c.crawl_frequency}
                        onValueChange={(value) => onFrequencyChange(c.id, value)}
                        disabled={isPending}
                      >
                        <SelectTrigger className="w-[130px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="daily">Daily</SelectItem>
                          <SelectItem value="weekly">Weekly</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDate(c.last_crawled_at)}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap items-center gap-2">
                        <CrawlStatus lastCrawledAt={c.last_crawled_at} />
                        <JobStatusBadge job={latestJobs[c.id]} />
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onEdit(c)}
                          disabled={isPending}
                        >
                          Edit
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onCrawlNow(c.id)}
                          disabled={
                            isPending ||
                            crawlingJobId !== null ||
                            (latestJobs[c.id]?.status === "pending" || latestJobs[c.id]?.status === "running")
                          }
                        >
                          {crawlingCompetitorId === c.id ? "Running…" : "Check for competitor updates"}
                        </Button>
                        <Button variant="ghost" size="sm" asChild>
                          <Link href={`/insights/${c.id}`}>View insights →</Link>
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => onDelete(c.id)}
                          disabled={isPending}
                        >
                          Delete
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
      <EditCompetitorDialog
        competitor={editCompetitor}
        open={editOpen}
        onOpenChange={setEditOpen}
      />
    </>
  );
}
