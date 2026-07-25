-- Hardening pass: account-purge foreign keys, atomic image ingest RPC,
-- candidate/analysis write lockdown, supporting indexes, signup idempotency.

-- 1. Account purge foreign keys.
-- Columns that reference profiles(id) without an on-delete rule block the
-- auth.users -> profiles cascade during account purge. Make actor columns
-- nullable and set them null on delete so audit/history rows survive.

alter table public.households
  drop constraint households_created_by_fkey;
alter table public.households
  alter column created_by drop not null;
alter table public.households
  add constraint households_created_by_fkey
  foreign key (created_by) references public.profiles(id) on delete set null;

alter table public.ingredient_aliases
  drop constraint ingredient_aliases_created_by_fkey;
alter table public.ingredient_aliases
  add constraint ingredient_aliases_created_by_fkey
  foreign key (created_by) references public.profiles(id) on delete set null;

alter table public.inventory_items
  drop constraint inventory_items_created_by_fkey;
alter table public.inventory_items
  alter column created_by drop not null;
alter table public.inventory_items
  add constraint inventory_items_created_by_fkey
  foreign key (created_by) references public.profiles(id) on delete set null;

alter table public.inventory_history
  drop constraint inventory_history_changed_by_fkey;
alter table public.inventory_history
  alter column changed_by drop not null;
alter table public.inventory_history
  add constraint inventory_history_changed_by_fkey
  foreign key (changed_by) references public.profiles(id) on delete set null;

alter table public.ingredient_images
  drop constraint ingredient_images_uploaded_by_fkey;
alter table public.ingredient_images
  alter column uploaded_by drop not null;
alter table public.ingredient_images
  add constraint ingredient_images_uploaded_by_fkey
  foreign key (uploaded_by) references public.profiles(id) on delete set null;

alter table public.cooking_history
  drop constraint cooking_history_cooked_by_fkey;
alter table public.cooking_history
  alter column cooked_by drop not null;
alter table public.cooking_history
  add constraint cooking_history_cooked_by_fkey
  foreign key (cooked_by) references public.profiles(id) on delete set null;

alter table public.shopping_list_items
  drop constraint shopping_list_items_added_by_fkey;
alter table public.shopping_list_items
  alter column added_by drop not null;
alter table public.shopping_list_items
  add constraint shopping_list_items_added_by_fkey
  foreign key (added_by) references public.profiles(id) on delete set null;

alter table public.shopping_list_items
  drop constraint shopping_list_items_purchased_by_fkey;
alter table public.shopping_list_items
  add constraint shopping_list_items_purchased_by_fkey
  foreign key (purchased_by) references public.profiles(id) on delete set null;

-- 2. Signup trigger idempotency.
-- Re-run of the trigger (or a retried signup) must not fail on a duplicate row.
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
  )
  on conflict (id) do nothing;

  insert into public.user_preferences (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  return new;
end;
$$;

revoke all on function private.handle_new_user() from public;

-- 3. Lock image analysis writes behind SECURITY DEFINER RPCs.
-- Members may read analyses/candidates but never write final_payload or other
-- columns directly; ingest and confirmation flow through definer RPCs only.
drop policy if exists image_analyses_member_all on public.image_analyses;
create policy image_analyses_member_select on public.image_analyses
  for select to authenticated
  using (
    exists (
      select 1 from public.ingredient_images image
      where image.id = image_analyses.image_id
        and private.is_household_member(image.household_id, (select auth.uid()))
    )
  );

drop policy if exists image_candidates_member_all on public.image_analysis_candidates;
create policy image_candidates_member_select on public.image_analysis_candidates
  for select to authenticated
  using (
    exists (
      select 1
      from public.image_analyses analysis
      join public.ingredient_images image on image.id = analysis.image_id
      where analysis.id = image_analysis_candidates.analysis_id
        and private.is_household_member(image.household_id, (select auth.uid()))
    )
  );

revoke insert, update, delete on table public.image_analyses from authenticated;
revoke insert, update, delete on table public.image_analysis_candidates from authenticated;

-- 4. Atomic image analysis ingest.
-- Verifies caller access, enforces the daily limit under an advisory lock so
-- concurrent calls cannot bypass it, then inserts the analysis, batch-resolves
-- aliases, batch-detects duplicates, and inserts all candidates in one
-- transaction. The LLM/mock call happens in the edge function beforehand.
create or replace function public.ingest_image_analysis(
  target_image_id uuid,
  target_ai_mode public.ai_mode,
  target_model text,
  target_analysis_version text,
  target_raw_response jsonb,
  target_items jsonb,
  target_storage_location_hint uuid default null,
  target_daily_limit integer default 30
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
  target_household_id uuid;
  daily_count integer;
  day_start timestamptz;
  new_analysis_id uuid;
  candidates_json jsonb;
begin
  if actor_id is null then
    raise exception 'AUTH_REQUIRED' using errcode = '42501';
  end if;
  if jsonb_typeof(target_items) <> 'array' then
    raise exception 'ITEMS_INVALID' using errcode = '22023';
  end if;

  select image.household_id
  into target_household_id
  from public.ingredient_images image
  where image.id = target_image_id
    and image.deleted_at is null;

  if target_household_id is null
    or not private.is_household_member(target_household_id, actor_id) then
    raise exception 'IMAGE_FORBIDDEN' using errcode = '42501';
  end if;

  -- Serialize per-uploader so the count-then-insert limit check is race-free.
  perform pg_advisory_xact_lock(hashtextextended(actor_id::text, 0));

  day_start := date_trunc('day', timezone('utc', now())) at time zone 'utc';
  select count(*)
  into daily_count
  from public.image_analyses analysis
  join public.ingredient_images image on image.id = analysis.image_id
  where image.uploaded_by = actor_id
    and analysis.created_at >= day_start;

  if daily_count >= greatest(target_daily_limit, 0) then
    raise exception 'ANALYSIS_LIMIT_EXCEEDED' using errcode = 'PT429';
  end if;

  insert into public.image_analyses (
    image_id, status, ai_mode, model, analysis_version, raw_response, started_at, completed_at
  ) values (
    target_image_id, 'DONE', target_ai_mode, target_model, target_analysis_version,
    target_raw_response, now(), now()
  )
  returning id into new_analysis_id;

  with detected as (
    select
      ord,
      nullif(trim(elem ->> 'rawName'), '') as raw_name,
      coalesce(nullif(trim(elem ->> 'normalizedNameKo'), ''), nullif(trim(elem ->> 'rawName'), '')) as display_name,
      (elem ->> 'category')::public.ingredient_category as category,
      (elem ->> 'quantityType')::public.quantity_type as quantity_type,
      nullif(elem ->> 'estimatedCount', '')::numeric as estimated_count,
      nullif(elem ->> 'unit', '') as unit,
      nullif(elem ->> 'remainingLevel', '')::public.remaining_level as remaining_level,
      (elem ->> 'confidence')::numeric as confidence,
      coalesce(elem -> 'boundingBox', '{}'::jsonb) as bounding_box,
      coalesce(elem -> 'packageInfo', '{}'::jsonb) as package_info
    from jsonb_array_elements(target_items) with ordinality as t(elem, ord)
  ),
  resolved as (
    select
      d.*,
      alias_match.master_id as matched_master_id,
      dup.item_id as duplicate_of_item_id
    from detected d
    left join lateral (
      select alias.master_id
      from public.ingredient_aliases alias
      where alias.alias in (d.raw_name, d.display_name)
      order by alias.master_id
      limit 1
    ) alias_match on true
    left join lateral (
      select item.id as item_id
      from public.inventory_items item
      where alias_match.master_id is not null
        and item.household_id = target_household_id
        and item.master_id = alias_match.master_id
        and item.deleted_at is null
        and (target_storage_location_hint is null or item.storage_location_id = target_storage_location_hint)
      order by item.created_at desc
      limit 1
    ) dup on true
  ),
  inserted as (
    insert into public.image_analysis_candidates (
      analysis_id, raw_name, matched_master_id, display_name, category,
      quantity_type, estimated_count, unit, remaining_level, confidence,
      bounding_box, package_info, duplicate_of_item_id
    )
    select
      new_analysis_id,
      coalesce(r.raw_name, r.display_name, '재료'),
      r.matched_master_id,
      coalesce(r.display_name, r.raw_name, '재료'),
      r.category,
      r.quantity_type,
      r.estimated_count,
      r.unit,
      r.remaining_level,
      r.confidence,
      r.bounding_box,
      r.package_info,
      r.duplicate_of_item_id
    from resolved r
    order by r.ord
    returning image_analysis_candidates.*
  )
  select coalesce(jsonb_agg(to_jsonb(inserted) order by inserted.created_at, inserted.id), '[]'::jsonb)
  into candidates_json
  from inserted;

  return jsonb_build_object(
    'analysisId', new_analysis_id,
    'status', 'DONE',
    'candidates', candidates_json
  );
end;
$$;

revoke all on function public.ingest_image_analysis(uuid, public.ai_mode, text, text, jsonb, jsonb, uuid, integer) from public;
grant execute on function public.ingest_image_analysis(uuid, public.ai_mode, text, text, jsonb, jsonb, uuid, integer) to authenticated;

-- 5. Supporting indexes for purge, history, and recipe/shopping joins.
create index if not exists ingredient_images_uploaded_by_idx
  on public.ingredient_images (uploaded_by);
create index if not exists cooking_history_household_idx
  on public.cooking_history (household_id);
create index if not exists cooking_history_recipe_idx
  on public.cooking_history (recipe_id);
create index if not exists inventory_history_item_idx
  on public.inventory_history (item_id);
create index if not exists image_analyses_image_idx
  on public.image_analyses (image_id);
create index if not exists profiles_deletion_scheduled_idx
  on public.profiles (deletion_scheduled_at)
  where deletion_scheduled_at is not null;
create index if not exists shopping_list_items_source_recipe_idx
  on public.shopping_list_items (source_recipe_id);
