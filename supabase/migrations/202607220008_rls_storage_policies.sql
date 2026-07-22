create or replace function private.is_household_member(
  target_household_id uuid,
  target_user_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.household_members hm
    join public.households h on h.id = hm.household_id
    where hm.household_id = target_household_id
      and hm.user_id = target_user_id
      and h.deleted_at is null
  );
$$;

create or replace function private.is_household_owner(
  target_household_id uuid,
  target_user_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.household_members hm
    join public.households h on h.id = hm.household_id
    where hm.household_id = target_household_id
      and hm.user_id = target_user_id
      and hm.role = 'OWNER'
      and h.deleted_at is null
  );
$$;

create or replace function private.can_access_storage_object(
  object_name text,
  target_user_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.household_members hm
    join public.households h on h.id = hm.household_id
    where hm.household_id::text = (storage.foldername(object_name))[1]
      and hm.user_id = target_user_id
      and h.deleted_at is null
  );
$$;

revoke all on function private.is_household_member(uuid, uuid) from public;
revoke all on function private.is_household_owner(uuid, uuid) from public;
revoke all on function private.can_access_storage_object(text, uuid) from public;
grant execute on function private.is_household_member(uuid, uuid) to authenticated;
grant execute on function private.is_household_owner(uuid, uuid) to authenticated;
grant execute on function private.can_access_storage_object(text, uuid) to authenticated;

alter table public.profiles enable row level security;
alter table public.households enable row level security;
alter table public.household_members enable row level security;
alter table public.storage_locations enable row level security;
alter table public.ingredient_master enable row level security;
alter table public.ingredient_aliases enable row level security;
alter table public.ingredient_substitutions enable row level security;
alter table public.inventory_items enable row level security;
alter table public.inventory_history enable row level security;
alter table public.ingredient_images enable row level security;
alter table public.image_analyses enable row level security;
alter table public.image_analysis_candidates enable row level security;
alter table public.recipes enable row level security;
alter table public.recipe_ingredients enable row level security;
alter table public.favorite_recipes enable row level security;
alter table public.cooking_history enable row level security;
alter table public.shopping_list_items enable row level security;
alter table public.notifications enable row level security;
alter table public.user_preferences enable row level security;

create policy profiles_own_rows on public.profiles
  for all to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

create policy households_member_select on public.households
  for select to authenticated
  using (private.is_household_member(id, (select auth.uid())));
create policy households_owner_update on public.households
  for update to authenticated
  using (private.is_household_owner(id, (select auth.uid())))
  with check (private.is_household_owner(id, (select auth.uid())));
create policy households_owner_delete on public.households
  for delete to authenticated
  using (private.is_household_owner(id, (select auth.uid())));

create policy household_members_member_select on public.household_members
  for select to authenticated
  using (private.is_household_member(household_id, (select auth.uid())));
create policy household_members_owner_update on public.household_members
  for update to authenticated
  using (private.is_household_owner(household_id, (select auth.uid())))
  with check (private.is_household_owner(household_id, (select auth.uid())));
create policy household_members_owner_or_self_delete on public.household_members
  for delete to authenticated
  using (
    user_id = (select auth.uid())
    or private.is_household_owner(household_id, (select auth.uid()))
  );

create policy storage_locations_member_all on public.storage_locations
  for all to authenticated
  using (private.is_household_member(household_id, (select auth.uid())))
  with check (private.is_household_member(household_id, (select auth.uid())));

create policy ingredient_master_authenticated_read on public.ingredient_master
  for select to authenticated using (true);
create policy ingredient_aliases_authenticated_read on public.ingredient_aliases
  for select to authenticated using (true);
create policy ingredient_substitutions_authenticated_read on public.ingredient_substitutions
  for select to authenticated using (true);

create policy inventory_items_member_all on public.inventory_items
  for all to authenticated
  using (private.is_household_member(household_id, (select auth.uid())))
  with check (private.is_household_member(household_id, (select auth.uid())));
create policy inventory_history_member_read on public.inventory_history
  for select to authenticated
  using (
    exists (
      select 1 from public.inventory_items item
      where item.id = inventory_history.item_id
        and private.is_household_member(item.household_id, (select auth.uid()))
    )
  );

create policy ingredient_images_member_all on public.ingredient_images
  for all to authenticated
  using (private.is_household_member(household_id, (select auth.uid())))
  with check (private.is_household_member(household_id, (select auth.uid())));
create policy image_analyses_member_all on public.image_analyses
  for all to authenticated
  using (
    exists (
      select 1 from public.ingredient_images image
      where image.id = image_analyses.image_id
        and private.is_household_member(image.household_id, (select auth.uid()))
    )
  )
  with check (
    exists (
      select 1 from public.ingredient_images image
      where image.id = image_analyses.image_id
        and private.is_household_member(image.household_id, (select auth.uid()))
    )
  );
create policy image_candidates_member_all on public.image_analysis_candidates
  for all to authenticated
  using (
    exists (
      select 1
      from public.image_analyses analysis
      join public.ingredient_images image on image.id = analysis.image_id
      where analysis.id = image_analysis_candidates.analysis_id
        and private.is_household_member(image.household_id, (select auth.uid()))
    )
  )
  with check (
    exists (
      select 1
      from public.image_analyses analysis
      join public.ingredient_images image on image.id = analysis.image_id
      where analysis.id = image_analysis_candidates.analysis_id
        and private.is_household_member(image.household_id, (select auth.uid()))
    )
  );

create policy recipes_authenticated_read on public.recipes
  for select to authenticated using (is_active);
create policy recipe_ingredients_authenticated_read on public.recipe_ingredients
  for select to authenticated
  using (exists (select 1 from public.recipes recipe where recipe.id = recipe_ingredients.recipe_id and recipe.is_active));
create policy favorite_recipes_own_rows on public.favorite_recipes
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
create policy cooking_history_member_all on public.cooking_history
  for all to authenticated
  using (private.is_household_member(household_id, (select auth.uid())))
  with check (
    private.is_household_member(household_id, (select auth.uid()))
    and cooked_by = (select auth.uid())
  );
create policy shopping_list_items_member_all on public.shopping_list_items
  for all to authenticated
  using (private.is_household_member(household_id, (select auth.uid())))
  with check (private.is_household_member(household_id, (select auth.uid())));
create policy notifications_own_rows on public.notifications
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
create policy user_preferences_own_rows on public.user_preferences
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

grant usage on schema public to authenticated;
grant select, insert, update, delete on table
  public.profiles,
  public.households,
  public.household_members,
  public.storage_locations,
  public.inventory_items,
  public.ingredient_images,
  public.image_analyses,
  public.image_analysis_candidates,
  public.favorite_recipes,
  public.cooking_history,
  public.shopping_list_items,
  public.notifications,
  public.user_preferences
to authenticated;
grant select on table
  public.ingredient_master,
  public.ingredient_aliases,
  public.ingredient_substitutions,
  public.inventory_history,
  public.recipes,
  public.recipe_ingredients
to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'ingredient-images',
  'ingredient-images',
  false,
  15728640,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy ingredient_images_object_select on storage.objects
  for select to authenticated
  using (
    bucket_id = 'ingredient-images'
    and private.can_access_storage_object(name, (select auth.uid()))
  );
create policy ingredient_images_object_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'ingredient-images'
    and private.can_access_storage_object(name, (select auth.uid()))
  );
create policy ingredient_images_object_update on storage.objects
  for update to authenticated
  using (
    bucket_id = 'ingredient-images'
    and private.can_access_storage_object(name, (select auth.uid()))
  )
  with check (
    bucket_id = 'ingredient-images'
    and private.can_access_storage_object(name, (select auth.uid()))
  );
create policy ingredient_images_object_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'ingredient-images'
    and private.can_access_storage_object(name, (select auth.uid()))
  );

create or replace function public.create_household_with_defaults(household_name text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
  created_household_id uuid;
begin
  if actor_id is null then
    raise exception 'AUTH_REQUIRED' using errcode = '42501';
  end if;
  if nullif(trim(household_name), '') is null then
    raise exception 'HOUSEHOLD_NAME_REQUIRED' using errcode = '22023';
  end if;

  insert into public.households (name, created_by)
  values (left(trim(household_name), 50), actor_id)
  returning id into created_household_id;

  insert into public.household_members (household_id, user_id, role)
  values (created_household_id, actor_id, 'OWNER');

  insert into public.storage_locations (household_id, name, type, icon, sort_order)
  values
    (created_household_id, '냉장실', 'FRIDGE', 'refrigerator', 0),
    (created_household_id, '냉동실', 'FREEZER', 'snowflake', 1),
    (created_household_id, '김치냉장고', 'KIMCHI', 'container', 2),
    (created_household_id, '수납장', 'PANTRY', 'archive', 3);

  return created_household_id;
end;
$$;

create or replace function public.join_household(target_invite_code text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
  target_household_id uuid;
begin
  if actor_id is null then
    raise exception 'AUTH_REQUIRED' using errcode = '42501';
  end if;

  select id into target_household_id
  from public.households
  where invite_code = upper(trim(target_invite_code))
    and deleted_at is null;

  if target_household_id is null then
    raise exception 'INVITE_CODE_INVALID' using errcode = '22023';
  end if;

  insert into public.household_members (household_id, user_id, role)
  values (target_household_id, actor_id, 'MEMBER')
  on conflict (household_id, user_id) do nothing;

  return target_household_id;
end;
$$;

create or replace function public.move_shopping_item_to_inventory(
  shopping_item_id uuid,
  target_storage_location_id uuid,
  target_expiration_date date default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
  shopping_item public.shopping_list_items%rowtype;
  target_quantity_type public.quantity_type;
  created_item_id uuid;
begin
  if actor_id is null then
    raise exception 'AUTH_REQUIRED' using errcode = '42501';
  end if;

  select * into shopping_item
  from public.shopping_list_items
  where id = shopping_item_id
  for update;

  if shopping_item.id is null
    or not private.is_household_member(shopping_item.household_id, actor_id) then
    raise exception 'SHOPPING_ITEM_NOT_FOUND' using errcode = 'P0002';
  end if;
  if shopping_item.status <> 'PURCHASED' or shopping_item.moved_to_inventory then
    raise exception 'SHOPPING_ITEM_NOT_MOVABLE' using errcode = '22023';
  end if;
  if not exists (
    select 1 from public.storage_locations location
    where location.id = target_storage_location_id
      and location.household_id = shopping_item.household_id
      and location.deleted_at is null
  ) then
    raise exception 'STORAGE_LOCATION_INVALID' using errcode = '22023';
  end if;

  select quantity_type into target_quantity_type
  from public.ingredient_master
  where id = shopping_item.master_id;
  target_quantity_type := coalesce(target_quantity_type, 'COUNTABLE');

  insert into public.inventory_items (
    household_id,
    storage_location_id,
    master_id,
    display_name,
    category,
    quantity_type,
    quantity,
    unit,
    expiration_date,
    registered_via,
    created_by
  ) values (
    shopping_item.household_id,
    target_storage_location_id,
    shopping_item.master_id,
    shopping_item.name,
    shopping_item.category,
    target_quantity_type,
    case when target_quantity_type = 'LEVEL' then null else shopping_item.quantity end,
    shopping_item.unit,
    target_expiration_date,
    'MANUAL',
    actor_id
  )
  returning id into created_item_id;

  update public.shopping_list_items
  set moved_to_inventory = true
  where id = shopping_item.id;

  return created_item_id;
end;
$$;

revoke all on function public.create_household_with_defaults(text) from public;
revoke all on function public.join_household(text) from public;
revoke all on function public.move_shopping_item_to_inventory(uuid, uuid, date) from public;
grant execute on function public.create_household_with_defaults(text) to authenticated;
grant execute on function public.join_household(text) to authenticated;
grant execute on function public.move_shopping_item_to_inventory(uuid, uuid, date) to authenticated;

