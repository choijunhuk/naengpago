begin;
select plan(23);

select has_table('public'::name, 'profiles'::name);
select has_table('public'::name, 'households'::name);
select has_table('public'::name, 'household_members'::name);
select has_table('public'::name, 'storage_locations'::name);
select has_table('public'::name, 'ingredient_master'::name);
select has_table('public'::name, 'ingredient_aliases'::name);
select has_table('public'::name, 'ingredient_substitutions'::name);
select has_table('public'::name, 'inventory_items'::name);
select has_table('public'::name, 'inventory_history'::name);
select has_table('public'::name, 'ingredient_images'::name);
select has_table('public'::name, 'image_analyses'::name);
select has_table('public'::name, 'image_analysis_candidates'::name);
select has_table('public'::name, 'recipes'::name);
select has_table('public'::name, 'recipe_ingredients'::name);
select has_table('public'::name, 'favorite_recipes'::name);
select has_table('public'::name, 'cooking_history'::name);
select has_table('public'::name, 'shopping_list_items'::name);
select has_table('public'::name, 'notifications'::name);
select has_table('public'::name, 'user_preferences'::name);
select has_function('public'::name, 'confirm_image_analysis'::name);
select has_function('public'::name, 'deduct_inventory_atomic'::name);
select has_function('public'::name, 'schedule_account_deletion'::name);
select has_function('private'::name, 'is_active_user'::name);

select * from finish();
rollback;
