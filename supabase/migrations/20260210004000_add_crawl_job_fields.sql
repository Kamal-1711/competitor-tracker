-- Add fields to crawl_jobs table for better job tracking and error handling
ALTER TABLE public.crawl_jobs
ADD COLUMN IF NOT EXISTS started_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS completed_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS error_message text;

-- Add last_scheduled_crawl_at to competitors for tracking scheduled job creation
ALTER TABLE public.competitors
ADD COLUMN IF NOT EXISTS last_scheduled_crawl_at timestamp with time zone;

-- Create index on (workspace_id, crawl_frequency, last_crawled_at) for efficient scheduled crawl queries
CREATE INDEX IF NOT EXISTS idx_competitors_scheduling
  ON public.competitors(workspace_id, crawl_frequency, last_crawled_at);

-- Create index on crawl_jobs for checking recent jobs by competitor
CREATE INDEX IF NOT EXISTS idx_crawl_jobs_competitor_status
  ON public.crawl_jobs(competitor_id, status, created_at);
