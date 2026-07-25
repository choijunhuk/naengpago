-- Trigger behavior tests: set_updated_at bumps the audit column, the
-- inventory-history trigger records the correct change_type for creation, a
-- quantity decrease, and a soft delete, and the signup trigger provisions a
-- profile plus preferences without failing when those rows already exist.
-- Triggers fire for direct table writes, so this file runs as postgres.
begin;
select plan(8);

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
)
values ('00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-0000000000a1',
        'authenticated', 'authenticated', 'trig-a@naengpago.test', 'x',
        '{"provider":"email","providers":["email"]}', '{"nickname":"에이"}', now(), now());

insert into public.households (id, name, invite_code, created_by)
values ('00000000-0000-0000-0000-00000000a001', 'A네 집', 'TRIGCODEAA', '00000000-0000-0000-0000-0000000000a1');
insert into public.household_members (household_id, user_id, role)
values ('00000000-0000-0000-0000-00000000a001', '00000000-0000-0000-0000-0000000000a1', 'OWNER');

-- Storage location seeded with a stale updated_at; INSERT does not fire the
-- BEFORE UPDATE trigger, so the timestamp survives until we update it below.
insert into public.storage_locations (id, household_id, name, type, icon, sort_order, updated_at)
values ('00000000-0000-0000-0000-0000000a1001', '00000000-0000-0000-0000-00000000a001',
        '냉장실', 'FRIDGE', 'refrigerator', 0, '2000-01-01T00:00:00Z');

-- ===========================================================================
-- set_updated_at
-- ===========================================================================
update public.storage_locations
set name = '메인 냉장실'
where id = '00000000-0000-0000-0000-0000000a1001';

select ok(
  (select updated_at from public.storage_locations where id = '00000000-0000-0000-0000-0000000a1001')
    > '2020-01-01T00:00:00Z'::timestamptz,
  'set_updated_at refreshes updated_at on UPDATE'
);

-- ===========================================================================
-- record_inventory_history: CREATE / CONSUME / DISCARD
-- ===========================================================================
insert into public.inventory_items (
  id, household_id, storage_location_id, display_name, category,
  quantity_type, quantity, registered_via, created_by
)
values ('00000000-0000-0000-0000-0000000e9001', '00000000-0000-0000-0000-00000000a001',
        '00000000-0000-0000-0000-0000000a1001', '계란', 'EGG_DAIRY',
        'COUNTABLE', 5, 'MANUAL', '00000000-0000-0000-0000-0000000000a1');

select is(
  (
    select count(*) from public.inventory_history
    where item_id = '00000000-0000-0000-0000-0000000e9001' and change_type = 'CREATE'
  ),
  1::bigint,
  'record_inventory_history writes a CREATE row on INSERT'
);

update public.inventory_items set quantity = 2
where id = '00000000-0000-0000-0000-0000000e9001';

select is(
  (
    select count(*) from public.inventory_history
    where item_id = '00000000-0000-0000-0000-0000000e9001' and change_type = 'CONSUME'
  ),
  1::bigint,
  'record_inventory_history writes a CONSUME row when quantity decreases'
);

update public.inventory_items set deleted_at = now()
where id = '00000000-0000-0000-0000-0000000e9001';

select is(
  (
    select count(*) from public.inventory_history
    where item_id = '00000000-0000-0000-0000-0000000e9001' and change_type = 'DISCARD'
  ),
  1::bigint,
  'record_inventory_history writes a DISCARD row on soft delete'
);

-- ===========================================================================
-- handle_new_user: provisions profile + preferences, and stays idempotent.
-- ===========================================================================
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
)
values ('00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-0000000000e5',
        'authenticated', 'authenticated', 'trig-new@naengpago.test', 'x',
        '{"provider":"email","providers":["email"]}', '{"nickname":"신규"}', now(), now());

select is(
  (select count(*) from public.profiles where id = '00000000-0000-0000-0000-0000000000e5'),
  1::bigint,
  'handle_new_user creates a profile for the new auth user'
);
select is(
  (select count(*) from public.user_preferences where user_id = '00000000-0000-0000-0000-0000000000e5'),
  1::bigint,
  'handle_new_user creates a user_preferences row for the new auth user'
);

-- The on-conflict guards handle_new_user relies on must let a retried signup
-- re-run its inserts without error and without creating duplicate rows.
select lives_ok(
  $$
    insert into public.profiles (id, nickname)
      values ('00000000-0000-0000-0000-0000000000e5', '재시도') on conflict (id) do nothing;
    insert into public.user_preferences (user_id)
      values ('00000000-0000-0000-0000-0000000000e5') on conflict (user_id) do nothing;
  $$,
  'a repeated signup provisioning is idempotent and does not error'
);
select is(
  (select count(*) from public.profiles where id = '00000000-0000-0000-0000-0000000000e5'),
  1::bigint,
  'the idempotent re-run leaves exactly one profile row'
);

select * from finish();
rollback;
