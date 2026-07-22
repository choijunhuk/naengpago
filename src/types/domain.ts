import { z } from 'zod';

export const IngredientCategorySchema = z.enum([
  'VEGETABLE',
  'FRUIT',
  'MEAT',
  'SEAFOOD',
  'EGG_DAIRY',
  'GRAIN',
  'NOODLE',
  'SEASONING',
  'SAUCE',
  'BEVERAGE',
  'PROCESSED',
  'FROZEN',
  'BAKERY',
  'OTHER',
]);

export const QuantityTypeSchema = z.enum([
  'COUNTABLE',
  'LEVEL',
  'MEASURABLE',
]);

export const RemainingLevelSchema = z.enum([
  'FULL',
  'HIGH',
  'MEDIUM',
  'LOW',
  'ALMOST_EMPTY',
  'EMPTY',
]);

export type IngredientCategory = z.infer<typeof IngredientCategorySchema>;
export type QuantityType = z.infer<typeof QuantityTypeSchema>;
export type RemainingLevel = z.infer<typeof RemainingLevelSchema>;

