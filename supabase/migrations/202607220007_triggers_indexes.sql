create or replace function private.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function private.remaining_level_rank(value public.remaining_level)
returns integer
language sql
immutable
security invoker
set search_path = ''
as $$
  select case value
    when 'FULL' then 5
    when 'HIGH' then 4
    when 'MEDIUM' then 3
    when 'LOW' then 2
    when 'ALMOST_EMPTY' then 1
    when 'EMPTY' then 0
    else null
  end;
$$;

create or replace function private.record_inventory_history()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid;
  inferred_change public.inventory_change_type;
begin
  actor_id := coalesce((select auth.uid()), new.created_by);

  if tg_op = 'INSERT' then
    insert into public.inventory_history (
      item_id, change_type, quantity_after, level_after, reason, changed_by
    ) values (
      new.id, 'CREATE', new.quantity, new.remaining_level, 'inventory created', actor_id
    );
    return new;
  end if;

  if old.quantity is not distinct from new.quantity
    and old.remaining_level is not distinct from new.remaining_level
    and old.deleted_at is not distinct from new.deleted_at then
    return new;
  end if;

  inferred_change := case
    when old.deleted_at is null and new.deleted_at is not null then 'DISCARD'
    when old.deleted_at is not null and new.deleted_at is null then 'RESTORE'
    when new.quantity is not null and old.quantity is not null and new.quantity < old.quantity then 'CONSUME'
    when private.remaining_level_rank(new.remaining_level) < private.remaining_level_rank(old.remaining_level) then 'CONSUME'
    else 'UPDATE'
  end;

  insert into public.inventory_history (
    item_id,
    change_type,
    quantity_before,
    quantity_after,
    level_before,
    level_after,
    reason,
    changed_by
  ) values (
    new.id,
    inferred_change,
    old.quantity,
    new.quantity,
    old.remaining_level,
    new.remaining_level,
    'inventory changed',
    actor_id
  );

  return new;
end;
$$;

revoke all on function private.record_inventory_history() from public;

create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, nickname)
  values (
    new.id,
    left(coalesce(nullif(trim(new.raw_user_meta_data ->> 'nickname'), ''), split_part(new.email, '@', 1), '사용자'), 30)
  );

  insert into public.user_preferences (user_id) values (new.id);
  return new;
end;
$$;

revoke all on function private.handle_new_user() from public;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_user();

create trigger inventory_items_history
  after insert or update of quantity, remaining_level, deleted_at on public.inventory_items
  for each row execute function private.record_inventory_history();

do $$
declare
  target_table text;
begin
  foreach target_table in array array[
    'profiles', 'households', 'storage_locations', 'ingredient_master',
    'ingredient_aliases', 'inventory_items', 'ingredient_images', 'image_analyses',
    'image_analysis_candidates', 'recipes', 'cooking_history', 'shopping_list_items',
    'notifications', 'user_preferences'
  ] loop
    execute format(
      'create trigger %I before update on public.%I for each row execute function private.set_updated_at()',
      target_table || '_set_updated_at',
      target_table
    );
  end loop;
end;
$$;

create index inventory_items_household_expiration_idx
  on public.inventory_items (household_id, deleted_at, expiration_date);
create index inventory_items_household_storage_idx
  on public.inventory_items (household_id, storage_location_id)
  where deleted_at is null;
create index ingredient_aliases_normalized_trgm_idx
  on public.ingredient_aliases using gin (normalized_alias extensions.gin_trgm_ops);
create index image_analysis_candidates_analysis_idx
  on public.image_analysis_candidates (analysis_id);
create index shopping_list_items_household_status_idx
  on public.shopping_list_items (household_id, status)
  where deleted_at is null;
create index notifications_user_read_idx
  on public.notifications (user_id, read_at)
  where deleted_at is null;
create index recipe_ingredients_recipe_idx
  on public.recipe_ingredients (recipe_id);
create index household_members_user_idx
  on public.household_members (user_id, household_id);

