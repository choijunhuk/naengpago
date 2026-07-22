import { useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { useKeepAwake } from 'expo-keep-awake';
import { ChevronLeft, ChevronRight, Timer } from 'lucide-react-native';
import { Text, View } from 'react-native';

import { AppScreen } from '../../../src/components/ui/app-screen';
import { Badge } from '../../../src/components/ui/badge';
import { Button } from '../../../src/components/ui/button';
import { Card } from '../../../src/components/ui/card';
import { mockRecipes } from '../../../src/domain/mock-data';

export default function CookScreen() {
  useKeepAwake();
  const { id } = useLocalSearchParams<{ id: string }>();
  const recipe = mockRecipes.find((entry) => entry.id === id);
  const [step, setStep] = useState(0);
  if (!recipe) return null;
  const isLast = step === recipe.steps.length - 1;
  return (
    <AppScreen scroll={false} testID="cook-screen">
      <View className="min-h-full justify-between gap-6 py-5">
        <View className="flex-row items-center justify-between"><Badge label={`${step + 1} / ${recipe.steps.length}`} tone="success" /><Text className="font-sans text-sm font-semibold text-muted-light dark:text-muted-dark">{recipe.name}</Text><Timer color="#78716C" size={20} strokeWidth={1.5} /></View>
        <Card className="min-h-80 justify-center gap-6 border-primary-light p-6 dark:border-primary-dark"><Text className="font-sans text-xs font-semibold text-primary-light dark:text-primary-dark">STEP {step + 1}</Text><Text className="font-sans text-2xl font-bold leading-10 text-ink-light dark:text-ink-dark">{recipe.steps[step]}</Text><Text className="font-sans text-sm leading-5 text-muted-light dark:text-muted-dark">화면은 조리하는 동안 꺼지지 않아요.</Text></Card>
        <View className="gap-3"><View className="flex-row gap-2"><Button label="이전" variant="secondary" icon={<ChevronLeft color="#78716C" size={20} />} disabled={step === 0} onPress={() => setStep((value) => Math.max(0, value - 1))} /><Button label={isLast ? '요리 완료' : '다음'} icon={isLast ? undefined : <ChevronRight color="#FFFFFF" size={20} />} onPress={() => isLast ? router.replace(`/recipes/complete/${recipe.id}`) : setStep((value) => value + 1)} testID={isLast ? 'cook-complete' : undefined} /></View><Button label="나중에 이어하기" variant="ghost" onPress={() => router.back()} /></View>
      </View>
    </AppScreen>
  );
}

