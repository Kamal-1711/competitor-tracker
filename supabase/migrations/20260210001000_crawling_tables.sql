-- Crawling persistence tables for competitor tracking
-- Depends on: public.competitors from 20260210000000_competitor_management.sql

-- Crawl jobs: one execution of crawling a competitor
CREATE TABLE IF NOT EXISTS public.crawl_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  competitor_id uuid NOT NULL REFERENCES public.competitors(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'completed', 'failed')),
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_crawl_jobs_competitor_id ON public.crawl_jobs(competitor_id);

-- Page types we detect/crawl
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'page_type') THEN
    CREATE TYPE public.page_type AS ENUM ('homepage', 'pricing', 'product');
  END IF;
END
$$;

-- Pages: canonical URLs per competitor
CREATE TABLE IF NOT EXISTS public.pages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  competitor_id uuid NOT NULL REFERENCES public.competitors(id) ON DELETE CASCADE,
  url text NOT NULL,
  page_type public.page_type NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (competitor_id, url)
);

CREATE INDEX IF NOT EXISTS idx_pages_competitor_id ON public.pages(competitor_id);
CREATE INDEX IF NOT EXISTS idx_pages_page_type ON public.pages(page_type);

-- Snapshots: HTML + screenshot per crawl execution, per page
CREATE TABLE IF NOT EXISTS public.snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  competitor_id uuid NOT NULL REFERENCES public.competitors(id) ON DELETE CASCADE,
  page_id uuid NOT NULL REFERENCES public.pages(id) ON DELETE CASCADE,
  crawl_job_id uuid NOT NULL REFERENCES public.crawl_jobs(id) ON DELETE CASCADE,
  url text NOT NULL,
  page_type public.page_type NOT NULL,
  html text NOT NULL,
  screenshot_path text NOT NULL,
  screenshot_url text,
  http_status integer,
  title text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_snapshots_competitor_id ON public.snapshots(competitor_id);
CREATE INDEX IF NOT EXISTS idx_snapshots_page_id ON public.snapshots(page_id);
CREATE INDEX IF NOT EXISTS idx_snapshots_crawl_job_id ON public.snapshots(crawl_job_id);

