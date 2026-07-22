begin;
select plan(19);

select has_table('public', 'profiles');
select has_table('public', 'households');
select has_table('public', 'household_members');
select has_table('public', 'storage_locations');
select has_table('public', 'ingredient_master');
select has_table('public', 'ingredient_aliases');
select has_table('public', 'ingredient_substitutions');
select has_table('public', 'inventory_items');
select has_table('public', 'inventory_history');
select has_table('public', 'ingredient_images');
select has_table('public', 'image_analyses');
select has_table('public', 'image_analysis_candidates');
select has_table('public', 'recipes');
select has_table('public', 'recipe_ingredients');
select has_table('public', 'favorite_recipes');
select has_table('public', 'cooking_history');
select has_table('public', 'shopping_list_items');
select has_table('public', 'notifications');
select has_table('public', 'user_preferences');

select * from finish();
rollback;

