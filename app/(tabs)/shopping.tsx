import { useState } from 'react';
import { Check, Plus, RotateCcw } from 'lucide-react-native';
import { Alert, Pressable, Text, View } from 'react-native';

import { AppScreen } from '../../src/components/ui/app-screen';
import { Badge } from '../../src/components/ui/badge';
import { Button } from '../../src/components/ui/button';
import { Card } from '../../src/components/ui/card';
import { StateView } from '../../src/components/ui/state-view';
import { TextField } from '../../src/components/ui/text-field';
import { useAppStore } from '../../src/stores/app-store';

export default function ShoppingScreen() {
  const [name, setName] = useState('');
  const items = useAppStore((state) => state.shoppingItems);
  const addShoppingItem = useAppStore((state) => state.addShoppingItem);
  const togglePurchased = useAppStore((state) => state.toggleShoppingPurchased);
  const moveToInventory = useAppStore((state) => state.moveShoppingToInventory);
  const add = () => {
    if (!name.trim()) return;
    addShoppingItem({ masterId: null, name: name.trim(), quantity: 1, unit: '개', category: 'OTHER', source: 'MANUAL', sourceRecipeId: null, sourceLabel: null });
    setName('');
  };

  return (
    <AppScreen title="장보기 목록" subtitle="가족과 함께 확인하고, 산 재료는 바로 재고로 옮겨요." testID="shopping-screen">
      <Card className="gap-3">
        <TextField label="직접 추가" value={name} onChangeText={setName} placeholder="예: 양파" onSubmitEditing={add} />
        <Button label="목록에 추가" icon={<Plus color="#FFFFFF" size={20} strokeWidth={1.5} />} disabled={!name.trim()} onPress={add} />
      </Card>
      <StateView state={items.length ? 'ready' : 'empty'} emptyTitle="장보기 목록이 비었어요" emptyBody="추천 레시피의 부족 재료나 필요한 물건을 추가해보세요.">
        <View className="gap-3">
          {items.map((item) => (
            <Card key={item.id} className="gap-3">
              <View className="flex-row items-center gap-3">
                <Pressable className={`h-11 w-11 items-center justify-center rounded-full border ${item.status === 'PURCHASED' ? 'border-primary-light bg-primary-light dark:border-primary-dark dark:bg-primary-dark' : 'border-line-light dark:border-line-dark'}`} onPress={() => togglePurchased(item.id)} accessibilityLabel={`${item.name} 구매 ${item.status === 'PURCHASED' ? '취소' : '완료'}`}>
                  {item.status === 'PURCHASED' ? <Check color="#FFFFFF" size={20} strokeWidth={1.5} /> : null}
                </Pressable>
                <View className="flex-1 gap-1">
                  <Text className={`font-sans text-[15px] font-semibold text-ink-light dark:text-ink-dark ${item.status === 'PURCHASED' ? 'line-through' : ''}`}>{item.name}</Text>
                  <Text className="font-sans text-xs text-muted-light dark:text-muted-dark">{item.quantity ?? 1}{item.unit ? ` ${item.unit}` : ''}</Text>
                </View>
                {item.sourceLabel ? <Badge label={item.sourceLabel} /> : null}
              </View>
              {item.status === 'PURCHASED' && !item.movedToInventory ? (
                <Button label="냉장실 재고로 이동" variant="secondary" onPress={() => {
                  moveToInventory(item.id, 'storage-fridge');
                  Alert.alert('재고로 옮겼어요', `${item.name}을 냉장실에 추가했어요.`);
                }} />
              ) : null}
              {item.movedToInventory ? <Badge label="재고 이동 완료" tone="success" /> : null}
              {item.status === 'PURCHASED' && !item.movedToInventory ? <RotateCcw color="#78716C" size={20} strokeWidth={1.5} /> : null}
            </Card>
          ))}
        </View>
      </StateView>
    </AppScreen>
  );
}

