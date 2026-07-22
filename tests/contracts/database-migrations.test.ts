import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

const migrationDirectory = join(process.cwd(), 'supabase/migrations');
const migrationFiles = [
  '202607220001_extensions_enums.sql',
  '202607220002_accounts_households.sql',
  '202607220003_ingredients_inventory.sql',
  '202607220004_image_analysis.sql',
  '202607220005_recipes_cooking.sql',
  '202607220006_shopping_notifications.sql',
  '202607220007_triggers_indexes.sql',
  '202607220008_rls_storage_policies.sql',
];

function migrationSource(): string {
  return migrationFiles
    .map((file) => readFileSync(join(migrationDirectory, file), 'utf8'))
    .join('\n')
    .toLowerCase();
}

describe('database migration contract', () => {
  it('installs the database extensions required by search, IDs, and pgTAP', () => {
    const sql = migrationSource();

    expect(sql).toContain('create extension if not exists pg_trgm');
    expect(sql).toContain('create extension if not exists pgcrypto');
    expect(sql).toContain('create extension if not exists pgtap');
  });

  it('creates every Phase 0 public table', () => {
    const sql = migrationSource();
    const tables = [
      'profiles',
      'households',
      'household_members',
      'storage_locations',
      'ingredient_master',
      'ingredient_aliases',
      'ingredient_substitutions',
      'inventory_items',
      'inventory_history',
      'ingredient_images',
      'image_analyses',
      'image_analysis_candidates',
      'recipes',
      'recipe_ingredients',
      'favorite_recipes',
      'cooking_history',
      'shopping_list_items',
      'notifications',
      'user_preferences',
    ];

    for (const table of tables) {
      expect(sql).toContain(`create table public.${table}`);
    }
  });

  it('enables RLS on every exposed public table', () => {
    const sql = migrationSource();
    const tables = [
      'profiles',
      'households',
      'household_members',
      'storage_locations',
      'ingredient_master',
      'ingredient_aliases',
      'ingredient_substitutions',
      'inventory_items',
      'inventory_history',
      'ingredient_images',
      'image_analyses',
      'image_analysis_candidates',
      'recipes',
      'recipe_ingredients',
      'favorite_recipes',
      'cooking_history',
      'shopping_list_items',
      'notifications',
      'user_preferences',
    ];

    for (const table of tables) {
      expect(sql).toContain(`alter table public.${table} enable row level security`);
    }
  });

  it('locks inventory quantity changes behind an audit trigger', () => {
    const sql = migrationSource();

    expect(sql).toContain('function private.record_inventory_history');
    expect(sql).toContain('trigger inventory_items_history');
    expect(sql).toContain('quantity_before');
    expect(sql).toContain('level_before');
  });

  it('uses explicit authenticated roles and row ownership predicates', () => {
    const sql = migrationSource();

    expect(sql).toContain('to authenticated');
    expect(sql).toContain('(select auth.uid())');
    expect(sql).toContain('private.is_household_member');
    expect(sql).not.toContain('auth.role()');
  });

  it('keeps the image bucket private and restricts accepted media types', () => {
    const sql = migrationSource();

    expect(sql).toContain("'ingredient-images'");
    expect(sql).toContain("public = false");
    expect(sql).toContain("image/jpeg");
    expect(sql).toContain("image/png");
    expect(sql).toContain("image/webp");
  });
});
