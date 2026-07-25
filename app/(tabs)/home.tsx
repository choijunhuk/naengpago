import { router } from 'expo-router';
import { Bell, Camera, ChevronRight, Snowflake } from 'lucide-react-native';
import { Pressable, Text, View } from 'react-native';

import { ExpiryBadge } from '../../src/components/inventory/expiry-badge';
import { AppScreen } from '../../src/components/ui/app-screen';
import { Badge } from '../../src/components/ui/badge';
import { Button } from '../../src/components/ui/button';
import { Card } from '../../src/components/ui/card';
import { SectionHeader } from '../../src/components/ui/section-header';
import { categoryEmoji } from '../../src/domain/category-emoji';
import { getDday } from '../../src/domain/inventory';
import { useIconColors } from '../../src/theme/icon-colors';
import { useInventory } from '../../src/features/data/inventory';
import { useNotifications } from '../../src/features/data/notifications';
import { useTopRecommendation } from '../../src/features/data/recipes';
import { useStorageLocations } from '../../src/features/data/storage';
import { useAppStore } from '../../src/stores/app-store';

export default function HomeScreen() {
  const iconColors = useIconColors();
  const session = useAppStore((state) => state.session);
  const inventory = useInventory().data ?? [];
  const storageLocations = useStorageLocations().data ?? [];
  const notifications = useNotifications().data ?? [];
  const recommendation = useTopRecommendation().data;
  const unreadCount = notifications.filter((item) => !item.read).length;
  const expiring = [...inventory]
    .filter((item) => {
      const dday = getDday(item.expirationDate);
      return dday !== null && dday <= 3;
    })
    .sort((left, right) => (getDday(left.expirationDate) ?? 999) - (getDday(right.expirationDate) ?? 999));

  return (
    <AppScreen
      title={`${session?.nickname ?? '사용자'}님,\n오늘 뭐부터 먹을까요?`}
      subtitle="임박한 재료부터 가볍게 비워봐요."
      action={(
        <Pressable className="relative h-11 w-11 items-center justify-center rounded-full border border-line-light bg-surface-light dark:border-line-dark dark:bg-surface-dark" onPress={() => router.push('/notifications')} accessibilityLabel={`알림 ${unreadCount}개`}>
          <Bell color={iconColors.text} size={20} strokeWidth={1.5} />
          {unreadCount ? <View className="absolute right-1 top-1 h-2.5 w-2.5 rounded-full bg-danger" /> : null}
        </Pressable>
      )}
      testID="home-screen"
    >
      <Card className="gap-4 border-primary-light dark:border-primary-dark">
        <View className="flex-row items-center justify-between">
          <View className="gap-1">
            <Text className="font-sans text-xs font-semibold text-primary-light dark:text-primary-dark">오늘 먼저 먹을 선반</Text>
            <Text className="font-sans text-lg font-semibold text-ink-light dark:text-ink-dark">임박 재료 {expiring.length}개</Text>
          </View>
          <Snowflake color={iconColors.primary} size={24} strokeWidth={1.5} />
        </View>
        <View className="flex-row gap-3 overflow-hidden">
          {expiring.slice(0, 3).map((item) => (
            <Pressable key={item.id} className="min-w-24 flex-1 gap-2 rounded-button bg-app-light p-3 dark:bg-app-dark" onPress={() => router.push(`/inventory/${item.id}`)} accessibilityLabel={`${item.displayName} 상세`}>
              <Text className="text-2xl" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">{categoryEmoji(item.category)}</Text>
              <Text className="font-sans text-sm font-semibold text-ink-light dark:text-ink-dark" numberOfLines={1}>{item.displayName}</Text>
              <ExpiryBadge expirationDate={item.expirationDate} />
            </Pressable>
          ))}
        </View>
        <View className="h-1 rounded-full bg-line-light dark:bg-line-dark"><View className="h-1 w-2/3 rounded-full bg-primary-light dark:bg-primary-dark" /></View>
      </Card>

      <View className="gap-3">
        <SectionHeader title="저장 공간" caption="공간별 재고를 빠르게 확인해요" action={<Pressable onPress={() => router.push('/storage')}><Text className="font-sans text-sm text-primary-light dark:text-primary-dark">관리</Text></Pressable>} />
        <View className="flex-row flex-wrap gap-2">
          {storageLocations.map((location) => (
            <Pressable key={location.id} className="w-[48%] flex-row items-center justify-between rounded-card border border-line-light bg-surface-light p-4 dark:border-line-dark dark:bg-surface-dark" onPress={() => router.push({ pathname: '/(tabs)/inventory', params: { storage: location.id } })}>
              <View className="gap-1">
                <Text className="font-sans text-sm font-semibold text-ink-light dark:text-ink-dark">{location.name}</Text>
                <Text className="font-sans text-2xl font-bold text-ink-light dark:text-ink-dark">{inventory.filter((item) => item.storageLocationId === location.id).length}</Text>
              </View>
              <ChevronRight color={iconColors.muted} size={20} strokeWidth={1.5} />
            </Pressable>
          ))}
        </View>
      </View>

      {recommendation ? (
        <View className="gap-3">
          <SectionHeader title="오늘의 추천" caption="보유 재료와 임박도를 함께 계산했어요" />
          <Pressable onPress={() => router.push(`/recipes/${recommendation.recipe.id}`)}>
            <Card className="gap-3">
              <View className="flex-row items-start justify-between gap-3">
                <View className="flex-1 gap-1">
                  <Text className="font-sans text-lg font-semibold text-ink-light dark:text-ink-dark">{recommendation.recipe.name}</Text>
                  <Text className="font-sans text-sm leading-5 text-muted-light dark:text-muted-dark">{recommendation.reason}</Text>
                </View>
                <Badge label={`${recommendation.recipe.cookTimeMin}분`} tone="success" />
              </View>
              <Button label="레시피 보기" variant="secondary" onPress={() => router.push(`/recipes/${recommendation.recipe.id}`)} />
            </Card>
          </Pressable>
        </View>
      ) : null}

      <Button label="사진으로 재료 등록" icon={<Camera color={iconColors.onPrimary} size={20} strokeWidth={1.5} />} onPress={() => router.push('/capture')} testID="capture-fab" />
    </AppScreen>
  );
}

