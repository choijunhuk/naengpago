import { router, useLocalSearchParams } from 'expo-router';
import { Alert, Text, View } from 'react-native';

import { ExpiryBadge } from '../../src/components/inventory/expiry-badge';
import { QuantityEditor } from '../../src/components/inventory/quantity-editor';
import { AppScreen } from '../../src/components/ui/app-screen';
import { Badge } from '../../src/components/ui/badge';
import { Button } from '../../src/components/ui/button';
import { Card } from '../../src/components/ui/card';
import { StateView } from '../../src/components/ui/state-view';
import { useAppStore } from '../../src/stores/app-store';

export default function InventoryDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const item = useAppStore((state) => state.inventory.find((entry) => entry.id === id));
  const locations = useAppStore((state) => state.storageLocations);
  const update = useAppStore((state) => state.updateInventory);
  const consume = useAppStore((state) => state.consumeInventory);
  const remove = useAppStore((state) => state.deleteInventory);
  if (!item) return <AppScreen title="식재료 상세"><StateView state="error" errorMessage="삭제됐거나 찾을 수 없는 재료예요." onRetry={() => router.back()}><View /></StateView></AppScreen>;
  const location = locations.find((entry) => entry.id === item.storageLocationId);
  return (
    <AppScreen title={item.displayName} subtitle={`${location?.name ?? '위치 미지정'} · ${item.registeredVia === 'IMAGE_AI' ? '사진 AI 등록' : '직접 등록'}`} testID="inventory-detail-screen">
      <Card className="items-center gap-4 py-7">
        <Text className="text-6xl">{item.category === 'VEGETABLE' ? '🥬' : item.category === 'EGG_DAIRY' ? '🥚' : item.category === 'MEAT' ? '🥩' : '🥣'}</Text>
        <ExpiryBadge expirationDate={item.expirationDate} />
        {item.aiConfidence !== null ? <Badge label={`AI 신뢰도 ${Math.round(item.aiConfidence * 100)}%`} /> : null}
      </Card>
      <Card className="gap-4">
        <QuantityEditor quantityType={item.quantityType} quantity={item.quantity} unit={item.unit} remainingLevel={item.remainingLevel} onQuantityChange={(quantity) => update(item.id, { quantity })} onLevelChange={(remainingLevel) => update(item.id, { remainingLevel })} />
        <Button label="한 번 사용했어요" onPress={() => { consume(item.id, 1); Alert.alert('재고에 반영했어요', '변경 이력이 기록될 준비가 되어 있어요.'); }} />
      </Card>
      <Card className="gap-3">
        <Text className="font-sans text-lg font-semibold text-ink-light dark:text-ink-dark">변경 이력</Text>
        <View className="border-l-2 border-line-light pl-4 dark:border-line-dark"><Text className="font-sans text-sm font-semibold text-ink-light dark:text-ink-dark">현재 수량으로 수정됨</Text><Text className="font-sans text-xs text-muted-light dark:text-muted-dark">이 기기 · 방금 전</Text></View>
        <View className="border-l-2 border-primary-light pl-4 dark:border-primary-dark"><Text className="font-sans text-sm font-semibold text-ink-light dark:text-ink-dark">재고에 등록됨</Text><Text className="font-sans text-xs text-muted-light dark:text-muted-dark">{item.createdAt.slice(0, 10)}</Text></View>
      </Card>
      <Button label="재료 삭제" variant="danger" onPress={() => Alert.alert('재료를 삭제할까요?', '재고 목록에서는 사라지지만 실제 서버에서는 이력을 위해 soft delete해요.', [{ text: '취소' }, { text: '삭제', style: 'destructive', onPress: () => { remove(item.id); router.replace('/(tabs)/inventory'); } }])} />
    </AppScreen>
  );
}

