"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { EditCompetitorDialog } from "../edit-competitor-dialog";
import { triggerCrawlNow, getCrawlJob } from "../actions";
import type { CrawlFrequency } from "@/lib/types/competitor";

const POLL_INTERVAL_MS = 2000;
const POLL_TIMEOUT_MS = 600000;

type CompetitorRow = {
  id: string;
  name: string | null;
  url: string;
  crawl_frequency: CrawlFrequency;
};

export function CompetitorDetailClient({
  competitor,
}: {
  competitor: CompetitorRow;
}) {
  const router = useRouter();
  const [crawlingJobId, setCrawlingJobId] = useState<string | null>(null);
  const [editOpen, setEditOpen] = useState(false);

  const pollUntilDone = useCallback(
    async (jobId: string, competitorId: string) => {
      const deadline = Date.now() + POLL_TIMEOUT_MS;
      while (Date.now() < deadline) {
        const result = await getCrawlJob(jobId);
        if (!result.ok) {
          setCrawlingJobId(null);
          alert(`Update check polling error: ${result.error}`);
          router.refresh();
          return;
        }
        if (result.job.status === "completed") {
          setCrawlingJobId(null);
          router.push(
            `/dashboard/competitors/${competitorId}/crawl/${jobId}`
          );
          return;
        }
        if (result.job.status === "failed") {
          setCrawlingJobId(null);
          alert(`Update check failed: ${result.job.error_message || "Unknown error"}`);
          router.refresh();
          return;
        }
        await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
      }
      setCrawlingJobId(null);
      alert("Update check timed out. Check the page for current status.");
      router.refresh();
    },
    [router]
  );

  async function onCrawlNow() {
    try {
      const result = await triggerCrawlNow(competitor.id);
      if (result.ok) {
        setCrawlingJobId(result.jobId);
        router.refresh();
        pollUntilDone(result.jobId, competitor.id).finally(() => {
          setCrawlingJobId(null);
        });
      } else {
        alert(`Unable to start competitor update check: ${result.error}`);
      }
    } catch (error) {
      alert("Unable to start competitor update check.");
      console.error(error);
    }
  }

  async function onDelete() {
    if (!confirm("Remove this competitor? This cannot be undone.")) return;
    const { deleteCompetitor } = await import("../actions");
    const result = await deleteCompetitor(competitor.id);
    if (result.ok) {
      router.push("/dashboard/competitors");
      router.refresh();
    } else {
      alert(result.error);
    }
  }

  return (
    <>
      <div className="flex flex-wrap gap-2">
        <Button
          onClick={onCrawlNow}
          disabled={crawlingJobId !== null}
        >
          {crawlingJobId ? "Running…" : "Check for competitor updates"}
        </Button>
        <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
          Edit
        </Button>
        <Button variant="destructive" size="sm" onClick={onDelete}>
          Delete
        </Button>
      </div>
      <EditCompetitorDialog
        competitor={{
          ...competitor,
          last_crawled_at: null,
          created_at: "",
          updated_at: "",
        }}
        open={editOpen}
        onOpenChange={setEditOpen}
      />
    </>
  );
}
