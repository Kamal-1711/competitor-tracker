CREATE TABLE IF NOT EXISTS public.insights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  competitor_id uuid NOT NULL REFERENCES public.competitors(id) ON DELETE CASCADE,
  page_type public.page_type NOT NULL,
  insight_type text NOT NULL CHECK (
    insight_type IN (
      'messaging_shift',
      'conversion_strategy',
      'pricing_strategy',
      'product_focus',
      'credibility_proof',
      'strategic_priority'
    )
  ),
  insight_text text NOT NULL,
  confidence text NOT NULL CHECK (confidence IN ('High', 'Medium')),
  related_change_ids uuid[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_insights_competitor_id ON public.insights(competitor_id);
CREATE INDEX IF NOT EXISTS idx_insights_created_at ON public.insights(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_insights_page_type ON public.insights(page_type);
CREATE INDEX IF NOT EXISTS idx_insights_competitor_time ON public.insights(competitor_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_insights_competitor_page_time
  ON public.insights(competitor_id, page_type, created_at DESC);
