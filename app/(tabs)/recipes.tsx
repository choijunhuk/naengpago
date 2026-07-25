import { useState } from 'react';
import { Text, Pressable, View } from 'react-native';

import { RecipeCard } from '../../src/components/recipes/recipe-card';
import { AppScreen } from '../../src/components/ui/app-screen';
import { StateView } from '../../src/components/ui/state-view';
import { type RecommendationMode } from '../../src/domain/recommendation';
import { useRecommendations } from '../../src/features/data/recipes';

const modes: Array<{ value: RecommendationMode; label: string }> = [
  { value: 'NOW', label: '지금 가능' },
  { value: 'ALMOST', label: '1~2개만 사면' },
  { value: 'EXPIRING', label: '임박 활용' },
  { value: 'QUICK', label: '20분 컷' },
];

export default function RecipesScreen() {
  const [mode, setMode] = useState<RecommendationMode>('NOW');
  const recommendations = useRecommendations(mode);
  const ranked = recommendations.data ?? [];
  const listState = recommendations.isLoading ? 'loading' : recommendations.isError ? 'error' : ranked.length ? 'ready' : 'empty';

  return (
    <AppScreen title="요리 추천" subtitle="지금 있는 재료와 먼저 먹을 재료를 함께 봤어요." testID="recipes-screen">
      <View className="flex-row flex-wrap gap-2">
        {modes.map((entry) => (
          <Pressable key={entry.value} accessibilityRole="button" accessibilityState={{ selected: mode === entry.value }} accessibilityLabel={entry.label} className={`min-h-11 justify-center rounded-full border px-4 ${mode === entry.value ? 'border-primary-light bg-primary-light dark:border-primary-dark dark:bg-primary-dark' : 'border-line-light bg-surface-light dark:border-line-dark dark:bg-surface-dark'}`} onPress={() => setMode(entry.value)}>
            <Text className={`font-sans text-sm ${mode === entry.value ? 'font-semibold text-white dark:text-app-dark' : 'text-muted-light dark:text-muted-dark'}`}>{entry.label}</Text>
          </Pressable>
        ))}
      </View>
      <StateView state={listState} emptyTitle="이 조건의 요리를 찾지 못했어요" emptyBody="다른 추천 탭을 눌러보거나 재고를 조금 더 등록해보세요." errorMessage="추천을 불러오지 못했어요. 잠시 후 다시 시도해주세요." onRetry={recommendations.refetch}>
        <View className="gap-4">{ranked.map((entry) => <RecipeCard key={entry.recipe.id} entry={entry} />)}</View>
      </StateView>
    </AppScreen>
  );
}

