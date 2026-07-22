begin;
select plan(2);

select results_eq(
  $$
    select count(*)::bigint
    from pg_class relation
    join pg_namespace namespace on namespace.oid = relation.relnamespace
    where namespace.nspname = 'public'
      and relation.relname in (
        'profiles', 'households', 'household_members', 'storage_locations',
        'ingredient_master', 'ingredient_aliases', 'ingredient_substitutions',
        'inventory_items', 'inventory_history', 'ingredient_images',
        'image_analyses', 'image_analysis_candidates', 'recipes',
        'recipe_ingredients', 'favorite_recipes', 'cooking_history',
        'shopping_list_items', 'notifications', 'user_preferences'
      )
      and relation.relrowsecurity
  $$,
  array[19::bigint],
  'RLS is enabled on every exposed Phase 0 table'
);

select results_eq(
  $$
    select count(*)::bigint
    from pg_policies
    where schemaname = 'public'
      and roles @> array['authenticated']::name[]
  $$,
  array[23::bigint],
  'authenticated policies are explicit and reviewable'
);

select * from finish();
rollback;
