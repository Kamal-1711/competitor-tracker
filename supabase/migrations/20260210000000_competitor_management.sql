-- Ensure users table exists (profiles from auth)
CREATE TABLE IF NOT EXISTS public.users (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Workspaces
CREATE TABLE IF NOT EXISTS public.workspaces (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  owner_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Competitors (with last_crawled_at and crawl_frequency for management page)
CREATE TABLE IF NOT EXISTS public.competitors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name text,
  url text NOT NULL,
  last_crawled_at timestamptz,
  crawl_frequency text NOT NULL DEFAULT 'weekly' CHECK (crawl_frequency IN ('daily', 'weekly')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_competitors_workspace_id ON public.competitors(workspace_id);

-- If you already have a competitors table without these columns, run instead:
-- ALTER TABLE public.competitors ADD COLUMN IF NOT EXISTS last_crawled_at timestamptz;
-- ALTER TABLE public.competitors ADD COLUMN IF NOT EXISTS crawl_frequency text NOT NULL DEFAULT 'weekly';
-- ALTER TABLE public.competitors ADD COLUMN IF NOT EXISTS workspace_id uuid REFERENCES public.workspaces(id);
-- (Then backfill workspace_id as needed.)
