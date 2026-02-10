-- Add deterministic chronological versioning for snapshots per page
ALTER TABLE public.snapshots
ADD COLUMN IF NOT EXISTS version_number integer;

WITH numbered AS (
  SELECT
    id,
    ROW_NUMBER() OVER (PARTITION BY page_id ORDER BY created_at ASC, id ASC) AS seq
  FROM public.snapshots
)
UPDATE public.snapshots s
SET version_number = n.seq
FROM numbered n
WHERE s.id = n.id
  AND s.version_number IS NULL;

ALTER TABLE public.snapshots
ALTER COLUMN version_number SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_snapshots_page_version_unique
  ON public.snapshots(page_id, version_number);

CREATE INDEX IF NOT EXISTS idx_snapshots_page_created_desc
  ON public.snapshots(page_id, created_at DESC);

