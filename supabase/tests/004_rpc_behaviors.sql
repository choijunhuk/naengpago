-- Behavioral tests for the SECURITY DEFINER RPCs and the account-purge foreign
-- keys. Catalog data (ingredient_master/aliases/recipes) is loaded by seed.sql
-- during db:reset; this file seeds only auth.users (handle_new_user then creates
-- profiles + user_preferences) and the household-scoped fixtures it exercises.
begin;
select plan(27);

-- ---------------------------------------------------------------------------
-- Fixtures (seeded as the postgres superuser, before any role switch).
-- ---------------------------------------------------------------------------
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
)
values
  ('00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-0000000000a1',
   'authenticated', 'authenticated', 'user-a@naengpago.test', 'x',
   '{"provider":"email","providers":["email"]}', '{"nickname":"에이"}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-0000000000b2',
   'authenticated', 'authenticated', 'user-b@naengpago.test', 'x',
   '{"provider":"email","providers":["email"]}', '{"nickname":"비"}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-0000000000c3',
   'authenticated', 'authenticated', 'user-c@naengpago.test', 'x',
   '{"provider":"email","providers":["email"]}', '{"nickname":"씨"}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-0000000000d4',
   'authenticated', 'authenticated', 'user-d@naengpago.test', 'x',
   '{"provider":"email","providers":["email"]}', '{"nickname":"디"}', now(), now());

-- Household A owned by user A: the primary workspace for shopping/image/deduct.
insert into public.households (id, name, invite_code, created_by)
values ('00000000-0000-0000-0000-00000000a001', 'A네 집', 'JOINCODEAA', '00000000-0000-0000-0000-0000000000a1');
insert into public.household_members (household_id, user_id, role)
values ('00000000-0000-0000-0000-00000000a001', '00000000-0000-0000-0000-0000000000a1', 'OWNER');
insert into public.storage_locations (id, household_id, name, type, icon, sort_order)
values
  ('00000000-0000-0000-0000-0000000a1001', '00000000-0000-0000-0000-00000000a001', '냉장실', 'FRIDGE', 'refrigerator', 0),
  ('00000000-0000-0000-0000-0000000a1002', '00000000-0000-0000-0000-00000000a001', '냉동실', 'FREEZER', 'snowflake', 1),
  ('00000000-0000-0000-0000-0000000a1003', '00000000-0000-0000-0000-00000000a001', '김치냉장고', 'KIMCHI', 'container', 2),
  ('00000000-0000-0000-0000-0000000a1004', '00000000-0000-0000-0000-00000000a001', '수납장', 'PANTRY', 'archive', 3);

-- Household B owned by user C: the join-by-invite target.
insert into public.households (id, name, invite_code, created_by)
values ('00000000-0000-0000-0000-00000000b002', 'C네 집', 'JOINCODEBB', '00000000-0000-0000-0000-0000000000c3');
insert into public.household_members (household_id, user_id, role)
values ('00000000-0000-0000-0000-00000000b002', '00000000-0000-0000-0000-0000000000c3', 'OWNER');
insert into public.storage_locations (id, household_id, name, type, icon, sort_order)
values ('00000000-0000-0000-0000-0000000b2001', '00000000-0000-0000-0000-00000000b002', '냉장실', 'FRIDGE', 'refrigerator', 0);

-- Household D owned by user D who stays solo: the account-deletion happy path.
insert into public.households (id, name, invite_code, created_by)
values ('00000000-0000-0000-0000-00000000d004', 'D네 집', 'SOLOCODEDD', '00000000-0000-0000-0000-0000000000d4');
insert into public.household_members (household_id, user_id, role)
values ('00000000-0000-0000-0000-00000000d004', '00000000-0000-0000-0000-0000000000d4', 'OWNER');

-- A purchased shopping item ready to move into inventory.
insert into public.shopping_list_items (
  id, household_id, name, category, quantity, status, source,
  added_by, purchased_by, purchased_at
)
values (
  '00000000-0000-0000-0000-0000000f9001', '00000000-0000-0000-0000-00000000a001',
  '우유', 'EGG_DAIRY', 1, 'PURCHASED', 'MANUAL',
  '00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000a1', now()
);

-- An image with a DONE analysis and one PENDING candidate, ready to confirm.
insert into public.ingredient_images (id, household_id, storage_path, width, height, bytes, uploaded_by)
values ('00000000-0000-0000-0000-000000019001', '00000000-0000-0000-0000-00000000a001',
        'a001/confirm-source.jpg', 800, 600, 12345, '00000000-0000-0000-0000-0000000000a1');
insert into public.image_analyses (id, image_id, status, ai_mode, analysis_version, raw_response, started_at, completed_at)
values ('00000000-0000-0000-0000-0000000a9001', '00000000-0000-0000-0000-000000019001',
        'DONE', 'MOCK', 'v1', '{}'::jsonb, now(), now());
insert into public.image_analysis_candidates (
  id, analysis_id, raw_name, display_name, category, quantity_type,
  estimated_count, confidence, bounding_box
)
values ('00000000-0000-0000-0000-0000000c9001', '00000000-0000-0000-0000-0000000a9001',
        '당근', '당근', 'VEGETABLE', 'COUNTABLE', 2, 0.90, '{}'::jsonb);

-- A second image with no analysis yet: the ingest target.
insert into public.ingredient_images (id, household_id, storage_path, width, height, bytes, uploaded_by)
values ('00000000-0000-0000-0000-000000019002', '00000000-0000-0000-0000-00000000a001',
        'a001/ingest-source.jpg', 800, 600, 22345, '00000000-0000-0000-0000-0000000000a1');

-- A measurable inventory item to deduct against (INSERT fires a CREATE history row).
insert into public.inventory_items (
  id, household_id, storage_location_id, display_name, category,
  quantity_type, quantity, unit, registered_via, created_by
)
values ('00000000-0000-0000-0000-0000000e9001', '00000000-0000-0000-0000-00000000a001',
        '00000000-0000-0000-0000-0000000a1001', '쌀', 'GRAIN',
        'MEASURABLE', 3, 'kg', 'MANUAL', '00000000-0000-0000-0000-0000000000a1');

-- ===========================================================================
-- A. create_household_with_defaults (run as user B).
-- ===========================================================================
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000b2","role":"authenticated"}';
select public.create_household_with_defaults('비네 집');
reset role;

select is(
  (select count(*) from public.households where created_by = '00000000-0000-0000-0000-0000000000b2'),
  1::bigint,
  'create_household_with_defaults inserts exactly one household for the caller'
);
select is(
  (
    select count(*)
    from public.household_members membership
    join public.households household on household.id = membership.household_id
    where household.created_by = '00000000-0000-0000-0000-0000000000b2'
      and membership.user_id = '00000000-0000-0000-0000-0000000000b2'
      and membership.role = 'OWNER'
  ),
  1::bigint,
  'create_household_with_defaults makes the caller the OWNER member'
);
select is(
  (
    select count(*)
    from public.storage_locations location
    join public.households household on household.id = location.household_id
    where household.created_by = '00000000-0000-0000-0000-0000000000b2'
  ),
  4::bigint,
  'create_household_with_defaults seeds four default storage locations'
);

-- ===========================================================================
-- B. join_household (user A joins household B; invalid code rejected; re-join no-ops).
-- ===========================================================================
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}';
select public.join_household('JOINCODEBB');
select lives_ok(
  $$ select public.join_household('JOINCODEBB') $$,
  'join_household is idempotent: re-joining with the same code does not error'
);
select throws_ok(
  $$ select public.join_household('NOPE000000') $$,
  '22023', NULL,
  'join_household rejects an unknown invite code'
);
reset role;

select is(
  (
    select count(*)
    from public.household_members
    where household_id = '00000000-0000-0000-0000-00000000b002'
      and user_id = '00000000-0000-0000-0000-0000000000a1'
  ),
  1::bigint,
  'join_household adds one MEMBER row and re-join leaves a single row'
);

-- ===========================================================================
-- C. move_shopping_item_to_inventory (creates inventory, marks moved, second call fails).
-- ===========================================================================
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}';
select public.move_shopping_item_to_inventory(
  '00000000-0000-0000-0000-0000000f9001',
  '00000000-0000-0000-0000-0000000a1001'
);
select throws_ok(
  $$ select public.move_shopping_item_to_inventory(
       '00000000-0000-0000-0000-0000000f9001',
       '00000000-0000-0000-0000-0000000a1001'
     ) $$,
  '22023', NULL,
  'move_shopping_item_to_inventory rejects an item already moved'
);
reset role;

select is(
  (
    select count(*)
    from public.inventory_items
    where household_id = '00000000-0000-0000-0000-00000000a001'
      and display_name = '우유'
  ),
  1::bigint,
  'move_shopping_item_to_inventory creates the inventory row'
);
select is(
  (select moved_to_inventory from public.shopping_list_items where id = '00000000-0000-0000-0000-0000000f9001'),
  true,
  'move_shopping_item_to_inventory marks the shopping item as moved'
);

-- ===========================================================================
-- D. confirm_image_analysis (writes final_payload + inventory + history; re-confirm fails).
-- ===========================================================================
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}';
select public.confirm_image_analysis(
  '00000000-0000-0000-0000-0000000a9001',
  jsonb_build_array(
    jsonb_build_object(
      'candidate_id', '00000000-0000-0000-0000-0000000c9001',
      'action', 'CONFIRMED',
      'final_payload', jsonb_build_object(
        'storage_location_id', '00000000-0000-0000-0000-0000000a1001',
        'quantity_type', 'COUNTABLE',
        'quantity', 2
      )
    )
  )
);
select throws_ok(
  $$ select public.confirm_image_analysis(
       '00000000-0000-0000-0000-0000000a9001',
       jsonb_build_array(
         jsonb_build_object(
           'candidate_id', '00000000-0000-0000-0000-0000000c9001',
           'action', 'CONFIRMED',
           'final_payload', jsonb_build_object(
             'storage_location_id', '00000000-0000-0000-0000-0000000a1001',
             'quantity_type', 'COUNTABLE',
             'quantity', 2
           )
         )
       )
     ) $$,
  '40001', NULL,
  'confirm_image_analysis raises 40001 when the analysis was already confirmed'
);
reset role;

select is(
  (
    select count(*)
    from public.inventory_items
    where household_id = '00000000-0000-0000-0000-00000000a001'
      and display_name = '당근'
      and registered_via = 'IMAGE_AI'
  ),
  1::bigint,
  'confirm_image_analysis creates the confirmed inventory item'
);
select is(
  (select user_action from public.image_analysis_candidates where id = '00000000-0000-0000-0000-0000000c9001'),
  'CONFIRMED'::public.candidate_user_action,
  'confirm_image_analysis records the user action on the candidate'
);
select is(
  (
    select count(*)
    from public.inventory_history history
    join public.inventory_items item on item.id = history.item_id
    where item.display_name = '당근'
      and history.change_type = 'CREATE'
  ),
  1::bigint,
  'confirm_image_analysis writes a CREATE inventory-history row for the new item'
);

-- ===========================================================================
-- E. deduct_inventory_atomic (floors at 0, links history, stale timestamp fails).
-- ===========================================================================
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}';
select public.deduct_inventory_atomic(
  '00000000-0000-0000-0000-00000000a001',
  null,
  jsonb_build_array(
    jsonb_build_object('item_id', '00000000-0000-0000-0000-0000000e9001', 'quantity_delta', 5)
  ),
  'MANUAL'
);
select throws_ok(
  $$ select public.deduct_inventory_atomic(
       '00000000-0000-0000-0000-00000000a001',
       null,
       jsonb_build_array(
         jsonb_build_object(
           'item_id', '00000000-0000-0000-0000-0000000e9001',
           'quantity_delta', 1,
           'expected_updated_at', '2000-01-01T00:00:00Z'
         )
       ),
       'MANUAL'
     ) $$,
  '40001', NULL,
  'deduct_inventory_atomic raises 40001 on a stale expected_updated_at'
);
reset role;

select is(
  (select quantity from public.inventory_items where id = '00000000-0000-0000-0000-0000000e9001'),
  0::numeric,
  'deduct_inventory_atomic floors a quantity deduction at zero'
);
select is(
  (
    select count(*)
    from public.cooking_history
    where household_id = '00000000-0000-0000-0000-00000000a001'
      and cooked_by = '00000000-0000-0000-0000-0000000000a1'
      and deduction_mode = 'MANUAL'
  ),
  1::bigint,
  'deduct_inventory_atomic records a cooking_history row'
);
select is(
  (
    select count(*)
    from public.inventory_history
    where item_id = '00000000-0000-0000-0000-0000000e9001'
      and change_type = 'CONSUME'
      and cooking_history_id is not null
  ),
  1::bigint,
  'deduct_inventory_atomic links the CONSUME history row to the cooking_history'
);

-- ===========================================================================
-- F. schedule_account_deletion (owner-with-members blocked; solo user soft-deletes).
-- ===========================================================================
-- User C owns household B and, after B's join test, has another member (user A)
-- but no co-owner, so deletion must demand an owner transfer.
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000c3","role":"authenticated"}';
select throws_ok(
  $$ select public.schedule_account_deletion() $$,
  '23514', NULL,
  'schedule_account_deletion blocks a sole owner who still has other members'
);
reset role;

-- User D is the only member of household D: soft-delete proceeds.
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000d4","role":"authenticated"}';
select public.schedule_account_deletion();
reset role;

select is(
  (
    select deletion_scheduled_at is not null and deleted_at is not null
    from public.profiles
    where id = '00000000-0000-0000-0000-0000000000d4'
  ),
  true,
  'schedule_account_deletion soft-deletes the solo user profile and schedules purge'
);
select is(
  (select deleted_at is not null from public.households where id = '00000000-0000-0000-0000-00000000d004'),
  true,
  'schedule_account_deletion soft-deletes the solo user household'
);

-- ===========================================================================
-- G. ingest_image_analysis (atomic analysis + candidates; daily limit enforced).
-- ===========================================================================
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}';
select public.ingest_image_analysis(
  '00000000-0000-0000-0000-000000019002',
  'MOCK', 'test-model', 'v1', '{}'::jsonb,
  jsonb_build_array(
    jsonb_build_object(
      'rawName', '양파',
      'normalizedNameKo', '양파',
      'category', 'VEGETABLE',
      'quantityType', 'COUNTABLE',
      'estimatedCount', 3,
      'confidence', 0.80,
      'boundingBox', '{}'::jsonb
    )
  )
);
-- User A already owns two analyses today (the seeded DONE analysis and the one
-- just ingested), so a daily limit of 1 is already exceeded.
select throws_ok(
  $$ select public.ingest_image_analysis(
       '00000000-0000-0000-0000-000000019002',
       'MOCK', 'test-model', 'v1', '{}'::jsonb,
       jsonb_build_array(
         jsonb_build_object(
           'rawName', '감자', 'category', 'VEGETABLE', 'quantityType', 'COUNTABLE',
           'estimatedCount', 1, 'confidence', 0.5, 'boundingBox', '{}'::jsonb
         )
       ),
       null, 1
     ) $$,
  'PT429', NULL,
  'ingest_image_analysis raises PT429 once the daily limit is exceeded'
);
reset role;

select is(
  (
    select count(*)
    from public.image_analyses
    where image_id = '00000000-0000-0000-0000-000000019002'
  ),
  1::bigint,
  'ingest_image_analysis inserts the analysis row'
);
select is(
  (
    select count(*)
    from public.image_analysis_candidates candidate
    join public.image_analyses analysis on analysis.id = candidate.analysis_id
    where analysis.image_id = '00000000-0000-0000-0000-000000019002'
  ),
  1::bigint,
  'ingest_image_analysis inserts the candidate rows in the same transaction'
);

-- ===========================================================================
-- H. Account-purge foreign keys null out actor columns on profile delete.
-- ===========================================================================
select lives_ok(
  $$ delete from public.profiles where id = '00000000-0000-0000-0000-0000000000a1' $$,
  'deleting a referenced profile succeeds despite audit references'
);
select is(
  (select created_by from public.households where id = '00000000-0000-0000-0000-00000000a001'),
  null::uuid,
  'households.created_by is set null when the creating profile is deleted'
);
select is(
  (
    select count(*)
    from public.cooking_history
    where household_id = '00000000-0000-0000-0000-00000000a001'
      and cooked_by is not null
  ),
  0::bigint,
  'cooking_history.cooked_by is set null when the actor profile is deleted'
);
select is(
  (select count(*) from public.inventory_history where changed_by is not null),
  0::bigint,
  'inventory_history.changed_by is set null when the actor profile is deleted'
);

select * from finish();
rollback;
