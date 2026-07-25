-- Row-level-security penetration tests: a member of household B must never read
-- or mutate household A's data, members may not write image-analysis candidates
-- directly, inventory_history is read-only to members, and catalog tables stay
-- readable to every authenticated user. Cross-household writes that RLS filters
-- silently (UPDATE/DELETE) are re-checked as postgres rather than expected to throw.
begin;
select plan(16);

-- ---------------------------------------------------------------------------
-- Fixtures (seeded as postgres).
-- ---------------------------------------------------------------------------
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
)
values
  ('00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-0000000000a1',
   'authenticated', 'authenticated', 'owner-a@naengpago.test', 'x',
   '{"provider":"email","providers":["email"]}', '{"nickname":"에이"}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-0000000000b2',
   'authenticated', 'authenticated', 'owner-b@naengpago.test', 'x',
   '{"provider":"email","providers":["email"]}', '{"nickname":"비"}', now(), now());

-- Household A (user A) with a full spread of member-scoped data.
insert into public.households (id, name, invite_code, created_by)
values ('00000000-0000-0000-0000-00000000a001', 'A네 집', 'RLSCODEAAA', '00000000-0000-0000-0000-0000000000a1');
insert into public.household_members (household_id, user_id, role)
values ('00000000-0000-0000-0000-00000000a001', '00000000-0000-0000-0000-0000000000a1', 'OWNER');
insert into public.storage_locations (id, household_id, name, type, icon, sort_order)
values ('00000000-0000-0000-0000-0000000a1001', '00000000-0000-0000-0000-00000000a001', '냉장실', 'FRIDGE', 'refrigerator', 0);
insert into public.inventory_items (
  id, household_id, storage_location_id, display_name, category,
  quantity_type, quantity, registered_via, created_by
)
values ('00000000-0000-0000-0000-0000000e9001', '00000000-0000-0000-0000-00000000a001',
        '00000000-0000-0000-0000-0000000a1001', '사과', 'FRUIT', 'COUNTABLE', 5, 'MANUAL',
        '00000000-0000-0000-0000-0000000000a1');
insert into public.shopping_list_items (id, household_id, name, category, status, source, added_by)
values ('00000000-0000-0000-0000-0000000f9001', '00000000-0000-0000-0000-00000000a001',
        '두부', 'PROCESSED', 'PENDING', 'MANUAL', '00000000-0000-0000-0000-0000000000a1');
insert into public.notifications (id, user_id, type, payload)
values ('00000000-0000-0000-0000-00000000f101', '00000000-0000-0000-0000-0000000000a1', 'LOW_STOCK', '{}'::jsonb);
insert into public.cooking_history (id, household_id, cooked_by, deduction_mode)
values ('00000000-0000-0000-0000-00000000c101', '00000000-0000-0000-0000-00000000a001',
        '00000000-0000-0000-0000-0000000000a1', 'MANUAL');
insert into public.ingredient_images (id, household_id, storage_path, width, height, bytes, uploaded_by)
values ('00000000-0000-0000-0000-000000019001', '00000000-0000-0000-0000-00000000a001',
        'a001/rls-source.jpg', 800, 600, 12345, '00000000-0000-0000-0000-0000000000a1');
insert into public.image_analyses (id, image_id, status, ai_mode, analysis_version)
values ('00000000-0000-0000-0000-0000000a9001', '00000000-0000-0000-0000-000000019001', 'DONE', 'MOCK', 'v1');
insert into public.image_analysis_candidates (
  id, analysis_id, raw_name, display_name, category, quantity_type, estimated_count, confidence, bounding_box
)
values ('00000000-0000-0000-0000-0000000c9001', '00000000-0000-0000-0000-0000000a9001',
        '사과', '사과', 'FRUIT', 'COUNTABLE', 5, 0.90, '{}'::jsonb);

-- Household B (user B) with its own image + analysis + candidate to prove even
-- an owning member cannot write candidates directly.
insert into public.households (id, name, invite_code, created_by)
values ('00000000-0000-0000-0000-00000000b002', 'B네 집', 'RLSCODEBBB', '00000000-0000-0000-0000-0000000000b2');
insert into public.household_members (household_id, user_id, role)
values ('00000000-0000-0000-0000-00000000b002', '00000000-0000-0000-0000-0000000000b2', 'OWNER');
insert into public.ingredient_images (id, household_id, storage_path, width, height, bytes, uploaded_by)
values ('00000000-0000-0000-0000-000000019002', '00000000-0000-0000-0000-00000000b002',
        'b002/rls-source.jpg', 800, 600, 12345, '00000000-0000-0000-0000-0000000000b2');
insert into public.image_analyses (id, image_id, status, ai_mode, analysis_version)
values ('00000000-0000-0000-0000-0000000b9002', '00000000-0000-0000-0000-000000019002', 'DONE', 'MOCK', 'v1');
insert into public.image_analysis_candidates (
  id, analysis_id, raw_name, display_name, category, quantity_type, estimated_count, confidence, bounding_box
)
values ('00000000-0000-0000-0000-0000000c9002', '00000000-0000-0000-0000-0000000b9002',
        '배', '배', 'FRUIT', 'COUNTABLE', 2, 0.80, '{}'::jsonb);

-- ===========================================================================
-- As user B: cross-household reads and writes against household A must fail.
-- ===========================================================================
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000b2","role":"authenticated"}';

select is(
  (select count(*) from public.inventory_items where household_id = '00000000-0000-0000-0000-00000000a001'),
  0::bigint,
  'user B cannot read household A inventory_items'
);
select is(
  (select count(*) from public.shopping_list_items where household_id = '00000000-0000-0000-0000-00000000a001'),
  0::bigint,
  'user B cannot read household A shopping_list_items'
);
select is(
  (select count(*) from public.notifications where user_id = '00000000-0000-0000-0000-0000000000a1'),
  0::bigint,
  'user B cannot read household A owner notifications'
);
select is(
  (select count(*) from public.cooking_history where household_id = '00000000-0000-0000-0000-00000000a001'),
  0::bigint,
  'user B cannot read household A cooking_history'
);
select is(
  (select count(*) from public.image_analyses where id = '00000000-0000-0000-0000-0000000a9001'),
  0::bigint,
  'user B cannot read household A image_analyses'
);
select is(
  (select count(*) from public.storage_locations where household_id = '00000000-0000-0000-0000-00000000a001'),
  0::bigint,
  'user B cannot read household A storage_locations'
);

select throws_ok(
  $$ insert into public.inventory_items (
       household_id, storage_location_id, display_name, category,
       quantity_type, quantity, registered_via, created_by
     ) values (
       '00000000-0000-0000-0000-00000000a001', '00000000-0000-0000-0000-0000000a1001',
       '침입', 'OTHER', 'COUNTABLE', 1, 'MANUAL', '00000000-0000-0000-0000-0000000000b2'
     ) $$,
  '42501', NULL,
  'user B cannot INSERT into household A inventory (RLS check violation)'
);

-- UPDATE/DELETE against A's rows are silently filtered to zero rows; mutate here
-- and re-check the untouched row as postgres below.
update public.inventory_items set display_name = 'HACKED'
  where id = '00000000-0000-0000-0000-0000000e9001';
delete from public.inventory_items where id = '00000000-0000-0000-0000-0000000e9001';

-- Even in their own household, members may not write analysis candidates directly.
select throws_ok(
  $$ insert into public.image_analysis_candidates (
       analysis_id, raw_name, display_name, category, quantity_type, estimated_count, confidence, bounding_box
     ) values (
       '00000000-0000-0000-0000-0000000b9002', '포도', '포도', 'FRUIT', 'COUNTABLE', 3, 0.7, '{}'::jsonb
     ) $$,
  '42501', NULL,
  'members cannot INSERT image_analysis_candidates even in their own household'
);
select throws_ok(
  $$ update public.image_analysis_candidates set user_action = 'CONFIRMED'
       where id = '00000000-0000-0000-0000-0000000c9002' $$,
  '42501', NULL,
  'members cannot UPDATE image_analysis_candidates even in their own household'
);

reset role;

select is(
  (select display_name from public.inventory_items where id = '00000000-0000-0000-0000-0000000e9001'),
  '사과',
  'a cross-household UPDATE by user B changed nothing'
);
select is(
  (select count(*) from public.inventory_items where id = '00000000-0000-0000-0000-0000000e9001'),
  1::bigint,
  'a cross-household DELETE by user B removed nothing'
);

-- ===========================================================================
-- As user A: inventory_history is read-only, catalog tables are shared.
-- ===========================================================================
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}';

select cmp_ok(
  (
    select count(*)
    from public.inventory_history history
    join public.inventory_items item on item.id = history.item_id
    where item.household_id = '00000000-0000-0000-0000-00000000a001'
  ),
  '>=',
  1::bigint,
  'a member can read inventory_history for their own household'
);
select throws_ok(
  $$ insert into public.inventory_history (item_id, change_type, changed_by)
       values ('00000000-0000-0000-0000-0000000e9001', 'UPDATE', '00000000-0000-0000-0000-0000000000a1') $$,
  '42501', NULL,
  'members cannot INSERT inventory_history directly (no table grant)'
);

select cmp_ok(
  (select count(*) from public.ingredient_master),
  '>=',
  1::bigint,
  'catalog ingredient_master is readable by an authenticated user'
);
select cmp_ok(
  (select count(*) from public.ingredient_aliases),
  '>=',
  1::bigint,
  'catalog ingredient_aliases is readable by an authenticated user'
);
select cmp_ok(
  (select count(*) from public.recipes),
  '>=',
  1::bigint,
  'catalog recipes are readable by an authenticated user'
);

reset role;

select * from finish();
rollback;
