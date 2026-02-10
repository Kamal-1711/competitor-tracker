-- Add PM-focused structured snapshot fields.
ALTER TABLE public.snapshots
  ADD COLUMN IF NOT EXISTS primary_headline text,
  ADD COLUMN IF NOT EXISTS primary_cta_text text,
  ADD COLUMN IF NOT EXISTS nav_items jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS html_hash text,
  ADD COLUMN IF NOT EXISTS captured_at timestamptz NOT NULL DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_snapshots_html_hash ON public.snapshots(html_hash);
CREATE INDEX IF NOT EXISTS idx_snapshots_captured_at ON public.snapshots(captured_at DESC);
