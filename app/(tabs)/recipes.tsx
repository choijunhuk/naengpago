import { useMemo, useState } from 'react';
import { Text, Pressable, View } from 'react-native';

import { RecipeCard } from '../../src/components/recipes/recipe-card';
import { AppScreen } from '../../src/components/ui/app-screen';
import { StateView } from '../../src/components/ui/state-view';
import { mockRecipes } from '../../src/domain/mock-data';
import { rankRecipes, type RecommendationMode } from '../../src/domain/recommendation';
import { useAppStore } from '../../src/stores/app-store';

const modes: Array<{ value: RecommendationMode; label: string }> = [
  { value: 'NOW', label: '지금 가능' },
  { value: 'ALMOST', label: '1~2개만 사면' },
  { value: 'EXPIRING', label: '임박 활용' },
  { value: 'QUICK', label: '20분 컷' },
];

export default function RecipesScreen() {
  const [mode, setMode] = useState<RecommendationMode>('NOW');
  const inventory = useAppStore((state) => state.inventory);
  const likedTags = useAppStore((state) => state.likedTags);
  const ownedTools = useAppStore((state) => state.ownedTools);
  const favoriteRecipeIds = useAppStore((state) => state.favoriteRecipeIds);
  const ranked = useMemo(() => rankRecipes(mockRecipes, inventory, {
    mode, likedTags, ownedTools, favoriteRecipeIds, dislikedMasterIds: [], allergyMasterIds: [],
  }), [favoriteRecipeIds, inventory, likedTags, mode, ownedTools]);

  return (
    <AppScreen title="요리 추천" subtitle="지금 있는 재료와 먼저 먹을 재료를 함께 봤어요." testID="recipes-screen">
      <View className="flex-row flex-wrap gap-2">
        {modes.map((entry) => (
          <Pressable key={entry.value} className={`min-h-11 justify-center rounded-full border px-4 ${mode === entry.value ? 'border-primary-light bg-primary-light dark:border-primary-dark dark:bg-primary-dark' : 'border-line-light bg-surface-light dark:border-line-dark dark:bg-surface-dark'}`} onPress={() => setMode(entry.value)}>
            <Text className={`font-sans text-sm ${mode === entry.value ? 'font-semibold text-white dark:text-app-dark' : 'text-muted-light dark:text-muted-dark'}`}>{entry.label}</Text>
          </Pressable>
        ))}
      </View>
      <StateView state={ranked.length ? 'ready' : 'empty'} emptyTitle="이 조건의 요리를 찾지 못했어요" emptyBody="다른 추천 탭을 눌러보거나 재고를 조금 더 등록해보세요.">
        <View className="gap-4">{ranked.map((entry) => <RecipeCard key={entry.recipe.id} entry={entry} />)}</View>
      </StateView>
    </AppScreen>
  );
}

