-- Rename page_type enum values to match updated taxonomy naming.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_enum
    WHERE enumtypid = 'public.page_type'::regtype
      AND enumlabel = 'cta_or_conversion_pages'
  ) THEN
    ALTER TYPE public.page_type RENAME VALUE 'cta_or_conversion_pages' TO 'cta_elements';
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_enum
    WHERE enumtypid = 'public.page_type'::regtype
      AND enumlabel = 'navigation_and_structure'
  ) THEN
    ALTER TYPE public.page_type RENAME VALUE 'navigation_and_structure' TO 'navigation';
  END IF;
END $$;

-- Keep legacy enum values that cannot be removed safely from PostgreSQL enums.

-- Allow observational insights in the insights table.
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
    'observational'
  )
);
