import type { IngredientCategory } from '../types/domain';

/**
 * Single source of truth for the decorative emoji shown next to a food
 * category. Every {@link IngredientCategory} member must have an entry so new
 * categories surface a sensible glyph instead of falling back to a bowl.
 */
const CATEGORY_EMOJI: Record<IngredientCategory, string> = {
  VEGETABLE: '🥬',
  FRUIT: '🍎',
  MEAT: '🥩',
  SEAFOOD: '🐟',
  EGG_DAIRY: '🥚',
  GRAIN: '🌾',
  NOODLE: '🍜',
  SEASONING: '🧂',
  SAUCE: '🥫',
  BEVERAGE: '🥤',
  PROCESSED: '🥓',
  FROZEN: '🧊',
  BAKERY: '🍞',
  OTHER: '🥣',
};

export function categoryEmoji(category: IngredientCategory): string {
  return CATEGORY_EMOJI[category] ?? CATEGORY_EMOJI.OTHER;
}
