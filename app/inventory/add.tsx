import { useState } from 'react';
import { router } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

import { QuantityEditor } from '../../src/components/inventory/quantity-editor';
import { AppScreen } from '../../src/components/ui/app-screen';
import { Button } from '../../src/components/ui/button';
import { Card } from '../../src/components/ui/card';
import { TextField } from '../../src/components/ui/text-field';
import type { IngredientCategory, QuantityType, RemainingLevel } from '../../src/types/domain';
import { useAppStore } from '../../src/stores/app-store';

const quantityTypes: Array<{ value: QuantityType; label: string }> = [
  { value: 'COUNTABLE', label: '개수' }, { value: 'LEVEL', label: '잔여량' }, { value: 'MEASURABLE', label: 'g/ml' },
];

export default function AddInventoryScreen() {
  const locations = useAppStore((state) => state.storageLocations);
  const addInventory = useAppStore((state) => state.addInventory);
  const [name, setName] = useState('');
  const [quantityType, setQuantityType] = useState<QuantityType>('COUNTABLE');
  const [quantity, setQuantity] = useState(1);
  const [level, setLevel] = useState<RemainingLevel>('FULL');
  const [unit, setUnit] = useState('개');
  const [locationId, setLocationId] = useState(locations[0]?.id ?? 'storage-fridge');
  const [expirationDate, setExpirationDate] = useState('');
  const save = () => {
    const id = addInventory({
      displayName: name.trim(), category: 'OTHER' as IngredientCategory, quantityType,
      quantity: quantityType === 'LEVEL' ? null : quantity,
      unit: quantityType === 'LEVEL' ? null : unit.trim() || null,
      remainingLevel: quantityType === 'LEVEL' ? level : null,
      storageLocationId: locationId, expirationDate: expirationDate.trim() || null,
    });
    router.replace(`/inventory/${id}`);
  };
  return (
    <AppScreen title="직접 재료 추가" subtitle="최근 자주 쓰는 단위와 위치를 기준으로 입력해요." testID="inventory-add-screen">
      <TextField label="재료 이름" value={name} onChangeText={setName} placeholder="예: 양파" autoFocus />
      <Card className="gap-4">
        <Text className="font-sans text-sm font-semibold text-ink-light dark:text-ink-dark">수량 방식</Text>
        <View className="flex-row gap-2">{quantityTypes.map((entry) => <Pressable key={entry.value} className={`min-h-11 flex-1 items-center justify-center rounded-button border ${quantityType === entry.value ? 'border-primary-light bg-primary-light dark:border-primary-dark dark:bg-primary-dark' : 'border-line-light dark:border-line-dark'}`} onPress={() => setQuantityType(entry.value)}><Text className={`font-sans text-sm ${quantityType === entry.value ? 'font-semibold text-white dark:text-app-dark' : 'text-muted-light dark:text-muted-dark'}`}>{entry.label}</Text></Pressable>)}</View>
        {quantityType !== 'LEVEL' ? <TextField label="단위" value={unit} onChangeText={setUnit} placeholder={quantityType === 'MEASURABLE' ? 'g 또는 ml' : '개, 팩, 병'} /> : null}
        <QuantityEditor quantityType={quantityType} quantity={quantity} unit={quantityType === 'LEVEL' ? null : unit} remainingLevel={level} onQuantityChange={setQuantity} onLevelChange={setLevel} />
      </Card>
      <Card className="gap-3">
        <Text className="font-sans text-sm font-semibold text-ink-light dark:text-ink-dark">저장 위치</Text>
        <View className="flex-row flex-wrap gap-2">{locations.map((location) => <Pressable key={location.id} className={`min-h-11 justify-center rounded-full border px-4 ${locationId === location.id ? 'border-primary-light bg-primary-light dark:border-primary-dark dark:bg-primary-dark' : 'border-line-light dark:border-line-dark'}`} onPress={() => setLocationId(location.id)}><Text className={`font-sans text-sm ${locationId === location.id ? 'text-white dark:text-app-dark' : 'text-muted-light dark:text-muted-dark'}`}>{location.name}</Text></Pressable>)}</View>
      </Card>
      <TextField label="유통기한" value={expirationDate} onChangeText={setExpirationDate} placeholder="YYYY-MM-DD (선택)" keyboardType="numbers-and-punctuation" hint="과거 날짜도 저장할 수 있지만 경고로 표시해요." />
      <Button label="재고에 저장" disabled={!name.trim()} onPress={save} testID="inventory-save" />
      <Button label="취소" variant="ghost" onPress={() => router.back()} />
    </AppScreen>
  );
}

