-- Expand page_type enum for PM-focused crawling taxonomy.
-- This migration keeps existing data and maps old "product" type to "product_or_services".

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'page_type' AND n.nspname = 'public'
  ) THEN
    -- Skip if enum is already upgraded.
    IF EXISTS (
      SELECT 1
      FROM pg_enum e
      JOIN pg_type t ON t.oid = e.enumtypid
      JOIN pg_namespace n ON n.oid = t.typnamespace
      WHERE t.typname = 'page_type'
        AND n.nspname = 'public'
        AND e.enumlabel = 'product_or_services'
    ) THEN
      RETURN;
    END IF;

    ALTER TYPE public.page_type RENAME TO page_type_old;
  ELSE
    CREATE TYPE public.page_type_old AS ENUM ('homepage', 'pricing', 'product');
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'page_type' AND n.nspname = 'public'
  ) THEN
    CREATE TYPE public.page_type AS ENUM (
      'homepage',
      'pricing',
      'product_or_services',
      'use_cases_or_industries',
      'case_studies_or_customers',
      'cta_or_conversion_pages',
      'navigation_and_structure',
      'blog_content'
    );
  END IF;
END
$$;

ALTER TABLE public.pages
  ALTER COLUMN page_type TYPE public.page_type
  USING (
    CASE page_type::text
      WHEN 'product' THEN 'product_or_services'
      ELSE page_type::text
    END
  )::public.page_type;

ALTER TABLE public.snapshots
  ALTER COLUMN page_type TYPE public.page_type
  USING (
    CASE page_type::text
      WHEN 'product' THEN 'product_or_services'
      ELSE page_type::text
    END
  )::public.page_type;

ALTER TABLE public.changes
  ALTER COLUMN page_type TYPE public.page_type
  USING (
    CASE page_type::text
      WHEN 'product' THEN 'product_or_services'
      ELSE page_type::text
    END
  )::public.page_type;

DROP TYPE IF EXISTS public.page_type_old;
