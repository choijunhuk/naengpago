create schema if not exists extensions;
create schema if not exists private;

revoke all on schema private from public;
grant usage on schema private to authenticated;

create extension if not exists pg_trgm with schema extensions;
create extension if not exists pgcrypto with schema extensions;
create extension if not exists pgtap with schema extensions;

create type public.household_role as enum ('OWNER', 'MEMBER');
create type public.storage_location_type as enum ('FRIDGE', 'FREEZER', 'KIMCHI', 'PANTRY', 'CUSTOM');
create type public.ingredient_category as enum (
  'VEGETABLE', 'FRUIT', 'MEAT', 'SEAFOOD', 'EGG_DAIRY', 'GRAIN', 'NOODLE',
  'SEASONING', 'SAUCE', 'BEVERAGE', 'PROCESSED', 'FROZEN', 'BAKERY', 'OTHER'
);
create type public.quantity_type as enum ('COUNTABLE', 'LEVEL', 'MEASURABLE');
create type public.remaining_level as enum ('FULL', 'HIGH', 'MEDIUM', 'LOW', 'ALMOST_EMPTY', 'EMPTY');
create type public.expiration_type as enum ('USE_BY', 'BEST_BY', 'UNKNOWN');
create type public.registered_via as enum ('IMAGE_AI', 'MANUAL', 'BARCODE', 'RECEIPT_OCR', 'RECIPE_USAGE', 'IMPORTED');
create type public.inventory_change_type as enum ('CREATE', 'UPDATE', 'CONSUME', 'DISCARD', 'RESTORE');
create type public.alias_source as enum ('SYSTEM', 'USER', 'AI_LEARNED');
create type public.analysis_status as enum ('PENDING', 'PROCESSING', 'DONE', 'FAILED');
create type public.ai_mode as enum ('MOCK', 'LIVE');
create type public.candidate_user_action as enum ('PENDING', 'CONFIRMED', 'EDITED', 'DELETED', 'MERGED_ADD', 'MERGED_REPLACE');
create type public.recipe_difficulty as enum ('EASY', 'NORMAL', 'HARD');
create type public.deduction_mode as enum ('AUTO', 'CONFIRMED', 'MANUAL', 'SKIPPED');
create type public.shopping_status as enum ('PENDING', 'PURCHASED');
create type public.shopping_source as enum ('RECIPE', 'MANUAL', 'LOW_STOCK');
create type public.notification_type as enum ('EXPIRY_SOON', 'EXPIRED', 'LOW_STOCK', 'STALE_ITEM', 'SHOPPING_SHARED', 'RECIPE_SUGGEST');
create type public.skill_level as enum ('BEGINNER', 'INTERMEDIATE', 'ADVANCED');
create type public.dark_mode as enum ('SYSTEM', 'LIGHT', 'DARK');
