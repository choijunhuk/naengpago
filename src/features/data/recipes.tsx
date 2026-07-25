import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { decreaseLevel } from '../../domain/inventory';
import { mockRecipes } from '../../domain/mock-data';
import type { InventoryItem, Recipe } from '../../domain/models';
import { rankRecipes, type RankedRecipe, type RecommendationMode } from '../../domain/recommendation';
import { useAppStore } from '../../stores/app-store';
import { useHouseholdQuery } from './household';
import { isLiveData, mockResult, queryKeys, requireClient, type QueryResult } from './internal';
import { mapRankedRecipeRow, mapRecipeRow, type RankedRecipeRow, type RecipeRow } from './mappers';

async function fetchRecommendations(mode: RecommendationMode): Promise<RankedRecipe[]> {
  const db = requireClient();
  const { data, error } = await db.functions.invoke<{ recipes: RankedRecipeRow[] }>('recommend-recipes', {
    body: { mode },
  });
  if (error || !data) throw error ?? new Error('추천을 불러오지 못했어요.');
  return data.recipes.map(mapRankedRecipeRow);
}

function useMockRankedRecipes(mode: RecommendationMode): RankedRecipe[] {
  const inventory = useAppStore((state) => state.inventory);
  const likedTags = useAppStore((state) => state.likedTags);
  const ownedTools = useAppStore((state) => state.ownedTools);
  const favoriteRecipeIds = useAppStore((state) => state.favoriteRecipeIds);
  return rankRecipes(mockRecipes, inventory, {
    mode,
    likedTags,
    ownedTools,
    favoriteRecipeIds,
    dislikedMasterIds: [],
    allergyMasterIds: [],
  });
}

export function useRecommendations(mode: RecommendationMode): QueryResult<RankedRecipe[]> {
  const mockRanked = useMockRankedRecipes(mode);
  const household = useHouseholdQuery();
  const householdId = household.data?.householdId;
  const query = useQuery({
    queryKey: queryKeys.recommendations(householdId ?? 'unknown', mode),
    queryFn: () => fetchRecommendations(mode),
    enabled: isLiveData && Boolean(householdId),
  });
  if (!isLiveData) return mockResult(mockRanked);
  return {
    data: query.data,
    isLoading: query.isLoading || household.isLoading,
    isError: query.isError || household.isError,
    error: query.error ?? household.error,
    refetch: query.refetch,
  };
}

/** 홈 화면 대표 추천: 임박 우선, 없으면 지금 가능. */
export function useTopRecommendation(): QueryResult<RankedRecipe | undefined> {
  const expiring = useRecommendations('EXPIRING');
  const now = useRecommendations('NOW');
  return {
    data: expiring.data?.[0] ?? now.data?.[0],
    isLoading: expiring.isLoading || now.isLoading,
    isError: expiring.isError && now.isError,
    error: expiring.error ?? now.error,
    refetch: () => {
      expiring.refetch();
      now.refetch();
    },
  };
}

async function fetchRecipe(id: string): Promise<Recipe> {
  const db = requireClient();
  const { data, error } = await db
    .from('recipes')
    .select('*, recipe_ingredients(*)')
    .eq('id', id)
    .single();
  if (error) throw error;
  return mapRecipeRow(data as RecipeRow);
}

export function useRecipeDetail(id: string | undefined): QueryResult<Recipe | undefined> {
  const mockRecipe = mockRecipes.find((entry) => entry.id === id);
  const query = useQuery({
    queryKey: queryKeys.recipe(id ?? 'unknown'),
    queryFn: () => fetchRecipe(id as string),
    enabled: isLiveData && Boolean(id),
  });
  if (!isLiveData) return mockResult(mockRecipe);
  return {
    data: query.data,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
}

interface DeductionPayload {
  itemId: string;
  quantityDelta?: number;
  levelTo?: string;
  expectedUpdatedAt?: string;
}

function buildDeductions(recipe: Recipe, inventory: InventoryItem[]): DeductionPayload[] {
  return recipe.ingredients
    .filter((ingredient) => !ingredient.optional)
    .flatMap((ingredient): DeductionPayload[] => {
      const item = inventory.find(
        (entry) =>
          entry.masterId === ingredient.masterId ||
          ingredient.substituteMasterIds?.includes(entry.masterId ?? ''),
      );
      if (!item) return [];
      if (item.quantityType === 'LEVEL') {
        return [{ itemId: item.id, levelTo: decreaseLevel(item.remainingLevel ?? 'FULL'), expectedUpdatedAt: item.updatedAt }];
      }
      return [{ itemId: item.id, quantityDelta: ingredient.quantity ?? 1, expectedUpdatedAt: item.updatedAt }];
    });
}

export function useCookRecipe() {
  const storeComplete = useAppStore((state) => state.completeCooking);
  const household = useHouseholdQuery();
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: async ({ recipe, inventory }: { recipe: Recipe; inventory: InventoryItem[] }) => {
      const db = requireClient();
      const householdId = household.data?.householdId;
      if (!householdId) throw new Error('household를 찾을 수 없어요.');
      const deductions = buildDeductions(recipe, inventory);
      if (deductions.length === 0) return;
      const { error } = await db.functions.invoke('deduct-inventory', {
        body: { householdId, recipeId: recipe.id, deductions, mode: 'CONFIRMED', note: null },
      });
      if (error) throw error;
    },
    onSuccess: () => {
      const householdId = household.data?.householdId;
      if (householdId) void queryClient.invalidateQueries({ queryKey: queryKeys.inventory(householdId) });
    },
  });
  return {
    cookRecipe: (recipe: Recipe, inventory: InventoryItem[]): Promise<void> =>
      isLiveData ? mutation.mutateAsync({ recipe, inventory }) : Promise.resolve(storeComplete(recipe.id)),
    isPending: mutation.isPending,
  };
}
