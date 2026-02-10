-- Add category column to changes table for rule-based classification

ALTER TABLE public.changes
ADD COLUMN IF NOT EXISTS category text;

-- Add CHECK constraint for valid categories
ALTER TABLE public.changes
DROP CONSTRAINT IF EXISTS changes_category_check;

ALTER TABLE public.changes
ADD CONSTRAINT changes_category_check CHECK (
  category IN (
    'Positioning & Messaging',
    'Pricing & Offers',
    'Product / Services',
    'Trust & Credibility',
    'Navigation / Structure'
  )
);

-- Set default for existing rows (if any)
UPDATE public.changes
SET category = 'Navigation / Structure'
WHERE category IS NULL;

-- Make category NOT NULL after setting defaults
ALTER TABLE public.changes
ALTER COLUMN category SET NOT NULL;

-- Add index for filtering by category
CREATE INDEX IF NOT EXISTS idx_changes_category ON public.changes(category);
