-- Add optional logo_url column to competitors for displaying brand mark in UI.

ALTER TABLE public.competitors
ADD COLUMN IF NOT EXISTS logo_url text;

