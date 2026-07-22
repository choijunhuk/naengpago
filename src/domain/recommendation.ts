import { getDday } from './inventory';
import type { InventoryItem, Recipe } from './models';

export type RecommendationMode = 'NOW' | 'ALMOST' | 'EXPIRING' | 'QUICK';

export interface RecommendationOptions {
  mode: RecommendationMode;
  now?: Date;
  likedTags: string[];
  dislikedMasterIds: string[];
  allergyMasterIds: string[];
  ownedTools: string[];
  favoriteRecipeIds: string[];
}

export interface RankedRecipe {
  recipe: Recipe;
  score: number;
  ownedCount: number;
  requiredCount: number;
  missing: string[];
  substitutions: Array<{ requiredName: string; ownedName: string }>;
  expiringIngredientNames: string[];
  reason: string;
}

export function rankRecipes(
  recipes: Recipe[],
  inventory: InventoryItem[],
  options: RecommendationOptions,
): RankedRecipe[] {
  const now = options.now ?? new Date();
  const activeInventory = inventory.filter((item) =>
    item.quantityType === 'LEVEL'
      ? item.remainingLevel !== 'EMPTY'
      : (item.quantity ?? 0) > 0,
  );

  return recipes
    .filter((recipe) => recipe.requiredTools.every((tool) => options.ownedTools.includes(tool)))
    .filter((recipe) =>
      recipe.ingredients.every(
        (ingredient) =>
          !options.allergyMasterIds.includes(ingredient.masterId) &&
          !options.dislikedMasterIds.includes(ingredient.masterId),
      ),
    )
    .map((recipe): RankedRecipe => {
      const required = recipe.ingredients.filter((ingredient) => !ingredient.optional);
      const missing: string[] = [];
      const substitutions: RankedRecipe['substitutions'] = [];
      const matched: InventoryItem[] = [];

      for (const ingredient of required) {
        const exact = activeInventory.find((item) => item.masterId === ingredient.masterId);
        if (exact) {
          matched.push(exact);
          continue;
        }
        const substitute = activeInventory.find((item) =>
          ingredient.substituteMasterIds?.includes(item.masterId ?? ''),
        );
        if (substitute) {
          matched.push(substitute);
          substitutions.push({ requiredName: ingredient.name, ownedName: substitute.displayName });
          continue;
        }
        missing.push(ingredient.name);
      }

      const expiring = matched.filter((item) => {
        const dday = getDday(item.expirationDate, now);
        return dday !== null && dday >= 0 && dday <= 3;
      });
      const ownedRatio = required.length === 0 ? 1 : matched.length / required.length;
      const preferenceMatch = recipe.tags.some((tag) => options.likedTags.includes(tag)) ? 1 : 0;
      const score =
        0.45 * ownedRatio +
        Math.min(expiring.length * 0.1, 0.25) +
        0.15 * preferenceMatch +
        (recipe.cookTimeMin <= 20 ? 0.1 : 0) +
        (options.favoriteRecipeIds.includes(recipe.id) ? 0.05 : 0);

      const reason = expiring[0]
        ? `${expiring[0].displayName} 유통기한이 얼마 남지 않아 우선 추천해요.`
        : missing.length === 0
          ? '지금 있는 재료만으로 만들 수 있어요.'
          : `${missing.length}가지만 더 있으면 만들 수 있어요.`;

      return {
        recipe,
        score,
        ownedCount: matched.length,
        requiredCount: required.length,
        missing,
        substitutions,
        expiringIngredientNames: expiring.map((item) => item.displayName),
        reason,
      };
    })
    .filter((entry) => {
      if (options.mode === 'NOW') return entry.missing.length === 0;
      if (options.mode === 'ALMOST') return entry.missing.length >= 1 && entry.missing.length <= 2;
      if (options.mode === 'EXPIRING') return entry.expiringIngredientNames.length > 0;
      return entry.recipe.cookTimeMin <= 20;
    })
    .sort((left, right) => right.score - left.score || left.recipe.cookTimeMin - right.recipe.cookTimeMin);
}

