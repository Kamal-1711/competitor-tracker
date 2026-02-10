-- Structured change detection results linked to snapshots
-- Depends on: competitors/pages/snapshots tables

CREATE TABLE IF NOT EXISTS public.changes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  competitor_id uuid NOT NULL REFERENCES public.competitors(id) ON DELETE CASCADE,
  page_id uuid NOT NULL REFERENCES public.pages(id) ON DELETE CASCADE,
  before_snapshot_id uuid NOT NULL REFERENCES public.snapshots(id) ON DELETE CASCADE,
  after_snapshot_id uuid NOT NULL REFERENCES public.snapshots(id) ON DELETE CASCADE,
  page_url text NOT NULL,
  page_type public.page_type NOT NULL,
  change_type text NOT NULL CHECK (
    change_type IN (
      'text_change',
      'element_added',
      'element_removed',
      'cta_text_change',
      'nav_change'
    )
  ),
  summary text NOT NULL,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_changes_competitor_id ON public.changes(competitor_id);
CREATE INDEX IF NOT EXISTS idx_changes_page_id ON public.changes(page_id);
CREATE INDEX IF NOT EXISTS idx_changes_before_snapshot_id ON public.changes(before_snapshot_id);
CREATE INDEX IF NOT EXISTS idx_changes_after_snapshot_id ON public.changes(after_snapshot_id);
CREATE INDEX IF NOT EXISTS idx_changes_change_type ON public.changes(change_type);

