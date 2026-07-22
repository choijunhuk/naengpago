create table public.recipes (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  image_url text,
  cook_time_min integer not null check (cook_time_min > 0),
  difficulty public.recipe_difficulty not null,
  servings integer not null check (servings > 0),
  calories_est integer check (calories_est is null or calories_est >= 0),
  steps jsonb not null check (jsonb_typeof(steps) = 'array'),
  tags text[] not null default '{}',
  required_tools text[] not null default '{}',
  source text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.recipe_ingredients (
  id uuid primary key default gen_random_uuid(),
  recipe_id uuid not null references public.recipes(id) on delete cascade,
  master_id uuid not null references public.ingredient_master(id),
  name_text text not null,
  quantity numeric check (quantity is null or quantity > 0),
  unit text,
  is_optional boolean not null default false,
  substitution_group text,
  created_at timestamptz not null default now()
);

create table public.cooking_history (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  recipe_id uuid references public.recipes(id),
  cooked_by uuid not null references public.profiles(id),
  deduction_mode public.deduction_mode not null,
  note text,
  cooked_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

alter table public.inventory_history
  add constraint inventory_history_cooking_history_fk
  foreign key (cooking_history_id) references public.cooking_history(id) on delete set null;

create table public.favorite_recipes (
  user_id uuid not null references public.profiles(id) on delete cascade,
  recipe_id uuid not null references public.recipes(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, recipe_id)
);

