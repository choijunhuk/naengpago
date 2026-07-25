import { useState } from 'react';
import { router } from 'expo-router';
import { Camera, ChefHat, CircleCheckBig } from 'lucide-react-native';
import { Text, View } from 'react-native';

import { AppScreen } from '../../src/components/ui/app-screen';
import { Button } from '../../src/components/ui/button';
import { useAppStore } from '../../src/stores/app-store';
import { useIconColors } from '../../src/theme/icon-colors';

const pages = [
  { title: '사진 한 장이면 충분해요', body: '냉장고나 장본 재료를 찍으면 AI가 등록 후보를 정리해요.', icon: Camera },
  { title: '확인은 언제나 내가 해요', body: '이름, 수량, 위치, 유통기한을 확인한 뒤에만 재고로 저장해요.', icon: CircleCheckBig },
  { title: '있는 재료부터 맛있게', body: '임박 재료를 먼저 쓰는 요리와 지금 가능한 메뉴를 골라드려요.', icon: ChefHat },
];

export default function OnboardingScreen() {
  const iconColors = useIconColors();
  const [index, setIndex] = useState(0);
  const finishOnboarding = useAppStore((state) => state.finishOnboarding);
  const page = pages[index] ?? pages[0];
  const Icon = page.icon;
  const finish = () => {
    finishOnboarding();
    router.replace('/(auth)/signup');
  };

  return (
    <AppScreen scroll={false} testID="onboarding-screen">
      <View className="min-h-full justify-between py-8">
        <View className="flex-row items-center justify-between">
          <Text className="font-sans text-lg font-bold text-primary-light dark:text-primary-dark">냉파고</Text>
          <Button label="건너뛰기" variant="ghost" fullWidth={false} onPress={finish} />
        </View>
        <View className="items-center gap-6 px-4">
          <View className="h-40 w-40 items-center justify-center rounded-full border border-line-light bg-surface-light dark:border-line-dark dark:bg-surface-dark">
            <Icon color={iconColors.primary} size={64} strokeWidth={1.5} />
          </View>
          <View className="gap-3">
            <Text className="text-center font-sans text-2xl font-bold leading-9 text-ink-light dark:text-ink-dark">{page.title}</Text>
            <Text className="text-center font-sans text-[15px] leading-6 text-muted-light dark:text-muted-dark">{page.body}</Text>
          </View>
          <View className="flex-row gap-2">
            {pages.map((_, dotIndex) => (
              <View key={dotIndex} className={`h-2 rounded-full ${dotIndex === index ? 'w-6 bg-primary-light dark:bg-primary-dark' : 'w-2 bg-line-light dark:bg-line-dark'}`} />
            ))}
          </View>
        </View>
        <Button
          label={index === pages.length - 1 ? '냉파고 시작하기' : '다음'}
          onPress={() => (index === pages.length - 1 ? finish() : setIndex((value) => value + 1))}
        />
      </View>
    </AppScreen>
  );
}

