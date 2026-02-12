create table if not exists public.pricing_snapshots (
  id uuid primary key default gen_random_uuid(),
  competitor_id uuid not null references public.competitors(id) on delete cascade,
  captured_at timestamptz not null default now(),
  total_plans integer not null default 0,
  entry_price numeric null,
  billing_model text not null default 'unknown',
  free_trial boolean not null default false,
  enterprise_present boolean not null default false,
  pricing_structure_json jsonb not null default '{}'::jsonb,
  pricing_summary_hash text not null,
  capture_status text not null default 'structured',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint pricing_snapshots_billing_model_check
    check (billing_model in ('subscription', 'usage', 'hybrid', 'unknown')),
  constraint pricing_snapshots_capture_status_check
    check (capture_status in ('structured', 'visual-only'))
);

create index if not exists pricing_snapshots_competitor_captured_idx
  on public.pricing_snapshots (competitor_id, captured_at desc);

create table if not exists public.pricing_plan_details (
  id uuid primary key default gen_random_uuid(),
  snapshot_id uuid not null references public.pricing_snapshots(id) on delete cascade,
  plan_name text not null,
  price_value numeric null,
  billing_interval text null,
  feature_count integer not null default 0,
  cta_text text null,
  highlight_flag boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists pricing_plan_details_snapshot_idx
  on public.pricing_plan_details (snapshot_id);

create table if not exists public.pricing_changes (
  id uuid primary key default gen_random_uuid(),
  snapshot_id uuid not null references public.pricing_snapshots(id) on delete cascade,
  change_type text not null,
  impact_level text not null,
  description text not null,
  created_at timestamptz not null default now(),
  constraint pricing_changes_impact_level_check
    check (impact_level in ('low', 'moderate', 'high'))
);

create unique index if not exists pricing_changes_unique_event_idx
  on public.pricing_changes (snapshot_id, change_type, description);

create index if not exists pricing_changes_snapshot_idx
  on public.pricing_changes (snapshot_id, created_at desc);

