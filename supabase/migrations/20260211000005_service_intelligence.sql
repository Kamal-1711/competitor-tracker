-- Service / Solutions intelligence schema support.

-- Extend page_type enum with `services` if missing.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_enum
    WHERE enumtypid = 'public.page_type'::regtype
      AND enumlabel = 'services'
  ) THEN
    ALTER TYPE public.page_type ADD VALUE 'services';
  END IF;
END $$;

-- Snapshot-level structured service extraction fields.
ALTER TABLE public.snapshots
  ADD COLUMN IF NOT EXISTS h3_headings text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS list_items text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS structured_content jsonb;

