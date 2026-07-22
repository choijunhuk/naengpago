create table public.shopping_list_items (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  master_id uuid references public.ingredient_master(id),
  name text not null check (char_length(name) between 1 and 80),
  quantity numeric check (quantity is null or quantity > 0),
  unit text,
  category public.ingredient_category not null default 'OTHER',
  status public.shopping_status not null default 'PENDING',
  source public.shopping_source not null,
  source_recipe_id uuid references public.recipes(id) on delete set null,
  added_by uuid not null references public.profiles(id),
  purchased_by uuid references public.profiles(id),
  purchased_at timestamptz,
  moved_to_inventory boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint shopping_purchase_state check (
    (status = 'PENDING' and purchased_at is null and purchased_by is null)
    or status = 'PURCHASED'
  )
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  type public.notification_type not null,
  payload jsonb not null default '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table public.user_preferences (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  liked_tags text[] not null default '{}',
  disliked_master_ids uuid[] not null default '{}',
  allergy_master_ids uuid[] not null default '{}',
  owned_tools text[] not null default '{}',
  skill_level public.skill_level not null default 'BEGINNER',
  expiry_alert_days integer not null default 3 check (expiry_alert_days between 0 and 30),
  notification_settings jsonb not null default '{}'::jsonb,
  dark_mode public.dark_mode not null default 'SYSTEM',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

