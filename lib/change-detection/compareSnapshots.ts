import { changeDetectionError } from "@/lib/log/crawl";
import { detectChanges, type DetectedChange, type PageType } from "./detectChanges";
import { persistChanges } from "./persistChanges";
import {
  detectPmSignalChanges,
  type PmSignalDiff,
  type PmSignalSnapshotInput,
} from "./detectPmSignalChanges";
import { generateInsights } from "@/lib/insights/generateInsights";
import { persistInsights } from "@/lib/insights/persistInsights";

export interface CompareSnapshotsInput {
  competitorId: string;
  pageId: string;
  pageUrl: string;
  pageType: PageType;
  beforeSnapshotId: string;
  beforeHtml: string;
  afterSnapshotId: string;
  afterHtml: string;
  beforeSignals?: Omit<PmSignalSnapshotInput, "html" | "pageType">;
  afterSignals?: Omit<PmSignalSnapshotInput, "html" | "pageType">;
  persist?: boolean;
}

export interface CompareSnapshotsResult {
  beforeSnapshotId: string;
  afterSnapshotId: string;
  pageId: string;
  pageUrl: string;
  pageType: PageType;
  diffs: DetectedChange[];
  pmDiffs: PmSignalDiff[];
  persistedChangeIds: string[];
}

/**
 * Compares two snapshots and optionally persists classified changes.
 * On failure, logs and returns empty diffs so the crawler can continue.
 */
export async function compareSnapshots(input: CompareSnapshotsInput): Promise<CompareSnapshotsResult> {
  let diffs: DetectedChange[] = [];
  let pmDiffs: PmSignalDiff[] = [];
  let persistedChangeIds: string[] = [];

  try {
    diffs = detectChanges({
      beforeHtml: input.beforeHtml,
      afterHtml: input.afterHtml,
      pageUrl: input.pageUrl,
      pageType: input.pageType,
    });

    pmDiffs = detectPmSignalChanges({
      beforeSnapshot: {
        pageType: input.pageType,
        primaryHeadline: input.beforeSignals?.primaryHeadline ?? null,
        primaryCtaText: input.beforeSignals?.primaryCtaText ?? null,
        navItems: input.beforeSignals?.navItems ?? [],
        html: input.beforeHtml,
      },
      afterSnapshot: {
        pageType: input.pageType,
        primaryHeadline: input.afterSignals?.primaryHeadline ?? null,
        primaryCtaText: input.afterSignals?.primaryCtaText ?? null,
        navItems: input.afterSignals?.navItems ?? [],
        html: input.afterHtml,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    changeDetectionError({
      pageUrl: input.pageUrl,
      pageType: input.pageType,
      competitorId: input.competitorId,
      message: "Change detection failed",
      cause: message,
    });
    return {
      beforeSnapshotId: input.beforeSnapshotId,
      afterSnapshotId: input.afterSnapshotId,
      pageId: input.pageId,
      pageUrl: input.pageUrl,
      pageType: input.pageType,
      diffs: [],
      pmDiffs: [],
      persistedChangeIds: [],
    };
  }

  if (input.persist && diffs.length > 0) {
    try {
      const persisted = await persistChanges({
        competitorId: input.competitorId,
        pageId: input.pageId,
        beforeSnapshotId: input.beforeSnapshotId,
        afterSnapshotId: input.afterSnapshotId,
        pageUrl: input.pageUrl,
        pageType: input.pageType,
        changes: diffs,
      });
      persistedChangeIds = persisted.changeIds;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      changeDetectionError({
        pageUrl: input.pageUrl,
        pageType: input.pageType,
        competitorId: input.competitorId,
        message: "Failed to save changes",
        cause: message,
      });
    }
  }

  if (input.persist && pmDiffs.length > 0) {
    try {
      const insights = generateInsights({
        competitorId: input.competitorId,
        pageType: input.pageType,
        diffs: pmDiffs,
        relatedChangeIds: persistedChangeIds,
      });
      await persistInsights(insights);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      changeDetectionError({
        pageUrl: input.pageUrl,
        pageType: input.pageType,
        competitorId: input.competitorId,
        message: "Failed to generate or save insights",
        cause: message,
      });
    }
  }

  return {
    beforeSnapshotId: input.beforeSnapshotId,
    afterSnapshotId: input.afterSnapshotId,
    pageId: input.pageId,
    pageUrl: input.pageUrl,
    pageType: input.pageType,
    diffs,
    pmDiffs,
    persistedChangeIds,
  };
}

