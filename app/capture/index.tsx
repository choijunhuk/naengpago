import { useState } from 'react';
import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Camera, Images, ScanLine } from 'lucide-react-native';
import { Alert, Pressable, Text, View } from 'react-native';

import { AppScreen } from '../../src/components/ui/app-screen';
import { Button } from '../../src/components/ui/button';
import { Card } from '../../src/components/ui/card';
import { useAppStore } from '../../src/stores/app-store';
import { prepareIngredientImage } from '../../src/features/analysis/analysis-service';

export default function CaptureScreen() {
  const locations = useAppStore((state) => state.storageLocations);
  const resetDraft = useAppStore((state) => state.resetReviewDraft);
  const [locationId, setLocationId] = useState(locations[0]?.id ?? 'storage-fridge');
  const proceed = () => { resetDraft(locationId); router.push({ pathname: '/capture/analyzing', params: { storageLocationHint: locationId } }); };
  const pick = async (camera: boolean) => {
    const result = camera
      ? await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.8, allowsEditing: false })
      : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8, allowsEditing: false });
    if (result.canceled) return;
    const image = await prepareIngredientImage(result.assets[0]);
    resetDraft(locationId);
    router.push({ pathname: '/capture/analyzing', params: { imageUri: image.uri, width: String(image.width), height: String(image.height), storageLocationHint: locationId } });
  };
  return (
    <AppScreen title="사진으로 재료 등록" subtitle="재료가 겹치지 않고 밝게 보이면 더 잘 찾을 수 있어요." testID="capture-screen">
      <Card className="h-72 items-center justify-center gap-4 border-dashed border-primary-light dark:border-primary-dark">
        <View className="absolute inset-5 rounded-card border border-line-light dark:border-line-dark" />
        <ScanLine color="#16A34A" size={64} strokeWidth={1.5} />
        <Text className="text-center font-sans text-[15px] font-semibold leading-6 text-ink-light dark:text-ink-dark">냉장고 문을 열고{`\n`}선반 전체가 보이게 찍어주세요</Text>
      </Card>
      <View className="gap-2"><Text className="font-sans text-sm font-semibold text-ink-light dark:text-ink-dark">위치 힌트</Text><View className="flex-row flex-wrap gap-2">{locations.map((location) => <Pressable key={location.id} className={`min-h-11 justify-center rounded-full border px-4 ${locationId === location.id ? 'border-primary-light bg-primary-light dark:border-primary-dark dark:bg-primary-dark' : 'border-line-light dark:border-line-dark'}`} onPress={() => setLocationId(location.id)}><Text className={`font-sans text-sm ${locationId === location.id ? 'text-white dark:text-app-dark' : 'text-muted-light dark:text-muted-dark'}`}>{location.name}</Text></Pressable>)}</View></View>
      <Button label="카메라로 촬영" icon={<Camera color="#FFFFFF" size={20} strokeWidth={1.5} />} onPress={() => void pick(true).catch(() => Alert.alert('카메라를 열 수 없어요', '권한을 확인하거나 갤러리에서 선택해주세요.'))} />
      <Button label="갤러리에서 선택" variant="secondary" icon={<Images color="#78716C" size={20} strokeWidth={1.5} />} onPress={() => void pick(false)} />
      <Button label="데모 사진으로 체험" variant="ghost" onPress={proceed} testID="capture-demo" />
    </AppScreen>
  );
}
