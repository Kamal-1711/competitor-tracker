-- =============================================================================
-- Competitor Tracker — Final Supabase/PostgreSQL Schema
-- Based on DOMAIN_MODEL.md. UUID PKs, FKs, indexes for change feed, soft deletes.
-- =============================================================================

-- Extensions (if not already enabled)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- -----------------------------------------------------------------------------
-- Users (profiles synced from auth)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.users (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- -----------------------------------------------------------------------------
-- Workspaces (tenant container; soft delete)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.workspaces (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  owner_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_workspaces_owner_id ON public.workspaces(owner_id);
CREATE INDEX IF NOT EXISTS idx_workspaces_deleted_at ON public.workspaces(deleted_at) WHERE deleted_at IS NULL;

-- -----------------------------------------------------------------------------
-- Competitors (tracked site; soft delete)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.competitors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name text,
  url text NOT NULL,
  last_crawled_at timestamptz,
  last_scheduled_crawl_at timestamptz,
  crawl_frequency text NOT NULL DEFAULT 'weekly'
    CHECK (crawl_frequency IN ('daily', 'weekly')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_competitors_workspace_id ON public.competitors(workspace_id);
CREATE INDEX IF NOT EXISTS idx_competitors_deleted_at ON public.competitors(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_competitors_scheduling
  ON public.competitors(workspace_id, crawl_frequency, last_crawled_at)
  WHERE deleted_at IS NULL;

-- -----------------------------------------------------------------------------
-- Page type enum
-- -----------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'page_type') THEN
    CREATE TYPE public.page_type AS ENUM ('homepage', 'pricing', 'product');
  END IF;
END
$$;

-- -----------------------------------------------------------------------------
-- Pages (canonical URL per competitor; soft delete)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.pages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  competitor_id uuid NOT NULL REFERENCES public.competitors(id) ON DELETE CASCADE,
  url text NOT NULL,
  page_type public.page_type NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  UNIQUE (competitor_id, url)
);

CREATE INDEX IF NOT EXISTS idx_pages_competitor_id ON public.pages(competitor_id);
CREATE INDEX IF NOT EXISTS idx_pages_page_type ON public.pages(page_type);
CREATE INDEX IF NOT EXISTS idx_pages_deleted_at ON public.pages(deleted_at) WHERE deleted_at IS NULL;

-- -----------------------------------------------------------------------------
-- Crawl jobs (one run per competitor; no soft delete)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.crawl_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  competitor_id uuid NOT NULL REFERENCES public.competitors(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'running', 'completed', 'failed')),
  started_at timestamptz,
  completed_at timestamptz,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_crawl_jobs_competitor_id ON public.crawl_jobs(competitor_id);
CREATE INDEX IF NOT EXISTS idx_crawl_jobs_competitor_status
  ON public.crawl_jobs(competitor_id, status, created_at);
CREATE INDEX IF NOT EXISTS idx_crawl_jobs_created_at ON public.crawl_jobs(created_at DESC);

-- -----------------------------------------------------------------------------
-- Snapshots (HTML + screenshot per page per crawl; no soft delete)
-- -----------------------------------------------------------------------------
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
CREATE INDEX IF NOT EXISTS idx_snapshots_created_at ON public.snapshots(created_at DESC);

-- -----------------------------------------------------------------------------
-- Change categories (reference / constraint values)
-- -----------------------------------------------------------------------------
-- Categories: Positioning & Messaging, Pricing & Offers, Product / Services,
--             Trust & Credibility, Navigation / Structure

-- -----------------------------------------------------------------------------
-- Changes (detected diff between two snapshots; no soft delete)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.changes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  competitor_id uuid NOT NULL REFERENCES public.competitors(id) ON DELETE CASCADE,
  page_id uuid NOT NULL REFERENCES public.pages(id) ON DELETE CASCADE,
  before_snapshot_id uuid NOT NULL REFERENCES public.snapshots(id) ON DELETE CASCADE,
  after_snapshot_id uuid NOT NULL REFERENCES public.snapshots(id) ON DELETE CASCADE,
  page_url text NOT NULL,
  page_type public.page_type NOT NULL,
  change_type text NOT NULL
    CHECK (change_type IN (
      'text_change',
      'element_added',
      'element_removed',
      'cta_text_change',
      'nav_change'
    )),
  category text NOT NULL
    CHECK (category IN (
      'Positioning & Messaging',
      'Pricing & Offers',
      'Product / Services',
      'Trust & Credibility',
      'Navigation / Structure'
    )),
  summary text NOT NULL,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Change feed indexes: filter by competitor, category, date; order by time
CREATE INDEX IF NOT EXISTS idx_changes_competitor_id ON public.changes(competitor_id);
CREATE INDEX IF NOT EXISTS idx_changes_page_id ON public.changes(page_id);
CREATE INDEX IF NOT EXISTS idx_changes_category ON public.changes(category);
CREATE INDEX IF NOT EXISTS idx_changes_created_at ON public.changes(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_changes_feed
  ON public.changes(competitor_id, category, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_changes_before_snapshot_id ON public.changes(before_snapshot_id);
CREATE INDEX IF NOT EXISTS idx_changes_after_snapshot_id ON public.changes(after_snapshot_id);

-- -----------------------------------------------------------------------------
-- Alerts (user-facing notification for a change; soft delete / read state)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  change_id uuid NOT NULL REFERENCES public.changes(id) ON DELETE CASCADE,
  competitor_id uuid NOT NULL REFERENCES public.competitors(id) ON DELETE CASCADE,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_alerts_workspace_id ON public.alerts(workspace_id);
CREATE INDEX IF NOT EXISTS idx_alerts_change_id ON public.alerts(change_id);
CREATE INDEX IF NOT EXISTS idx_alerts_unread
  ON public.alerts(workspace_id, created_at DESC)
  WHERE read_at IS NULL AND deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_alerts_deleted_at ON public.alerts(deleted_at) WHERE deleted_at IS NULL;
