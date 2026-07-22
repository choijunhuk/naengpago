import { router, useLocalSearchParams } from 'expo-router';
import { CheckCircle2 } from 'lucide-react-native';
import { Alert, Text, View } from 'react-native';

import { AppScreen } from '../../../src/components/ui/app-screen';
import { Badge } from '../../../src/components/ui/badge';
import { Button } from '../../../src/components/ui/button';
import { Card } from '../../../src/components/ui/card';
import { mockRecipes } from '../../../src/domain/mock-data';
import { useAppStore } from '../../../src/stores/app-store';

export default function CompleteCookingScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const recipe = mockRecipes.find((entry) => entry.id === id);
  const inventory = useAppStore((state) => state.inventory);
  const completeCooking = useAppStore((state) => state.completeCooking);
  if (!recipe) return null;
  const deductions = recipe.ingredients.filter((ingredient) => !ingredient.optional).map((ingredient) => ({ ingredient, item: inventory.find((entry) => entry.masterId === ingredient.masterId || ingredient.substituteMasterIds?.includes(entry.masterId ?? '')) })).filter((entry) => entry.item);
  const apply = () => { completeCooking(recipe.id); Alert.alert('재고에 반영했어요', '사용한 재료의 수량과 잔여량을 줄였어요.', [{ text: '확인', onPress: () => router.replace('/(tabs)/home') }]); };
  return (
    <AppScreen title="맛있게 완성했어요" subtitle="실제로 사용한 양과 다르면 항목 상세에서 바로 조정할 수 있어요." testID="deduction-screen">
      <View className="items-center gap-3 py-4"><CheckCircle2 color="#16A34A" size={64} strokeWidth={1.5} /><Text className="font-sans text-xl font-bold text-ink-light dark:text-ink-dark">{recipe.name}</Text></View>
      <View className="gap-3">{deductions.map(({ ingredient, item }) => <Card key={ingredient.masterId} className="flex-row items-center gap-3"><View className="flex-1"><Text className="font-sans text-[15px] font-semibold text-ink-light dark:text-ink-dark">{item?.displayName}</Text><Text className="font-sans text-xs text-muted-light dark:text-muted-dark">현재 {item?.quantityType === 'LEVEL' ? item.remainingLevel : `${item?.quantity ?? 0} ${item?.unit ?? ''}`}</Text></View><Badge label={item?.quantityType === 'LEVEL' ? '한 단계 감소' : `-${ingredient.quantity ?? 1} ${ingredient.unit ?? ''}`} tone="warning" /></Card>)}</View>
      <Button label="전체 차감 적용" onPress={apply} testID="deduction-apply" />
      <Button label="차감 없이 완료" variant="ghost" onPress={() => router.replace('/(tabs)/home')} />
    </AppScreen>
  );
}

