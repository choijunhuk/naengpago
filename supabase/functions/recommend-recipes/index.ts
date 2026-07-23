import { z } from 'npm:zod@4.4.3';

import { authenticateRequest } from '../_shared/auth.ts';
import { apiError, corsHeaders, json } from '../_shared/http.ts';

const requestSchema = z.object({
  mode: z.enum(['NOW', 'ALMOST', 'EXPIRING', 'QUICK']),
  filters: z.object({
    difficulty: z.array(z.enum(['EASY', 'NORMAL', 'HARD'])).optional(),
    maxCookTimeMin: z.number().int().positive().max(240).optional(),
  }).optional(),
  cursor: z.string().regex(/^\d+$/u).optional(),
});

type InventoryRow = {
  id: string;
  master_id: string | null;
  display_name: string;
  quantity_type: string;
  quantity: number | null;
  remaining_level: string | null;
  expiration_date: string | null;
};

function dday(date: string | null): number | null {
  if (!date) return null;
  const now = new Date();
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  return Math.round((Date.parse(`${date}T00:00:00Z`) - today) / 86_400_000);
}

export default {
  async fetch(request: Request) {
    if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
    if (request.method !== 'POST') return apiError('METHOD_NOT_ALLOWED', 'POST 요청만 지원해요.', 405);
    const auth = await authenticateRequest(request);
    if (!auth) return apiError('UNAUTHORIZED', '로그인이 필요해요.', 401);

    const body = requestSchema.safeParse(await request.json().catch(() => null));
    if (!body.success) return apiError('REQUEST_INVALID', '추천 조건을 다시 확인해 주세요.', 400, body.error.flatten());

    const { data: membership } = await auth.client
      .from('household_members')
      .select('household_id')
      .limit(1)
      .maybeSingle();
    if (!membership) return apiError('HOUSEHOLD_REQUIRED', '참여 중인 household가 필요해요.', 403);

    const [
      inventoryResult,
      recipesResult,
      ingredientsResult,
      mastersResult,
      substitutionsResult,
      preferencesResult,
      favoritesResult,
    ] = await Promise.all([
      auth.client.from('inventory_items')
        .select('id, master_id, display_name, quantity_type, quantity, remaining_level, expiration_date')
        .eq('household_id', membership.household_id).is('deleted_at', null),
      auth.client.from('recipes').select('*').eq('is_active', true),
      auth.client.from('recipe_ingredients').select('*'),
      auth.client.from('ingredient_master').select('id, parent_id'),
      auth.client.from('ingredient_substitutions').select('from_master_id, to_master_id, bidirectional'),
      auth.client.from('user_preferences').select('*').eq('user_id', auth.userId).maybeSingle(),
      auth.client.from('favorite_recipes').select('recipe_id').eq('user_id', auth.userId),
    ]);
    const failure = [
      inventoryResult.error, recipesResult.error, ingredientsResult.error, mastersResult.error,
      substitutionsResult.error, preferencesResult.error, favoritesResult.error,
    ].find(Boolean);
    if (failure) return apiError('RECOMMENDATION_QUERY_FAILED', '추천 정보를 불러오지 못했어요.', 500);

    const preferences = preferencesResult.data ?? {
      liked_tags: [], disliked_master_ids: [], allergy_master_ids: [], owned_tools: [],
    };
    const disliked = new Set<string>(preferences.disliked_master_ids ?? []);
    const allergies = new Set<string>(preferences.allergy_master_ids ?? []);
    const tools = new Set<string>(preferences.owned_tools ?? []);
    const favorites = new Set<string>((favoritesResult.data ?? []).map((item) => item.recipe_id));
    const parents = new Map<string, string | null>((mastersResult.data ?? []).map((item) => [item.id, item.parent_id]));
    const substitutes = new Map<string, Set<string>>();
    for (const relation of substitutionsResult.data ?? []) {
      const direct = substitutes.get(relation.from_master_id) ?? new Set<string>();
      direct.add(relation.to_master_id);
      substitutes.set(relation.from_master_id, direct);
      if (relation.bidirectional) {
        const reverse = substitutes.get(relation.to_master_id) ?? new Set<string>();
        reverse.add(relation.from_master_id);
        substitutes.set(relation.to_master_id, reverse);
      }
    }
    const inventory = (inventoryResult.data as InventoryRow[]).filter((item) =>
      item.quantity_type === 'LEVEL' ? item.remaining_level !== 'EMPTY' : Number(item.quantity ?? 0) > 0
    );
    const ingredientsByRecipe = new Map<string, typeof ingredientsResult.data>();
    for (const ingredient of ingredientsResult.data ?? []) {
      const values = ingredientsByRecipe.get(ingredient.recipe_id) ?? [];
      values.push(ingredient);
      ingredientsByRecipe.set(ingredient.recipe_id, values);
    }

    const ranked = (recipesResult.data ?? []).flatMap((recipe) => {
      if (!(recipe.required_tools ?? []).every((tool: string) => tools.has(tool))) return [];
      if (body.data.filters?.difficulty && !body.data.filters.difficulty.includes(recipe.difficulty)) return [];
      if (body.data.filters?.maxCookTimeMin && recipe.cook_time_min > body.data.filters.maxCookTimeMin) return [];

      const ingredients = ingredientsByRecipe.get(recipe.id) ?? [];
      if (ingredients.some((item) => disliked.has(item.master_id) || allergies.has(item.master_id))) return [];
      const required = ingredients.filter((item) => !item.is_optional);
      const missing: Array<{ masterId: string; name: string }> = [];
      const substitutionMatches: Array<{ requiredName: string; ownedName: string }> = [];
      const matched: InventoryRow[] = [];

      for (const ingredient of required) {
        const exact = inventory.find((item) => {
          if (item.master_id === ingredient.master_id) return true;
          let ancestor = item.master_id ? parents.get(item.master_id) : null;
          while (ancestor) {
            if (ancestor === ingredient.master_id) return true;
            ancestor = parents.get(ancestor) ?? null;
          }
          return false;
        });
        if (exact) {
          matched.push(exact);
          continue;
        }
        const substitute = inventory.find((item) =>
          item.master_id && substitutes.get(ingredient.master_id)?.has(item.master_id)
        );
        if (substitute) {
          matched.push(substitute);
          substitutionMatches.push({ requiredName: ingredient.name_text, ownedName: substitute.display_name });
        } else {
          missing.push({ masterId: ingredient.master_id, name: ingredient.name_text });
        }
      }

      const expiring = matched.filter((item) => {
        const days = dday(item.expiration_date);
        return days !== null && days >= 0 && days <= 3;
      });
      const ownedRatio = required.length === 0 ? 1 : matched.length / required.length;
      const preferenceMatch = (recipe.tags ?? []).some((tag: string) => preferences.liked_tags?.includes(tag)) ? 1 : 0;
      const score = 0.45 * ownedRatio
        + Math.min(expiring.length * 0.1, 0.25)
        + 0.15 * preferenceMatch
        + (recipe.cook_time_min <= 20 ? 0.1 : 0)
        + (favorites.has(recipe.id) ? 0.05 : 0);
      const modeMatch = body.data.mode === 'NOW' ? missing.length === 0
        : body.data.mode === 'ALMOST' ? missing.length >= 1 && missing.length <= 2
          : body.data.mode === 'EXPIRING' ? expiring.length > 0
            : recipe.cook_time_min <= 20;
      if (!modeMatch) return [];

      return [{
        ...recipe,
        score,
        ownedCount: matched.length,
        requiredCount: required.length,
        missing,
        substitutions: substitutionMatches,
        reason: expiring[0]
          ? `${expiring[0].display_name} 유통기한이 얼마 남지 않아 우선 추천해요.`
          : missing.length === 0 ? '지금 있는 재료만으로 만들 수 있어요.'
            : `${missing.length}가지만 더 있으면 만들 수 있어요.`,
      }];
    }).sort((left, right) => right.score - left.score || left.cook_time_min - right.cook_time_min);

    const offset = Number(body.data.cursor ?? 0);
    const pageSize = 20;
    const page = ranked.slice(offset, offset + pageSize);
    return json({
      recipes: page,
      nextCursor: offset + pageSize < ranked.length ? String(offset + pageSize) : null,
    });
  },
};
