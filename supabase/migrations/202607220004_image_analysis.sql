create table public.ingredient_images (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  storage_path text not null unique,
  width integer not null check (width > 0),
  height integer not null check (height > 0),
  bytes bigint not null check (bytes > 0 and bytes <= 15728640),
  uploaded_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table public.image_analyses (
  id uuid primary key default gen_random_uuid(),
  image_id uuid not null references public.ingredient_images(id) on delete cascade,
  status public.analysis_status not null default 'PENDING',
  ai_mode public.ai_mode not null,
  model text,
  analysis_version text not null,
  raw_response jsonb,
  error_message text,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.image_analysis_candidates (
  id uuid primary key default gen_random_uuid(),
  analysis_id uuid not null references public.image_analyses(id) on delete cascade,
  raw_name text not null,
  matched_master_id uuid references public.ingredient_master(id),
  display_name text not null,
  category public.ingredient_category not null,
  quantity_type public.quantity_type not null,
  estimated_count numeric check (estimated_count is null or estimated_count > 0),
  unit text,
  remaining_level public.remaining_level,
  confidence numeric not null check (confidence between 0 and 1),
  bounding_box jsonb not null,
  package_info jsonb not null default '{}'::jsonb,
  duplicate_of_item_id uuid references public.inventory_items(id),
  user_action public.candidate_user_action not null default 'PENDING',
  final_payload jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint candidate_quantity_shape check (
    (quantity_type = 'COUNTABLE' and remaining_level is null)
    or (quantity_type = 'LEVEL' and estimated_count is null)
    or (quantity_type = 'MEASURABLE' and estimated_count is null and remaining_level is null)
  )
);

