create table public.ingredient_master (
  id uuid primary key default gen_random_uuid(),
  standard_name_ko text not null unique,
  standard_name_en text,
  category public.ingredient_category not null,
  parent_id uuid references public.ingredient_master(id),
  quantity_type public.quantity_type not null,
  default_unit text,
  default_shelf_life_days_fridge integer check (default_shelf_life_days_fridge >= 0),
  default_shelf_life_days_freezer integer check (default_shelf_life_days_freezer >= 0),
  default_shelf_life_days_pantry integer check (default_shelf_life_days_pantry >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.ingredient_aliases (
  id uuid primary key default gen_random_uuid(),
  master_id uuid not null references public.ingredient_master(id) on delete cascade,
  alias text not null,
  normalized_alias text generated always as (lower(regexp_replace(alias, '[^[:alnum:]가-힣]+', '', 'g'))) stored,
  lang text not null default 'ko',
  source public.alias_source not null default 'SYSTEM',
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (alias, lang)
);

create table public.ingredient_substitutions (
  id uuid primary key default gen_random_uuid(),
  from_master_id uuid not null references public.ingredient_master(id) on delete cascade,
  to_master_id uuid not null references public.ingredient_master(id) on delete cascade,
  bidirectional boolean not null default false,
  note text,
  created_at timestamptz not null default now(),
  check (from_master_id <> to_master_id),
  unique (from_master_id, to_master_id)
);

create table public.inventory_items (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  storage_location_id uuid not null references public.storage_locations(id),
  master_id uuid references public.ingredient_master(id),
  display_name text not null check (char_length(display_name) between 1 and 80),
  category public.ingredient_category not null default 'OTHER',
  quantity_type public.quantity_type not null,
  quantity numeric check (quantity is null or quantity >= 0),
  unit text,
  remaining_level public.remaining_level,
  remaining_percent integer check (remaining_percent is null or remaining_percent between 0 and 100),
  purchase_date date,
  opened_date date,
  expiration_date date,
  expiration_type public.expiration_type not null default 'UNKNOWN',
  registered_via public.registered_via not null,
  image_path text,
  memo text,
  ai_confidence numeric check (ai_confidence is null or ai_confidence between 0 and 1),
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint inventory_quantity_shape check (
    (quantity_type = 'LEVEL' and quantity is null)
    or (quantity_type = 'COUNTABLE' and remaining_level is null)
    or (quantity_type = 'MEASURABLE' and remaining_level is null)
  )
);

create table public.inventory_history (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.inventory_items(id) on delete cascade,
  change_type public.inventory_change_type not null,
  quantity_before numeric,
  quantity_after numeric,
  level_before public.remaining_level,
  level_after public.remaining_level,
  reason text,
  cooking_history_id uuid,
  changed_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now()
);

