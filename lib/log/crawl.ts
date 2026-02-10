/**
 * Centralized logging for crawl, snapshot, and change-detection failures.
 * Use for monitoring and debugging; failures are logged here so they can be
 * routed to an external service later without changing call sites.
 */

const PREFIX = "[crawl]";

export interface CrawlFailureContext {
  competitorId?: string;
  jobId?: string;
  url?: string;
  message: string;
  errors?: string[];
}

export function crawlFailure(context: CrawlFailureContext): void {
  const payload = {
    type: "crawl_failure",
    ...context,
    at: new Date().toISOString(),
  };
  console.error(`${PREFIX} Crawl failure:`, context.message, payload);
}

export interface SnapshotFailureContext {
  competitorId?: string;
  jobId?: string;
  pageUrl?: string;
  pageType?: string;
  message: string;
  cause?: string;
}

export function snapshotFailure(context: SnapshotFailureContext): void {
  const payload = {
    type: "snapshot_failure",
    ...context,
    at: new Date().toISOString(),
  };
  console.error(`${PREFIX} Snapshot failure:`, context.message, payload);
}

export interface ChangeDetectionErrorContext {
  pageUrl?: string;
  pageType?: string;
  competitorId?: string;
  message: string;
  cause?: string;
}

export function changeDetectionError(context: ChangeDetectionErrorContext): void {
  const payload = {
    type: "change_detection_error",
    ...context,
    at: new Date().toISOString(),
  };
  console.error(`${PREFIX} Change detection error:`, context.message, payload);
}
