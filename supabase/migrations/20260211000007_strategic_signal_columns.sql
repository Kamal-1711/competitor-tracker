-- Add strategic signal metadata to changes for the Strategic Signal Stream.

ALTER TABLE public.changes
ADD COLUMN IF NOT EXISTS impact_level text;

ALTER TABLE public.changes
ADD COLUMN IF NOT EXISTS strategic_interpretation text;

ALTER TABLE public.changes
ADD COLUMN IF NOT EXISTS suggested_monitoring_action text;

-- Constrain impact_level to the three supported executive-facing buckets.
ALTER TABLE public.changes
DROP CONSTRAINT IF EXISTS changes_impact_level_check;

ALTER TABLE public.changes
ADD CONSTRAINT changes_impact_level_check CHECK (
  impact_level IN ('Minor', 'Moderate', 'Strategic')
);

