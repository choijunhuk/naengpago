import { useState } from 'react';
import { router } from 'expo-router';
import { Alert, Pressable, Text, View } from 'react-native';

import { QuantityEditor } from '../../src/components/inventory/quantity-editor';
import { AppScreen } from '../../src/components/ui/app-screen';
import { Button } from '../../src/components/ui/button';
import { Card } from '../../src/components/ui/card';
import { TextField } from '../../src/components/ui/text-field';
import { useInventoryMutations } from '../../src/features/data/inventory';
import { useStorageLocations } from '../../src/features/data/storage';
import type { IngredientCategory, QuantityType, RemainingLevel } from '../../src/types/domain';

const quantityTypes: Array<{ value: QuantityType; label: string }> = [
  { value: 'COUNTABLE', label: '개수' }, { value: 'LEVEL', label: '잔여량' }, { value: 'MEASURABLE', label: 'g/ml' },
];

function isValidExpiration(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) return true;
  if (!/^\d{4}-\d{2}-\d{2}$/u.test(trimmed)) return false;
  const [year, month, day] = trimmed.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    !Number.isNaN(date.getTime()) &&
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

export default function AddInventoryScreen() {
  const locations = useStorageLocations().data ?? [];
  const { addInventory, isPending } = useInventoryMutations();
  const [name, setName] = useState('');
  const [quantityType, setQuantityType] = useState<QuantityType>('COUNTABLE');
  const [quantity, setQuantity] = useState(1);
  const [level, setLevel] = useState<RemainingLevel>('FULL');
  const [unit, setUnit] = useState('개');
  const [locationId, setLocationId] = useState<string | null>(null);
  const [expirationDate, setExpirationDate] = useState('');
  const [dateError, setDateError] = useState('');
  const activeLocationId = locationId ?? locations[0]?.id ?? null;
  const save = async () => {
    if (!isValidExpiration(expirationDate)) {
      setDateError('유통기한을 YYYY-MM-DD 형식의 올바른 날짜로 입력해주세요.');
      return;
    }
    setDateError('');
    if (!activeLocationId) {
      Alert.alert('저장 위치가 필요해요', '저장 공간을 먼저 준비해주세요.');
      return;
    }
    try {
      const id = await addInventory({
        displayName: name.trim(), category: 'OTHER' as IngredientCategory, quantityType,
        quantity: quantityType === 'LEVEL' ? null : quantity,
        unit: quantityType === 'LEVEL' ? null : unit.trim() || null,
        remainingLevel: quantityType === 'LEVEL' ? level : null,
        storageLocationId: activeLocationId, expirationDate: expirationDate.trim() || null,
      });
      router.replace(`/inventory/${id}`);
    } catch (cause) {
      Alert.alert('저장하지 못했어요', cause instanceof Error ? cause.message : '잠시 후 다시 시도해 주세요.');
    }
  };
  return (
    <AppScreen title="직접 재료 추가" subtitle="최근 자주 쓰는 단위와 위치를 기준으로 입력해요." testID="inventory-add-screen">
      <TextField label="재료 이름" value={name} onChangeText={setName} placeholder="예: 양파" autoFocus />
      <Card className="gap-4">
        <Text className="font-sans text-sm font-semibold text-ink-light dark:text-ink-dark">수량 방식</Text>
        <View className="flex-row gap-2">{quantityTypes.map((entry) => <Pressable key={entry.value} accessibilityRole="button" accessibilityState={{ selected: quantityType === entry.value }} accessibilityLabel={entry.label} className={`min-h-11 flex-1 items-center justify-center rounded-button border ${quantityType === entry.value ? 'border-primary-light bg-primary-light dark:border-primary-dark dark:bg-primary-dark' : 'border-line-light dark:border-line-dark'}`} onPress={() => setQuantityType(entry.value)}><Text className={`font-sans text-sm ${quantityType === entry.value ? 'font-semibold text-white dark:text-app-dark' : 'text-muted-light dark:text-muted-dark'}`}>{entry.label}</Text></Pressable>)}</View>
        {quantityType !== 'LEVEL' ? <TextField label="단위" value={unit} onChangeText={setUnit} placeholder={quantityType === 'MEASURABLE' ? 'g 또는 ml' : '개, 팩, 병'} /> : null}
        <QuantityEditor quantityType={quantityType} quantity={quantity} unit={quantityType === 'LEVEL' ? null : unit} remainingLevel={level} onQuantityChange={setQuantity} onLevelChange={setLevel} />
      </Card>
      <Card className="gap-3">
        <Text className="font-sans text-sm font-semibold text-ink-light dark:text-ink-dark">저장 위치</Text>
        <View className="flex-row flex-wrap gap-2">{locations.map((location) => <Pressable key={location.id} accessibilityRole="button" accessibilityState={{ selected: activeLocationId === location.id }} accessibilityLabel={location.name} className={`min-h-11 justify-center rounded-full border px-4 ${activeLocationId === location.id ? 'border-primary-light bg-primary-light dark:border-primary-dark dark:bg-primary-dark' : 'border-line-light dark:border-line-dark'}`} onPress={() => setLocationId(location.id)}><Text className={`font-sans text-sm ${activeLocationId === location.id ? 'text-white dark:text-app-dark' : 'text-muted-light dark:text-muted-dark'}`}>{location.name}</Text></Pressable>)}</View>
      </Card>
      <TextField label="유통기한" value={expirationDate} onChangeText={(value) => { setExpirationDate(value); if (dateError) setDateError(''); }} placeholder="YYYY-MM-DD (선택)" keyboardType="numbers-and-punctuation" hint="과거 날짜도 저장할 수 있지만 경고로 표시해요." error={dateError} />
      <Button label="재고에 저장" loading={isPending} disabled={!name.trim()} onPress={() => void save()} testID="inventory-save" />
      <Button label="취소" variant="ghost" onPress={() => router.back()} />
    </AppScreen>
  );
}

