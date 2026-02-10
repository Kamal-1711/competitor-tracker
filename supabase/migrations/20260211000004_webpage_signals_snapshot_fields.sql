-- Store structured DOM-derived snapshot elements and allow webpage-derived signals insights.

-- Snapshots: structured webpage elements (pure DOM extraction)
ALTER TABLE public.snapshots
  ADD COLUMN IF NOT EXISTS page_title text,
  ADD COLUMN IF NOT EXISTS h1_text text,
  ADD COLUMN IF NOT EXISTS h2_headings text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS secondary_cta_text text,
  ADD COLUMN IF NOT EXISTS nav_labels text[] NOT NULL DEFAULT '{}';

-- Insights: allow deterministic webpage-derived signals
ALTER TABLE public.insights
DROP CONSTRAINT IF EXISTS insights_insight_type_check;

ALTER TABLE public.insights
ADD CONSTRAINT insights_insight_type_check
CHECK (
  insight_type IN (
    'messaging_shift',
    'conversion_strategy',
    'pricing_strategy',
    'product_focus',
    'credibility_proof',
    'strategic_priority',
    'observational',
    'webpage_signal'
  )
);

