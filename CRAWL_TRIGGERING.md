# Crawl Triggering System Implementation

## Overview

The crawl triggering system enables both manual and automated crawling with built-in idempotency safeguards.

## Components

### 1. Server Action: `triggerCrawlNow`
**File**: `app/dashboard/competitors/actions.ts`

- **Purpose**: Trigger a manual crawl for a specific competitor
- **Idempotency**: Prevents duplicate crawls within 5 minutes
- **Validation**: Verifies workspace ownership before creating job
- **Returns**: `{ ok: true; jobId: string }` or `{ ok: false; error: string }`

**Usage**:
```typescript
const result = await triggerCrawlNow(competitorId);
if (result.ok) {
  console.log(`Crawl job created: ${result.jobId}`);
}
```

### 2. Supabase Edge Functions

#### `trigger-crawl`
**File**: `supabase/functions/trigger-crawl/index.ts`

- **Trigger**: HTTP POST request
- **Input**: `{ crawlJobId: string }`
- **Process**:
  1. Fetches crawl job and competitor details
  2. Updates job status to "running" with timestamp
  3. Simulates crawl execution (ready for `crawlCompetitor` integration)
  4. Updates job status to "completed" or "failed"
  5. Updates competitor's `last_crawled_at`
- **Error Handling**: Catches errors, marks job as failed with error message

#### `scheduled-crawls`
**File**: `supabase/functions/scheduled-crawls/index.ts`

- **Trigger**: Cron schedule (configurable via Supabase dashboard)
- **Recommended Schedule**: `0 0 * * *` (daily at UTC 00:00)
- **Process**:
  1. Finds competitors needing crawls based on `crawl_frequency` and `last_crawled_at`
  2. Checks idempotency (skips if job created within 30 minutes)
  3. Creates `crawl_job` rows for each competitor
  4. Ready to invoke `trigger-crawl` function for each job
- **Idempotency**: 30-minute deduplication window

### 3. UI Components

#### Competitors Page
**File**: `app/dashboard/competitors/competitors-table.tsx`

- Added "Crawl" button in the actions column
- Button shows "Crawling..." while request is in flight
- Calls `triggerCrawlNow` on click
- Shows alert with job ID on success or error message on failure

#### Changes Page
**File**: `app/dashboard/changes/crawl-button.tsx`

- Added "Crawl now" button with competitor dropdown selector
- Allows selecting which competitor to crawl from the Changes page
- Shows loading state during crawl trigger
- Resets selection after successful trigger

### 4. Database Utilities

#### `lib/crawl-jobs/updateJobStatus.ts`
- Updates crawl job status and timestamps
- Used by Edge Functions for job lifecycle management

#### `lib/crawl-jobs/getCrawlJobStatus.ts`
- Fetches current job status
- Checks for recent running/pending jobs

#### `lib/crawl-jobs/handleCrawlError.ts`
- Standardized error handling with retry logic
- Categorizes errors (network, timeout, storage, etc.)
- Provides user-friendly error messages

### 5. Database Schema Updates

**File**: `supabase/migrations/20260210004000_add_crawl_job_fields.sql`

New fields:
- `crawl_jobs.started_at`: When job execution began
- `crawl_jobs.completed_at`: When job completed
- `crawl_jobs.error_message`: Error details if failed
- `competitors.last_scheduled_crawl_at`: Timestamp of last scheduled job creation

New indexes for efficient queries:
- `idx_competitors_scheduling`: For finding competitors needing crawls
- `idx_crawl_jobs_competitor_status`: For checking recent job history

## Idempotency Strategy

### Manual Crawls
- **Deduplication window**: 5 minutes
- **Check**: Before creating new job, verify no pending/running job exists from last 5 min
- **Benefit**: Prevents accidental double-clicking the button

### Scheduled Crawls
- **Deduplication window**: 30 minutes
- **Check**: Before creating scheduled job, verify no job created in last 30 min
- **Benefit**: Prevents multiple scheduler invocations from creating duplicates

## Error Handling

Errors are categorized with retry recommendations:

| Error | Retryable | Action |
|-------|-----------|--------|
| Network Error | Yes | Show "retry" message in UI |
| Timeout | Yes | Show "try again" message |
| Invalid URL | No | Show "fix URL" message |
| Storage Error | Yes | Show "retry" message |
| Database Error | No | Show "contact support" |
| Unknown | No | Show generic error |

## Job Status Lifecycle

```
created
  ↓
pending (waiting for processing)
  ↓
running (crawl in progress)
  ↓
completed (success) OR failed (error)
```

## Configuration

### Scheduled Crawl Frequency
Edit via Supabase dashboard → Edge Functions → `scheduled-crawls` → Cron schedule

**Examples**:
- `0 0 * * *` - Daily at midnight UTC
- `0 0 * * 1` - Weekly on Mondays at midnight UTC
- `0 * * * *` - Hourly

### Competitor Crawl Frequency
Set per competitor: "daily" or "weekly"
- Used to determine if competitor needs crawling
- Compared against `last_crawled_at`

## Integration with Crawler

Currently, the `trigger-crawl` function simulates crawl execution. To integrate the actual crawler:

**In `supabase/functions/trigger-crawl/index.ts`:**

```typescript
// Replace simulation with actual crawl
import { crawlCompetitor } from "@/crawler/crawlCompetitor";

// Inside triggerCrawl function:
const result = await crawlCompetitor({
  competitorId: job.competitor_id,
  competitorUrl: job.competitors.url,
});

// Then update snapshots and changes based on result
```

## Testing

### Manual Test
1. Go to Competitors page
2. Click "Crawl" button for a competitor
3. Check Supabase dashboard: `crawl_jobs` table should show new job
4. Verify status updates: pending → running → completed

### Scheduled Test
1. Go to Supabase dashboard → Edge Functions → `scheduled-crawls`
2. Click "Invoke" to manually trigger
3. Check `crawl_jobs` table for new jobs created

### Idempotency Test
1. Rapidly click "Crawl" button multiple times
2. Check `crawl_jobs` table: should only have 1-2 jobs (dedup within 5 min)

## Monitoring

### Job Status API
Get job details:
```typescript
const job = await getCrawlJobStatus(jobId);
console.log(job.status); // 'pending' | 'running' | 'completed' | 'failed'
console.log(job.error_message); // Error details if failed
```

### Recent Jobs Check
```typescript
const hasRecent = await hasRecentCrawlJob(competitorId, 5); // within 5 minutes
```

## Deployment Notes

1. **Supabase Setup**:
   - Run migration: `20260210004000_add_crawl_job_fields.sql`
   - Deploy Edge Functions via Supabase CLI or dashboard

2. **Environment**:
   - Ensure `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are available in Edge Function runtime

3. **Next.js Build**:
   - Edge Functions are excluded from Next.js build (see `next.config.mjs`)
   - Prevents TypeScript errors for Deno imports
