import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

const migrationDirectory = join(process.cwd(), 'supabase/migrations');
const migrationFiles = readdirSync(migrationDirectory)
  .filter((file) => file.endsWith('.sql'))
  .sort();

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

  it('keeps multi-row workflows atomic and callable only by authenticated users', () => {
    const sql = migrationSource();
    const functions = [
      'confirm_image_analysis',
      'deduct_inventory_atomic',
      'schedule_account_deletion',
    ];

    for (const functionName of functions) {
      expect(sql).toContain(`function public.${functionName}`);
      expect(sql).toContain(`grant execute on function public.${functionName}`);
      expect(sql).toContain(`revoke all on function public.${functionName}`);
    }
    expect(sql).toContain("set search_path = ''");
    expect(sql).toContain('for update');
    expect(sql).toContain('inventory_conflict');
    expect(sql).toContain('owner_transfer_required');
  });

  it('links cooking deductions to inventory audit history', () => {
    const sql = migrationSource();

    expect(sql).toContain("current_setting('app.cooking_history_id', true)");
    expect(sql).toContain("set_config('app.cooking_history_id'");
    expect(sql).toContain('cooking_history_id');
  });

  it('blocks soft-deleted accounts at the RLS boundary before JWT expiry', () => {
    const sql = migrationSource();

    expect(sql).toContain('function private.is_active_user');
    expect(sql).toContain('profile.deleted_at is null');
    expect(sql).toContain('profiles_own_active_select');
    expect(sql).toContain('user_preferences_own_active_rows');
    expect(sql).toContain('select private.is_active_user(target_user_id)');
  });
});
