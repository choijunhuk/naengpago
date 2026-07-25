import { useMemo, useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { Plus, Search } from 'lucide-react-native';
import { Pressable, Text, TextInput, View } from 'react-native';

import { InventoryCard } from '../../src/components/inventory/inventory-card';
import { AppScreen } from '../../src/components/ui/app-screen';
import { Button } from '../../src/components/ui/button';
import { StateView } from '../../src/components/ui/state-view';
import { useInventory } from '../../src/features/data/inventory';
import { useStorageLocations } from '../../src/features/data/storage';
import { useIconColors } from '../../src/theme/icon-colors';

export default function InventoryScreen() {
  const iconColors = useIconColors();
  const params = useLocalSearchParams<{ storage?: string }>();
  const [search, setSearch] = useState('');
  const [storageId, setStorageId] = useState<string | null>(params.storage ?? null);
  const inventoryQuery = useInventory();
  const inventory = useMemo(() => inventoryQuery.data ?? [], [inventoryQuery.data]);
  const locations = useStorageLocations().data ?? [];
  const filtered = useMemo(() => inventory
    .filter((item) => !storageId || item.storageLocationId === storageId)
    .filter((item) => item.displayName.includes(search.trim())), [inventory, search, storageId]);
  const listState = inventoryQuery.isLoading ? 'loading' : inventoryQuery.isError ? 'error' : filtered.length ? 'ready' : 'empty';

  return (
    <AppScreen
      title="보유 식재료"
      subtitle={`지금 ${inventory.length}개 재료를 관리하고 있어요.`}
      action={<Button label="추가" icon={<Plus color={iconColors.onPrimary} size={20} strokeWidth={1.5} />} fullWidth={false} onPress={() => router.push('/inventory/add')} />}
      testID="inventory-screen"
    >
      <View className="flex-row items-center gap-2 rounded-button border border-line-light bg-surface-light px-3 dark:border-line-dark dark:bg-surface-dark">
        <Search color={iconColors.muted} size={20} strokeWidth={1.5} />
        <TextInput className="min-h-12 flex-1 font-sans text-[15px] text-ink-light dark:text-ink-dark" value={search} onChangeText={setSearch} placeholder="재료 이름 검색" placeholderTextColor="#A8A29E" accessibilityLabel="재료 검색" />
      </View>
      <View className="flex-row flex-wrap gap-2">
        <Pressable onPress={() => setStorageId(null)} accessibilityRole="button" accessibilityState={{ selected: storageId === null }} accessibilityLabel="전체" className={`min-h-11 justify-center rounded-full border px-4 ${storageId === null ? 'border-primary-light bg-primary-light dark:border-primary-dark dark:bg-primary-dark' : 'border-line-light bg-surface-light dark:border-line-dark dark:bg-surface-dark'}`}>
          <Text className={`font-sans text-sm ${storageId === null ? 'text-white dark:text-app-dark' : 'text-muted-light dark:text-muted-dark'}`}>전체</Text>
        </Pressable>
        {locations.map((location) => (
          <Pressable key={location.id} onPress={() => setStorageId(location.id)} accessibilityRole="button" accessibilityState={{ selected: storageId === location.id }} accessibilityLabel={location.name} className={`min-h-11 justify-center rounded-full border px-4 ${storageId === location.id ? 'border-primary-light bg-primary-light dark:border-primary-dark dark:bg-primary-dark' : 'border-line-light bg-surface-light dark:border-line-dark dark:bg-surface-dark'}`}>
            <Text className={`font-sans text-sm ${storageId === location.id ? 'text-white dark:text-app-dark' : 'text-muted-light dark:text-muted-dark'}`}>{location.name}</Text>
          </Pressable>
        ))}
      </View>
      <StateView state={listState} emptyTitle="조건에 맞는 재료가 없어요" emptyBody="검색어나 저장 공간 필터를 바꾸거나 새 재료를 추가해보세요." errorMessage="재고를 불러오지 못했어요. 잠시 후 다시 시도해주세요." onRetry={inventoryQuery.refetch}>
        <View className="gap-3">{filtered.map((item) => <InventoryCard key={item.id} item={item} />)}</View>
      </StateView>
    </AppScreen>
  );
}

