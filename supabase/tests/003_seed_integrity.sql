begin;
select plan(5);

select ok(
  (select count(*) >= 300 from public.ingredient_master),
  'ingredient master contains at least 300 rows'
);
select ok(
  (select count(*) >= 1000 from public.ingredient_aliases),
  'ingredient aliases contain at least 1000 rows'
);
select ok(
  (select count(*) >= 80 from public.recipes),
  'recipe seed contains at least 80 rows'
);
select is(
  (
    select count(*)
    from public.recipe_ingredients ingredient
    left join public.ingredient_master master on master.id = ingredient.master_id
    where master.id is null
  ),
  0::bigint,
  'every recipe ingredient maps to a master ingredient'
);
select is(
  (
    select count(*)
    from public.recipes recipe
    where not exists (
      select 1 from public.recipe_ingredients ingredient
      where ingredient.recipe_id = recipe.id
        and not ingredient.is_optional
    )
  ),
  0::bigint,
  'every recipe has a required ingredient'
);

select * from finish();
rollback;

