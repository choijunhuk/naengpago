import { useState } from 'react';
import { router } from 'expo-router';
import { Archive, Snowflake } from 'lucide-react-native';
import { Pressable, Text, View } from 'react-native';

import { AppScreen } from '../../src/components/ui/app-screen';
import { Button } from '../../src/components/ui/button';
import { Card } from '../../src/components/ui/card';
import { TextField } from '../../src/components/ui/text-field';
import { useAppStore } from '../../src/stores/app-store';

export default function StorageScreen() {
  const [name, setName] = useState('');
  const locations = useAppStore((state) => state.storageLocations);
  const inventory = useAppStore((state) => state.inventory);
  const addLocation = useAppStore((state) => state.addStorageLocation);
  return (
    <AppScreen title="저장 공간" subtitle="공간을 나눌수록 사진 등록 위치를 빠르게 고를 수 있어요.">
      <View className="gap-3">{locations.map((location) => { const Icon = location.type === 'PANTRY' || location.type === 'CUSTOM' ? Archive : Snowflake; return <Pressable key={location.id} onPress={() => router.push({ pathname: '/(tabs)/inventory', params: { storage: location.id } })}><Card className="flex-row items-center gap-3"><View className="h-11 w-11 items-center justify-center rounded-button bg-app-light dark:bg-app-dark"><Icon color="#16A34A" size={20} strokeWidth={1.5} /></View><View className="flex-1"><Text className="font-sans text-[15px] font-semibold text-ink-light dark:text-ink-dark">{location.name}</Text><Text className="font-sans text-xs text-muted-light dark:text-muted-dark">재료 {inventory.filter((item) => item.storageLocationId === location.id).length}개</Text></View></Card></Pressable>; })}</View>
      <Card className="gap-3"><TextField label="커스텀 공간 추가" value={name} onChangeText={setName} placeholder="예: 베란다 수납장" /><Button label="공간 추가" disabled={!name.trim()} onPress={() => { addLocation(name.trim()); setName(''); }} /></Card>
      <Button label="돌아가기" variant="ghost" onPress={() => router.back()} />
    </AppScreen>
  );
}

