import { router, useLocalSearchParams } from 'expo-router';
import { Image } from 'expo-image';
import { Heart, ShoppingBasket } from 'lucide-react-native';
import { Pressable, Text, View } from 'react-native';

import { AppScreen } from '../../src/components/ui/app-screen';
import { Badge } from '../../src/components/ui/badge';
import { Button } from '../../src/components/ui/button';
import { Card } from '../../src/components/ui/card';
import { StateView } from '../../src/components/ui/state-view';
import { mockRecipes } from '../../src/domain/mock-data';
import { rankRecipes, type RankedRecipe, type RecommendationMode } from '../../src/domain/recommendation';
import { useAppStore } from '../../src/stores/app-store';

function findMatch(id: string, inventory: ReturnType<typeof useAppStore.getState>['inventory'], likedTags: string[], ownedTools: string[], favoriteRecipeIds: string[]): RankedRecipe | undefined {
  const modes: RecommendationMode[] = ['NOW', 'ALMOST', 'EXPIRING', 'QUICK'];
  return modes.flatMap((mode) => rankRecipes(mockRecipes, inventory, { mode, likedTags, ownedTools, favoriteRecipeIds, dislikedMasterIds: [], allergyMasterIds: [] })).find((entry) => entry.recipe.id === id);
}

export default function RecipeDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const inventory = useAppStore((state) => state.inventory);
  const likedTags = useAppStore((state) => state.likedTags);
  const ownedTools = useAppStore((state) => state.ownedTools);
  const favorites = useAppStore((state) => state.favoriteRecipeIds);
  const toggleFavorite = useAppStore((state) => state.toggleFavorite);
  const addShoppingItem = useAppStore((state) => state.addShoppingItem);
  const recipe = mockRecipes.find((entry) => entry.id === id);
  const match = recipe ? findMatch(recipe.id, inventory, likedTags, ownedTools, favorites) : undefined;
  if (!recipe) return <AppScreen title="레시피"><StateView state="error" errorMessage="레시피를 찾을 수 없어요." onRetry={() => router.back()}><View /></StateView></AppScreen>;
  const ownedMasters = new Set(inventory.map((item) => item.masterId));
  return (
    <AppScreen title={recipe.name} subtitle={`${recipe.cookTimeMin}분 · ${recipe.servings}인분 · ${recipe.calories ?? '-'}kcal`} action={<Pressable className="h-11 w-11 items-center justify-center rounded-full border border-line-light dark:border-line-dark" onPress={() => toggleFavorite(recipe.id)} accessibilityLabel="즐겨찾기"><Heart color={favorites.includes(recipe.id) ? '#EF4444' : '#78716C'} fill={favorites.includes(recipe.id) ? '#EF4444' : 'transparent'} size={20} strokeWidth={1.5} /></Pressable>} testID="recipe-detail-screen">
      <Image source={recipe.imageUrl} className="h-60 w-full rounded-card" contentFit="cover" transition={200} />
      {match ? <Card><Text className="font-sans text-sm leading-5 text-muted-light dark:text-muted-dark">{match.reason}</Text></Card> : null}
      <View className="gap-3"><Text className="font-sans text-lg font-semibold text-ink-light dark:text-ink-dark">필요한 재료</Text>{recipe.ingredients.map((ingredient) => {
        const exact = ownedMasters.has(ingredient.masterId);
        const substitute = inventory.find((item) => ingredient.substituteMasterIds?.includes(item.masterId ?? ''));
        const status = exact ? '보유' : substitute ? `${substitute.displayName}로 대체` : ingredient.optional ? '선택' : '부족';
        return <Card key={ingredient.masterId} className="flex-row items-center gap-3 py-3"><Badge label={status} tone={exact ? 'success' : substitute ? 'warning' : status === '부족' ? 'danger' : 'neutral'} /><View className="flex-1"><Text className="font-sans text-[15px] font-semibold text-ink-light dark:text-ink-dark">{ingredient.name}</Text><Text className="font-sans text-xs text-muted-light dark:text-muted-dark">{ingredient.quantity ?? ''} {ingredient.unit ?? ''}</Text></View>{status === '부족' ? <Pressable className="h-11 w-11 items-center justify-center rounded-full" onPress={() => addShoppingItem({ masterId: ingredient.masterId, name: ingredient.name, quantity: ingredient.quantity, unit: ingredient.unit, category: 'OTHER', source: 'RECIPE', sourceRecipeId: recipe.id, sourceLabel: recipe.name })} accessibilityLabel={`${ingredient.name} 장보기에 추가`}><ShoppingBasket color="#16A34A" size={20} strokeWidth={1.5} /></Pressable> : null}</Card>;
      })}</View>
      <View className="gap-3"><Text className="font-sans text-lg font-semibold text-ink-light dark:text-ink-dark">조리 순서</Text>{recipe.steps.map((step, index) => <View key={step} className="flex-row gap-3"><View className="h-7 w-7 items-center justify-center rounded-full bg-primary-light dark:bg-primary-dark"><Text className="font-sans text-xs font-bold text-white dark:text-app-dark">{index + 1}</Text></View><Text className="flex-1 font-sans text-[15px] leading-6 text-ink-light dark:text-ink-dark">{step}</Text></View>)}</View>
      <Button label="조리 시작" onPress={() => router.push(`/recipes/cook/${recipe.id}`)} testID="cook-start" />
    </AppScreen>
  );
}

