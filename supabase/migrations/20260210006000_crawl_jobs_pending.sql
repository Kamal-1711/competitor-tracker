-- Allow queued crawl jobs and nullable started_at

-- 1) Make started_at nullable (queued jobs won't have it yet)
ALTER TABLE public.crawl_jobs
ALTER COLUMN started_at DROP NOT NULL;

-- 2) Expand status check to include 'pending'
ALTER TABLE public.crawl_jobs
DROP CONSTRAINT IF EXISTS crawl_jobs_status_check;

-- If the original constraint name differs (created inline), try to drop by pattern.
DO $$
DECLARE
  c record;
BEGIN
  FOR c IN
    SELECT conname
    FROM pg_constraint
    WHERE conrelid = 'public.crawl_jobs'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) ILIKE '%status%IN%'
  LOOP
    EXECUTE format('ALTER TABLE public.crawl_jobs DROP CONSTRAINT IF EXISTS %I', c.conname);
  END LOOP;
END
$$;

ALTER TABLE public.crawl_jobs
ADD CONSTRAINT crawl_jobs_status_check CHECK (status IN ('pending', 'running', 'completed', 'failed'));

-- 3) Backfill any rows that might have null status defensively
UPDATE public.crawl_jobs
SET status = 'completed'
WHERE status IS NULL;

