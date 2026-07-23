create or replace function private.is_active_user(target_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles profile
    where profile.id = target_user_id
      and profile.deleted_at is null
      and profile.deletion_scheduled_at is null
  );
$$;

revoke all on function private.is_active_user(uuid) from public;
grant execute on function private.is_active_user(uuid) to authenticated;

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
  select private.is_active_user(target_user_id)
    and exists (
      select 1
      from public.household_members membership
      join public.households household on household.id = membership.household_id
      where membership.household_id = target_household_id
        and membership.user_id = target_user_id
        and household.deleted_at is null
    );
$$;

revoke all on function private.is_household_member(uuid, uuid) from public;
grant execute on function private.is_household_member(uuid, uuid) to authenticated;

drop policy if exists profiles_own_rows on public.profiles;
create policy profiles_own_active_select on public.profiles
  for select to authenticated
  using (id = (select auth.uid()) and private.is_active_user((select auth.uid())));
create policy profiles_own_active_update on public.profiles
  for update to authenticated
  using (id = (select auth.uid()) and private.is_active_user((select auth.uid())))
  with check (
    id = (select auth.uid())
    and deleted_at is null
    and deletion_scheduled_at is null
  );

drop policy if exists favorite_recipes_own_rows on public.favorite_recipes;
create policy favorite_recipes_own_active_rows on public.favorite_recipes
  for all to authenticated
  using (user_id = (select auth.uid()) and private.is_active_user((select auth.uid())))
  with check (user_id = (select auth.uid()) and private.is_active_user((select auth.uid())));

drop policy if exists notifications_own_rows on public.notifications;
create policy notifications_own_active_rows on public.notifications
  for all to authenticated
  using (user_id = (select auth.uid()) and private.is_active_user((select auth.uid())))
  with check (user_id = (select auth.uid()) and private.is_active_user((select auth.uid())));

drop policy if exists user_preferences_own_rows on public.user_preferences;
create policy user_preferences_own_active_rows on public.user_preferences
  for all to authenticated
  using (user_id = (select auth.uid()) and private.is_active_user((select auth.uid())))
  with check (user_id = (select auth.uid()) and private.is_active_user((select auth.uid())));

create or replace function private.record_inventory_history()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid;
  inferred_change public.inventory_change_type;
  linked_cooking_history_id uuid;
  change_reason text;
begin
  actor_id := coalesce((select auth.uid()), new.created_by);
  linked_cooking_history_id := nullif(current_setting('app.cooking_history_id', true), '')::uuid;
  change_reason := coalesce(nullif(current_setting('app.inventory_reason', true), ''), 'inventory changed');

  if tg_op = 'INSERT' then
    insert into public.inventory_history (
      item_id, change_type, quantity_after, level_after, reason, cooking_history_id, changed_by
    ) values (
      new.id, 'CREATE', new.quantity, new.remaining_level,
      coalesce(nullif(current_setting('app.inventory_reason', true), ''), 'inventory created'),
      linked_cooking_history_id, actor_id
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
    item_id, change_type, quantity_before, quantity_after, level_before, level_after,
    reason, cooking_history_id, changed_by
  ) values (
    new.id, inferred_change, old.quantity, new.quantity, old.remaining_level, new.remaining_level,
    change_reason, linked_cooking_history_id, actor_id
  );

  return new;
end;
$$;

revoke all on function private.record_inventory_history() from public;

create or replace function public.confirm_image_analysis(
  target_analysis_id uuid,
  target_decisions jsonb,
  target_additions jsonb default '[]'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
  target_household_id uuid;
  target_image_path text;
  decision jsonb;
  addition jsonb;
  candidate public.image_analysis_candidates%rowtype;
  payload jsonb;
  action public.candidate_user_action;
  merge_item public.inventory_items%rowtype;
  created_id uuid;
  created_ids uuid[] := '{}';
  merged_ids uuid[] := '{}';
  storage_id uuid;
  target_quantity_type public.quantity_type;
  target_quantity numeric;
  target_level public.remaining_level;
begin
  if actor_id is null then
    raise exception 'AUTH_REQUIRED' using errcode = '42501';
  end if;
  if jsonb_typeof(target_decisions) <> 'array' or jsonb_typeof(target_additions) <> 'array' then
    raise exception 'DECISIONS_INVALID' using errcode = '22023';
  end if;

  select image.household_id, image.storage_path
  into target_household_id, target_image_path
  from public.image_analyses analysis
  join public.ingredient_images image on image.id = analysis.image_id
  where analysis.id = target_analysis_id
    and analysis.status = 'DONE'
    and image.deleted_at is null
  for update of analysis;

  if target_household_id is null
    or not private.is_household_member(target_household_id, actor_id) then
    raise exception 'ANALYSIS_NOT_FOUND' using errcode = 'P0002';
  end if;
  if exists (
    select 1
    from public.image_analysis_candidates
    where analysis_id = target_analysis_id
      and user_action <> 'PENDING'
  ) then
    raise exception 'ANALYSIS_ALREADY_CONFIRMED' using errcode = '40001';
  end if;

  perform set_config('app.inventory_reason', 'image analysis confirmed', true);

  for decision in select value from jsonb_array_elements(target_decisions)
  loop
    select * into candidate
    from public.image_analysis_candidates
    where id = (decision ->> 'candidate_id')::uuid
      and analysis_id = target_analysis_id
    for update;

    if candidate.id is null then
      raise exception 'CANDIDATE_NOT_FOUND' using errcode = 'P0002';
    end if;

    action := (decision ->> 'action')::public.candidate_user_action;
    if action = 'PENDING' then
      raise exception 'CANDIDATE_ACTION_INVALID' using errcode = '22023';
    end if;
    payload := coalesce(decision -> 'final_payload', '{}'::jsonb);

    if action = 'DELETED' then
      update public.image_analysis_candidates
      set user_action = action, final_payload = payload
      where id = candidate.id;
      continue;
    end if;

    storage_id := (payload ->> 'storage_location_id')::uuid;
    if not exists (
      select 1 from public.storage_locations location
      where location.id = storage_id
        and location.household_id = target_household_id
        and location.deleted_at is null
    ) then
      raise exception 'STORAGE_LOCATION_INVALID' using errcode = '22023';
    end if;

    target_quantity_type := coalesce(
      nullif(payload ->> 'quantity_type', '')::public.quantity_type,
      candidate.quantity_type
    );
    target_quantity := case
      when target_quantity_type = 'LEVEL' then null
      else nullif(payload ->> 'quantity', '')::numeric
    end;
    target_level := case
      when target_quantity_type = 'LEVEL'
        then nullif(payload ->> 'remaining_level', '')::public.remaining_level
      else null
    end;

    if target_quantity_type <> 'LEVEL' and target_quantity is null then
      raise exception 'QUANTITY_REQUIRED' using errcode = '22023';
    end if;
    if target_quantity_type = 'LEVEL' and target_level is null then
      raise exception 'REMAINING_LEVEL_REQUIRED' using errcode = '22023';
    end if;

    if action in ('MERGED_ADD', 'MERGED_REPLACE') then
      select * into merge_item
      from public.inventory_items
      where id = (decision ->> 'merge_target_item_id')::uuid
        and household_id = target_household_id
        and deleted_at is null
      for update;

      if merge_item.id is null then
        raise exception 'MERGE_TARGET_INVALID' using errcode = '22023';
      end if;

      update public.inventory_items
      set quantity = case
            when target_quantity_type = 'LEVEL' then null
            when action = 'MERGED_ADD' then coalesce(quantity, 0) + coalesce(target_quantity, 0)
            else target_quantity
          end,
          remaining_level = case
            when target_quantity_type <> 'LEVEL' then null
            when action = 'MERGED_ADD'
              and private.remaining_level_rank(remaining_level) >= private.remaining_level_rank(target_level)
              then remaining_level
            else target_level
          end,
          expiration_date = coalesce(nullif(payload ->> 'expiration_date', '')::date, expiration_date),
          storage_location_id = storage_id,
          display_name = coalesce(nullif(trim(payload ->> 'display_name'), ''), display_name),
          master_id = coalesce(nullif(payload ->> 'master_id', '')::uuid, master_id),
          ai_confidence = candidate.confidence
      where id = merge_item.id;

      merged_ids := array_append(merged_ids, merge_item.id);
    else
      insert into public.inventory_items (
        household_id, storage_location_id, master_id, display_name, category,
        quantity_type, quantity, unit, remaining_level, remaining_percent,
        expiration_date, expiration_type, registered_via, image_path,
        ai_confidence, created_by
      ) values (
        target_household_id,
        storage_id,
        coalesce(nullif(payload ->> 'master_id', '')::uuid, candidate.matched_master_id),
        coalesce(nullif(trim(payload ->> 'display_name'), ''), candidate.display_name),
        coalesce(nullif(payload ->> 'category', '')::public.ingredient_category, candidate.category),
        target_quantity_type,
        target_quantity,
        coalesce(nullif(payload ->> 'unit', ''), candidate.unit),
        target_level,
        nullif(payload ->> 'remaining_percent', '')::integer,
        nullif(payload ->> 'expiration_date', '')::date,
        coalesce(nullif(payload ->> 'expiration_type', '')::public.expiration_type, 'UNKNOWN'),
        'IMAGE_AI',
        target_image_path,
        candidate.confidence,
        actor_id
      )
      returning id into created_id;
      created_ids := array_append(created_ids, created_id);
    end if;

    update public.image_analysis_candidates
    set user_action = action, final_payload = payload
    where id = candidate.id;
  end loop;

  for addition in select value from jsonb_array_elements(target_additions)
  loop
    storage_id := (addition ->> 'storage_location_id')::uuid;
    if not exists (
      select 1 from public.storage_locations location
      where location.id = storage_id
        and location.household_id = target_household_id
        and location.deleted_at is null
    ) then
      raise exception 'STORAGE_LOCATION_INVALID' using errcode = '22023';
    end if;
    target_quantity_type := (addition ->> 'quantity_type')::public.quantity_type;

    insert into public.inventory_items (
      household_id, storage_location_id, master_id, display_name, category,
      quantity_type, quantity, unit, remaining_level, remaining_percent,
      expiration_date, expiration_type, registered_via, created_by
    ) values (
      target_household_id,
      storage_id,
      nullif(addition ->> 'master_id', '')::uuid,
      trim(addition ->> 'display_name'),
      coalesce(nullif(addition ->> 'category', '')::public.ingredient_category, 'OTHER'),
      target_quantity_type,
      case when target_quantity_type = 'LEVEL' then null else (addition ->> 'quantity')::numeric end,
      nullif(addition ->> 'unit', ''),
      case when target_quantity_type = 'LEVEL'
        then (addition ->> 'remaining_level')::public.remaining_level else null end,
      nullif(addition ->> 'remaining_percent', '')::integer,
      nullif(addition ->> 'expiration_date', '')::date,
      coalesce(nullif(addition ->> 'expiration_type', '')::public.expiration_type, 'UNKNOWN'),
      'MANUAL',
      actor_id
    )
    returning id into created_id;
    created_ids := array_append(created_ids, created_id);
  end loop;

  return jsonb_build_object(
    'createdItemIds', to_jsonb(created_ids),
    'mergedItemIds', to_jsonb(merged_ids)
  );
end;
$$;

create or replace function public.deduct_inventory_atomic(
  target_household_id uuid,
  target_recipe_id uuid,
  target_deductions jsonb,
  target_mode public.deduction_mode,
  target_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
  deduction jsonb;
  target_item public.inventory_items%rowtype;
  created_history_id uuid;
  updated_ids uuid[] := '{}';
  quantity_delta numeric;
  level_to public.remaining_level;
begin
  if actor_id is null then
    raise exception 'AUTH_REQUIRED' using errcode = '42501';
  end if;
  if not private.is_household_member(target_household_id, actor_id) then
    raise exception 'HOUSEHOLD_FORBIDDEN' using errcode = '42501';
  end if;
  if jsonb_typeof(target_deductions) <> 'array' then
    raise exception 'DEDUCTIONS_INVALID' using errcode = '22023';
  end if;
  if target_recipe_id is not null
    and not exists (select 1 from public.recipes where id = target_recipe_id and is_active) then
    raise exception 'RECIPE_NOT_FOUND' using errcode = 'P0002';
  end if;

  insert into public.cooking_history (
    household_id, recipe_id, cooked_by, deduction_mode, note
  ) values (
    target_household_id, target_recipe_id, actor_id, target_mode, target_note
  )
  returning id into created_history_id;

  perform set_config('app.cooking_history_id', created_history_id::text, true);
  perform set_config('app.inventory_reason', 'recipe cooking deduction', true);

  for deduction in select value from jsonb_array_elements(target_deductions)
  loop
    select * into target_item
    from public.inventory_items
    where id = (deduction ->> 'item_id')::uuid
      and household_id = target_household_id
      and deleted_at is null
    for update;

    if target_item.id is null then
      raise exception 'INVENTORY_ITEM_NOT_FOUND' using errcode = 'P0002';
    end if;
    if nullif(deduction ->> 'expected_updated_at', '') is not null
      and target_item.updated_at <> (deduction ->> 'expected_updated_at')::timestamptz then
      raise exception 'INVENTORY_CONFLICT' using errcode = '40001';
    end if;

    quantity_delta := nullif(deduction ->> 'quantity_delta', '')::numeric;
    level_to := nullif(deduction ->> 'level_to', '')::public.remaining_level;

    if target_item.quantity_type = 'LEVEL' then
      if level_to is null then
        raise exception 'LEVEL_TO_REQUIRED' using errcode = '22023';
      end if;
      update public.inventory_items
      set remaining_level = level_to
      where id = target_item.id;
    else
      if quantity_delta is null or quantity_delta < 0 then
        raise exception 'QUANTITY_DELTA_INVALID' using errcode = '22023';
      end if;
      update public.inventory_items
      set quantity = greatest(0, coalesce(quantity, 0) - quantity_delta)
      where id = target_item.id;
    end if;
    updated_ids := array_append(updated_ids, target_item.id);
  end loop;

  return jsonb_build_object(
    'updatedItemIds', to_jsonb(updated_ids),
    'cookingHistoryId', created_history_id
  );
end;
$$;

create or replace function public.schedule_account_deletion()
returns timestamptz
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
  scheduled_at timestamptz := now() + interval '30 days';
begin
  if actor_id is null then
    raise exception 'AUTH_REQUIRED' using errcode = '42501';
  end if;
  if exists (
    select 1
    from public.household_members membership
    where membership.user_id = actor_id
      and membership.role = 'OWNER'
      and exists (
        select 1 from public.household_members other
        where other.household_id = membership.household_id
          and other.user_id <> actor_id
      )
      and not exists (
        select 1 from public.household_members other_owner
        where other_owner.household_id = membership.household_id
          and other_owner.user_id <> actor_id
          and other_owner.role = 'OWNER'
      )
  ) then
    raise exception 'OWNER_TRANSFER_REQUIRED' using errcode = '23514';
  end if;

  update public.households household
  set deleted_at = now()
  where household.created_by = actor_id
    and household.deleted_at is null
    and not exists (
      select 1 from public.household_members other
      where other.household_id = household.id
        and other.user_id <> actor_id
    );

  update public.profiles
  set deletion_scheduled_at = scheduled_at,
      deleted_at = now()
  where id = actor_id;

  return scheduled_at;
end;
$$;

revoke all on function public.confirm_image_analysis(uuid, jsonb, jsonb) from public;
revoke all on function public.deduct_inventory_atomic(uuid, uuid, jsonb, public.deduction_mode, text) from public;
revoke all on function public.schedule_account_deletion() from public;
grant execute on function public.confirm_image_analysis(uuid, jsonb, jsonb) to authenticated;
grant execute on function public.deduct_inventory_atomic(uuid, uuid, jsonb, public.deduction_mode, text) to authenticated;
grant execute on function public.schedule_account_deletion() to authenticated;
