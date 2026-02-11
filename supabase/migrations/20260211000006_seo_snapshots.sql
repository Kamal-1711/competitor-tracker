create table if not exists public.seo_snapshots (
  id uuid primary key default gen_random_uuid(),
  competitor_id uuid not null references public.competitors(id) on delete cascade,
  seo_dimensions jsonb not null,
  topic_clusters jsonb not null,
  captured_at timestamptz not null default now()
);

create index if not exists seo_snapshots_competitor_captured_idx
  on public.seo_snapshots (competitor_id, captured_at desc);

