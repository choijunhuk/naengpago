import { router, useLocalSearchParams } from 'expo-router';
import { CheckCircle2 } from 'lucide-react-native';
import { Alert, Text, View } from 'react-native';

import { AppScreen } from '../../../src/components/ui/app-screen';
import { Badge } from '../../../src/components/ui/badge';
import { Button } from '../../../src/components/ui/button';
import { Card } from '../../../src/components/ui/card';
import { useInventory } from '../../../src/features/data/inventory';
import { useCookRecipe, useRecipeDetail } from '../../../src/features/data/recipes';
import { useIconColors } from '../../../src/theme/icon-colors';

export default function CompleteCookingScreen() {
  const iconColors = useIconColors();
  const { id } = useLocalSearchParams<{ id: string }>();
  const recipe = useRecipeDetail(id).data;
  const inventory = useInventory().data ?? [];
  const { cookRecipe, isPending } = useCookRecipe();
  if (!recipe) return null;
  const deductions = recipe.ingredients.filter((ingredient) => !ingredient.optional).map((ingredient) => ({ ingredient, item: inventory.find((entry) => entry.masterId === ingredient.masterId || ingredient.substituteMasterIds?.includes(entry.masterId ?? '')) })).filter((entry) => entry.item);
  const apply = () => {
    void cookRecipe(recipe, inventory)
      .then(() => Alert.alert('재고에 반영했어요', '사용한 재료의 수량과 잔여량을 줄였어요.', [{ text: '확인', onPress: () => router.replace('/(tabs)/home') }]))
      .catch((cause) => Alert.alert('차감하지 못했어요', cause instanceof Error ? cause.message : '잠시 후 다시 시도해 주세요.'));
  };
  return (
    <AppScreen title="맛있게 완성했어요" subtitle="실제로 사용한 양과 다르면 항목 상세에서 바로 조정할 수 있어요." testID="deduction-screen">
      <View className="items-center gap-3 py-4"><CheckCircle2 color={iconColors.primary} size={64} strokeWidth={1.5} /><Text className="font-sans text-xl font-bold text-ink-light dark:text-ink-dark">{recipe.name}</Text></View>
      <View className="gap-3">{deductions.map(({ ingredient, item }) => <Card key={ingredient.masterId} className="flex-row items-center gap-3"><View className="flex-1"><Text className="font-sans text-[15px] font-semibold text-ink-light dark:text-ink-dark">{item?.displayName}</Text><Text className="font-sans text-xs text-muted-light dark:text-muted-dark">현재 {item?.quantityType === 'LEVEL' ? item.remainingLevel : `${item?.quantity ?? 0} ${item?.unit ?? ''}`}</Text></View><Badge label={item?.quantityType === 'LEVEL' ? '한 단계 감소' : `-${ingredient.quantity ?? 1} ${ingredient.unit ?? ''}`} tone="warning" /></Card>)}</View>
      <Button label="전체 차감 적용" loading={isPending} onPress={apply} testID="deduction-apply" />
      <Button label="차감 없이 완료" variant="ghost" onPress={() => router.replace('/(tabs)/home')} />
    </AppScreen>
  );
}

