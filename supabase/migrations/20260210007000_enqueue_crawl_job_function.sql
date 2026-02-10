-- Enqueue crawl jobs safely (prevents duplicate pending/running jobs per competitor)

ALTER TABLE public.crawl_jobs
ADD COLUMN IF NOT EXISTS source text;

CREATE OR REPLACE FUNCTION public.enqueue_crawl_job(
  p_competitor_id uuid,
  p_source text DEFAULT 'manual'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_existing uuid;
  v_new uuid;
  v_lock_key bigint;
BEGIN
  -- Use a stable advisory lock per competitor to avoid races
  v_lock_key := hashtextextended(p_competitor_id::text, 0);
  IF NOT pg_try_advisory_lock(v_lock_key) THEN
    -- Another enqueue is in progress; return existing active job if present
    SELECT id
      INTO v_existing
    FROM public.crawl_jobs
    WHERE competitor_id = p_competitor_id
      AND status IN ('pending', 'running')
    ORDER BY created_at DESC
    LIMIT 1;

    RETURN v_existing;
  END IF;

  -- If there's an active job, return it
  SELECT id
    INTO v_existing
  FROM public.crawl_jobs
  WHERE competitor_id = p_competitor_id
    AND status IN ('pending', 'running')
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_existing IS NOT NULL THEN
    PERFORM pg_advisory_unlock(v_lock_key);
    RETURN v_existing;
  END IF;

  -- Otherwise, create a new queued job
  INSERT INTO public.crawl_jobs (
    competitor_id,
    status,
    started_at,
    completed_at,
    error_message,
    created_at,
    source
  )
  VALUES (
    p_competitor_id,
    'pending',
    NULL,
    NULL,
    NULL,
    now(),
    p_source
  )
  RETURNING id INTO v_new;

  PERFORM pg_advisory_unlock(v_lock_key);
  RETURN v_new;
EXCEPTION
  WHEN OTHERS THEN
    BEGIN
      PERFORM pg_advisory_unlock(v_lock_key);
    EXCEPTION
      WHEN OTHERS THEN
        -- ignore unlock errors
        NULL;
    END;
    RAISE;
END;
$$;

